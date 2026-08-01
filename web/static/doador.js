/* O Alvo é Cristo — página do doador */
(() => {
  const $ = (s) => document.querySelector(s);
  const RING_LEN = 609.5; // 2*pi*97

  let itens = [];               // último snapshot
  let prevDoado = {};           // id -> doado (para detectar aumento)
  let activeCat = "__all__";
  let term = "";
  const openCats = new Set();   // nomes de categoria abertos
  let firstRender = true;
  let modalCtx = null;          // {id, nome, unidade} ou 'free'

  // ---------- config ----------
  fetch("/api/config").then(r => r.json()).then(cfg => {
    document.title = `${cfg.event_name} · Doações`;
    if (cfg.event_verse) $("#verse").textContent = cfg.event_verse;
    if (cfg.event_verse_ref) $("#verseRef").textContent = cfg.event_verse_ref;
    if (cfg.event_subtitle) $("#brandName").textContent = cfg.event_subtitle;
    const pix = cfg.pix || {};
    if (pix.enabled) {
      $("#pixbox").style.display = "flex";
      $("#pixKey").textContent = pix.key || "";
      $("#pixNote").textContent = pix.note || "Faça um PIX para a igreja.";
      $("#pixQr").src = "/api/pix-qr.svg";
      $("#pixCopy").onclick = () => {
        navigator.clipboard?.writeText(pix.copia_cola || pix.key || "").then(() => {
          const b = $("#pixCopy"); b.textContent = "Copiado ✓"; b.classList.add("done");
          setTimeout(() => { b.textContent = "Copiar chave"; b.classList.remove("done"); }, 1800);
        });
      };
    }
  });

  // ---------- websocket ----------
  let ws, pingTimer, reconnectTimer;
  function connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => {
      setLive(true);
      clearInterval(pingTimer);
      pingTimer = setInterval(() => { try { ws.send("ping"); } catch (e) {} }, 25000);
    };
    ws.onmessage = (ev) => {
      try { const d = JSON.parse(ev.data); if (d.type === "progress") applyProgress(d); } catch (e) {}
    };
    ws.onclose = () => { setLive(false); clearInterval(pingTimer); scheduleReconnect(); };
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  }
  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 2500);
  }
  function setLive(on) { $("#livedot").classList.toggle("off", !on); }
  connect();
  // fallback inicial caso o WS demore
  fetch("/api/progress").then(r => r.json()).then(applyProgress).catch(() => {});

  // ---------- progresso ----------
  function applyProgress(d) {
    const st = d.stats || {};
    itens = d.itens || [];
    // alvo
    const pct = st.cobertura_pct || 0;
    $("#heroPct").textContent = Math.round(pct) + "%";
    $("#progRing").style.strokeDashoffset = RING_LEN * (1 - Math.min(pct, 100) / 100);
    $("#progRing").style.transition = "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)";
    $("#arrow").style.transition = "opacity .6s ease";
    $("#arrow").style.opacity = pct > 0 ? "1" : "0";
    if (pct >= 100) $("#progRing").setAttribute("stroke", "#f0ac2e");
    else $("#progRing").setAttribute("stroke", "#e23b45");
    // subtítulo
    const faltam = (st.itens_total || 0) - (st.itens_completos || 0);
    if (faltam === 0 && st.itens_total > 0) {
      $("#heroSub").innerHTML = "🎉 <b>Lista completa!</b> Que Deus abençoe cada um.";
    } else {
      $("#heroSub").innerHTML = `<b>${st.itens_completos || 0}</b> de <b>${st.itens_total || 0}</b> itens no alvo · faltam <b>${faltam}</b>`;
    }
    buildChips();
    render();
    // guarda para o próximo diff
    prevDoado = {};
    itens.forEach(i => prevDoado[i.id] = i.doado);
    firstRender = false;
  }

  // ---------- chips de categoria ----------
  function buildChips() {
    const cats = [];
    itens.forEach(i => { if (!cats.includes(i.categoria)) cats.push(i.categoria); });
    const box = $("#chips");
    box.innerHTML = "";
    const mk = (label, val) => {
      const b = document.createElement("button");
      b.className = "chip" + (activeCat === val ? " on" : "");
      b.textContent = label;
      b.onclick = () => { activeCat = val; buildChips(); render(); };
      box.appendChild(b);
    };
    mk("Tudo", "__all__");
    cats.forEach(c => mk(c, c));
  }

  // ---------- render lista ----------
  function render() {
    const list = $("#list");
    const q = term.trim().toLowerCase();
    // filtra
    let vis = itens.filter(i =>
      (activeCat === "__all__" || i.categoria === activeCat) &&
      (!q || i.nome.toLowerCase().includes(q))
    );
    // agrupa por categoria preservando ordem
    const groups = [];
    const idx = {};
    vis.forEach(i => {
      if (!(i.categoria in idx)) { idx[i.categoria] = groups.length; groups.push({ nome: i.categoria, itens: [] }); }
      groups[idx[i.categoria]].itens.push(i);
    });

    if (!groups.length) {
      list.innerHTML = `<p class="empty">Nenhum item encontrado${q ? ` para “${term}”` : ""}.</p>`;
      return;
    }

    list.innerHTML = "";
    groups.forEach((g, gi) => {
      const done = g.itens.filter(i => i.completo).length;
      const pctCat = Math.round(done / g.itens.length * 100);
      // abre: primeira categoria por padrão, ou se está buscando/filtrando, ou se usuário abriu
      const isOpen = openCats.has(g.nome) || q || activeCat !== "__all__" || (firstRender && gi === 0);
      if (isOpen) openCats.add(g.nome);

      const cat = document.createElement("div");
      cat.className = "cat" + (isOpen ? " open" : "");
      cat.innerHTML = `
        <button class="cat-head">
          <span class="pin"></span>
          <span class="cname">${esc(g.nome)}</span>
          <span class="cmeta">${done}/${g.itens.length}</span>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6"/></svg>
        </button>
        <div class="cat-mini"><i style="width:${pctCat}%"></i></div>
        <div class="cat-body"></div>`;
      const body = cat.querySelector(".cat-body");
      g.itens.forEach(i => body.appendChild(itemRow(i)));
      cat.querySelector(".cat-head").onclick = () => {
        const nowOpen = !cat.classList.contains("open");
        cat.classList.toggle("open", nowOpen);
        if (nowOpen) openCats.add(g.nome); else openCats.delete(g.nome);
      };
      list.appendChild(cat);
    });
  }

  function itemRow(i) {
    const el = document.createElement("button");
    el.className = "item" + (i.completo ? " done" : "");
    const falta = Math.max(0, i.meta - i.doado);
    const faltaTxt = i.completo
      ? `Completo! ${fmt(i.doado)} ${esc(i.unidade)}`
      : `Faltam <b>${fmt(falta)} ${esc(i.unidade)}</b> de ${fmt(i.meta)} ${esc(i.unidade)}`;
    el.innerHTML = `
      <span class="tick">${i.completo ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg>' : ""}</span>
      <span class="mid">
        <span class="iname">${esc(i.nome)}${i.completo ? '<span class="bull">🎯</span>' : ""}</span>
        <span class="bar"><i style="width:${Math.min(i.percentual, 100)}%"></i></span>
        <span class="falta">${faltaTxt}</span>
      </span>
      <span class="plus">${i.completo ? "Doar +" : "Vou doar"}</span>`;
    el.onclick = () => openModal(i);
    // pulso se aumentou desde o último snapshot
    if (!firstRender && prevDoado[i.id] !== undefined && i.doado > prevDoado[i.id]) {
      requestAnimationFrame(() => { el.classList.add("pulsed"); setTimeout(() => el.classList.remove("pulsed"), 550); });
    }
    return el;
  }

  // ---------- busca ----------
  let searchT;
  $("#search").addEventListener("input", (e) => {
    clearTimeout(searchT);
    searchT = setTimeout(() => { term = e.target.value; render(); }, 120);
  });

  // ---------- modal ----------
  function openModal(item) {
    if (item) {
      modalCtx = { id: item.id, nome: item.nome, unidade: item.unidade };
      $("#mTitle").textContent = "Vou doar";
      $("#mFor").innerHTML = `Item: <b>${esc(item.nome)}</b>`;
      $("#freeWrap").style.display = "none";
      $("#mUnit").value = item.unidade || "";
    } else {
      modalCtx = "free";
      $("#mTitle").textContent = "Doar um item fora da lista";
      $("#mFor").textContent = "Descreva o que você vai levar.";
      $("#freeWrap").style.display = "";
      $("#mFree").value = "";
      $("#mUnit").value = "";
    }
    $("#mQty").value = "";
    $("#mWebsite").value = "";
    $("#overlay").classList.add("on");
    setTimeout(() => (item ? $("#mName") : $("#mFree")).focus(), 60);
  }
  function closeModal() { $("#overlay").classList.remove("on"); }
  $("#mCancel").onclick = closeModal;
  $("#freeBtn").onclick = () => openModal(null);
  $("#overlay").addEventListener("click", (e) => { if (e.target.id === "overlay") closeModal(); });

  $("#mSend").onclick = async () => {
    const nome = $("#mName").value.trim();
    const qty = parseFloat($("#mQty").value);
    if (nome.length < 2) return toast("Escreva seu nome 🙂", true);
    if (!qty || qty <= 0) return toast("Informe a quantidade", true);
    const payload = {
      doador_nome: nome,
      grupo: $("#mGroup").value.trim() || null,
      quantidade: qty,
      unidade: $("#mUnit").value.trim(),
      contato: $("#mContact").value.trim() || null,
      observacao: $("#mObs").value.trim() || null,
      website: $("#mWebsite").value || null,
    };
    if (modalCtx === "free") {
      const f = $("#mFree").value.trim();
      if (!f) return toast("Diga o que vai doar", true);
      payload.item_livre = f;
    } else {
      payload.item_id = modalCtx.id;
    }
    const btn = $("#mSend"); btn.disabled = true; btn.textContent = "Enviando…";
    try {
      const r = await fetch("/api/donations", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.detail || "Não deu para registrar");
      }
      closeModal();
      toast("Doação registrada! 🎯 Obrigado!");
    } catch (err) {
      toast(err.message, true);
    } finally {
      btn.disabled = false; btn.innerHTML = "🎯 Confirmar doação";
    }
  };

  // ---------- toast ----------
  let toastT;
  function toast(msg, isErr) {
    const t = $("#toast");
    t.querySelector(".msg").textContent = msg;
    t.querySelector(".em").textContent = isErr ? "⚠️" : "✅";
    t.classList.toggle("err", !!isErr);
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 3200);
  }

  // ---------- util ----------
  function esc(s) { return (s ?? "").toString().replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function fmt(n) { return Number.isInteger(n) ? n : (Math.round(n * 100) / 100); }
})();
