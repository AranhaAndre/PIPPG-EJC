/* Coordenação — O Alvo é Cristo */
(() => {
  const $ = (s) => document.querySelector(s);
  let statsCache = null;
  let itemFilter = "all";
  let donFilter = "";

  // ---------- guarda de sessão ----------
  fetch("/api/me").then(r => { if (!r.ok) location.href = "/login"; else init(); })
    .catch(() => location.href = "/login");

  function init() {
    connect();
    loadStats();
    loadDonations();
    $("#logout").onclick = async () => { await fetch("/api/logout", { method: "POST" }); location.href = "/login"; };
    $("#itemFilters").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      itemFilter = b.dataset.f; setOn("#itemFilters", b); renderItems();
    });
    $("#donFilters").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      donFilter = b.dataset.s; setOn("#donFilters", b); loadDonations();
    });
    $("#aiAdd").onclick = addItem;
    $("#acAdd").onclick = addCategory;
    $("#rsBtn").onclick = resetItem;
    $("#delBtn").onclick = deleteItem;
  }
  function setOn(sel, btn) { document.querySelectorAll(sel + " button").forEach(x => x.classList.remove("on")); btn.classList.add("on"); }

  // ---------- websocket ----------
  let ws, pingTimer, reconnectTimer;
  function connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => { setLive(true); clearInterval(pingTimer); pingTimer = setInterval(() => { try { ws.send("p"); } catch (e) {} }, 25000); };
    ws.onmessage = (ev) => { try { const d = JSON.parse(ev.data); if (d.type === "progress") { loadStats(); loadDonations(); } } catch (e) {} };
    ws.onclose = () => { setLive(false); clearInterval(pingTimer); clearTimeout(reconnectTimer); reconnectTimer = setTimeout(connect, 2500); };
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  }
  function setLive(on) { $("#livedot").classList.toggle("off", !on); }

  // ---------- stats ----------
  async function loadStats() {
    const st = await (await fetch("/api/admin/stats")).json();
    statsCache = st;
    // KPIs
    $("#kpis").innerHTML = `
      ${kpi(st.cobertura_pct + "%", "Cobertura", true)}
      ${kpi(st.itens_completos + "/" + st.itens_total, "Itens completos")}
      ${kpi(st.doacoes_total, "Doações")}
      ${kpi(st.doadores_unicos, "Pessoas")}`;
    // catbars
    $("#catbars").innerHTML = (st.por_categoria || []).map(c => {
      const pct = c.total ? Math.round(c.completos / c.total * 100) : 0;
      return `<div class="catbar"><div class="top"><span>${esc(c.categoria)}</span><span>${c.completos}/${c.total}</span></div>
        <div class="track"><i style="width:${pct}%"></i></div></div>`;
    }).join("");
    renderItems();
    renderRank();
    fillSelects();
  }
  function kpi(v, k, hl) { return `<div class="kpi${hl ? " hl" : ""}"><div class="v">${v}</div><div class="k">${k}</div></div>`; }

  function renderItems() {
    if (!statsCache) return;
    let its = statsCache.itens || [];
    if (itemFilter === "pend") its = its.filter(i => !i.completo);
    else if (itemFilter === "done") its = its.filter(i => i.completo);
    if (!its.length) { $("#itemsBody").innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Nada por aqui.</td></tr>`; return; }
    $("#itemsBody").innerHTML = its.map(i => {
      const falta = Math.max(0, i.meta - i.doado);
      const badge = i.completo ? `<span class="badge completo">Completo</span>` : `<span class="badge faltando">Faltando</span>`;
      const doadores = i.doadores.length ? esc(i.doadores.join(", ")) : `<span class="muted">—</span>`;
      return `<tr>
        <td class="muted">${esc(i.categoria)}</td>
        <td><b>${esc(i.nome)}</b></td>
        <td class="num">${fmt(i.meta)} ${esc(i.unidade)}</td>
        <td class="num">${i.completo ? "0" : "<b style='color:var(--alvo)'>" + fmt(falta) + "</b>"} ${esc(i.unidade)}</td>
        <td>${badge}</td>
        <td>${doadores}</td>
      </tr>`;
    }).join("");
  }

  function renderRank() {
    const r = statsCache.ranking || [];
    $("#rank").innerHTML = r.length ? r.map((x, i) =>
      `<li><span class="pos">${i + 1}º</span><span class="nm">${esc(x.nome)}</span><span class="ct">${x.doacoes} ${x.doacoes > 1 ? "doações" : "doação"}</span></li>`
    ).join("") : `<li class="muted">Ninguém teve a doação confirmada como recebida ainda.</li>`;
  }

  // ---------- doações ----------
  async function loadDonations() {
    const url = "/api/admin/donations" + (donFilter ? `?status=${donFilter}` : "");
    const rows = await (await fetch(url)).json();
    if (!rows.length) { $("#donBody").innerHTML = `<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Nenhuma doação.</td></tr>`; return; }
    $("#donBody").innerHTML = rows.map(d => {
      const acts = [];
      if (d.status !== "recebido") acts.push(`<button class="rowbtn ok" data-act="recebido" data-id="${d.id}">✓ Recebido</button>`);
      if (d.status !== "cancelado") acts.push(`<button class="rowbtn no" data-act="cancelado" data-id="${d.id}">Cancelar</button>`);
      if (d.status === "cancelado") acts.push(`<button class="rowbtn" data-act="prometido" data-id="${d.id}">Reativar</button>`);
      acts.push(`<button class="rowbtn no" data-act="del" data-id="${d.id}">Excluir</button>`);
      return `<tr>
        <td>${esc(d.item_nome || "—")}</td>
        <td><b>${esc(d.doador_nome)}</b></td>
        <td class="muted">${esc(d.grupo || "—")}</td>
        <td class="num">${fmt(d.quantidade)} ${esc(d.unidade)}</td>
        <td><span class="badge ${d.status}">${d.status}</span></td>
        <td style="white-space:nowrap">${acts.join("")}</td>
      </tr>`;
    }).join("");
    $("#donBody").querySelectorAll("button[data-act]").forEach(b => b.onclick = () => donAction(b.dataset.id, b.dataset.act));
  }

  async function donAction(id, act) {
    if (act === "del") {
      if (!confirm("Excluir esta doação?")) return;
      await fetch(`/api/admin/donations/${id}`, { method: "DELETE" });
      toast("Doação excluída");
    } else {
      await fetch(`/api/admin/donations/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: act }),
      });
      toast(act === "recebido" ? "Marcado como recebido ✓" : act === "cancelado" ? "Doação cancelada" : "Reativada");
    }
    loadStats(); loadDonations();
  }

  // ---------- selects de gestão ----------
  async function fillSelects() {
    const cats = await (await fetch("/api/admin/categories")).json();
    $("#aiCat").innerHTML = cats.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join("")
      || `<option value="">(crie uma categoria)</option>`;
    // lista de categorias com botão excluir
    $("#catList").innerHTML = cats.map(c =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid var(--line);font-size:.85rem">
        <span>${esc(c.nome)} <span class="muted">(${c.itens} ${c.itens === 1 ? "item" : "itens"})</span></span>
        <button class="rowbtn no" data-delcat="${c.id}">excluir</button></div>`
    ).join("");
    $("#catList").querySelectorAll("button[data-delcat]").forEach(b => b.onclick = () => deleteCategory(b.dataset.delcat));
    // selects de item (reset / excluir)
    const its = (statsCache?.itens || []);
    const opts = `<option value="">Selecione…</option>` + its.map(i => `<option value="${i.id}">${esc(i.categoria)} · ${esc(i.nome)}</option>`).join("");
    $("#rsItem").innerHTML = opts;
    $("#delItem").innerHTML = opts;
  }

  async function addItem() {
    const nome = $("#aiName").value.trim();
    const meta = parseFloat($("#aiMeta").value);
    if (!nome) return toast("Dê um nome ao item", true);
    if (!meta || meta <= 0) return toast("Informe a meta", true);
    const body = { nome, meta, unidade: $("#aiUnit").value.trim() };
    const catNew = $("#aiCatNew").value.trim();
    if (catNew) body.categoria_nova = catNew;
    else if ($("#aiCat").value) body.category_id = parseInt($("#aiCat").value);
    const r = await fetch("/api/admin/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) return toast("Não deu para adicionar", true);
    $("#aiName").value = ""; $("#aiMeta").value = ""; $("#aiUnit").value = ""; $("#aiCatNew").value = "";
    toast("Item adicionado à lista ✓");
    loadStats();
  }

  async function addCategory() {
    const nome = $("#acName").value.trim();
    if (!nome) return toast("Dê um nome à categoria", true);
    const r = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome }) });
    if (!r.ok) return toast("Não deu para criar", true);
    $("#acName").value = "";
    toast("Categoria criada ✓");
    loadStats();
  }

  async function deleteCategory(id) {
    if (!confirm("Excluir esta categoria? Os itens dela ficam sem categoria.")) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    toast("Categoria excluída");
    loadStats();
  }

  async function resetItem() {
    const id = $("#rsItem").value;
    if (!id) return toast("Escolha um item", true);
    const nome = $("#rsItem").selectedOptions[0].textContent;
    if (!confirm(`Resetar TODAS as doações de “${nome}”? Isso não pode ser desfeito.`)) return;
    const r = await (await fetch(`/api/admin/items/${id}/reset`, { method: "POST" })).json();
    toast(`Item resetado (${r.removidas || 0} doações removidas)`);
    loadStats(); loadDonations();
  }

  async function deleteItem() {
    const id = $("#delItem").value;
    if (!id) return toast("Escolha um item", true);
    const nome = $("#delItem").selectedOptions[0].textContent;
    if (!confirm(`Excluir “${nome}” da lista por completo? Isso não pode ser desfeito.`)) return;
    await fetch(`/api/admin/items/${id}`, { method: "DELETE" });
    toast("Item excluído da lista");
    loadStats(); loadDonations();
  }

  // ---------- toast / util ----------
  let toastT;
  function toast(msg, isErr) {
    const t = $("#toast");
    t.querySelector(".msg").textContent = msg;
    t.querySelector(".em").textContent = isErr ? "⚠️" : "✅";
    t.classList.toggle("err", !!isErr);
    t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3000);
  }
  function esc(s) { return (s ?? "").toString().replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function fmt(n) { return Number.isInteger(n) ? n : (Math.round(n * 100) / 100); }
})();
