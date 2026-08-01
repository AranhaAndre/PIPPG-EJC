# O Alvo é Cristo · Doações

Sistema web para a **Mocidade Presbiteriana de Ponta Grossa** organizar as doações
de alimentos de um evento. Os jovens abrem um link (roda bem no celular / WhatsApp),
escolhem um item e registram o que vão levar; a lista se completa **em tempo real**
na tela de todos. A coordenação acompanha tudo e gerencia a lista por um painel próprio.

Tema visual: **o alvo** (Filipenses 3.14 — *"prossigo para o alvo"*). Um alvo
concêntrico no topo mostra o quanto já foi conquistado.

> Projeto **independente**. Não usa nada da infraestrutura, contas ou marca da Skyhawk —
> feito para rodar numa hospedagem separada, como explicado mais abaixo.

---

## O que ele faz

**Página do doador (`/`)**
- Alvo com a cobertura geral + versículo do evento.
- Itens agrupados por categoria (accordion), cada um com barra de progresso e quanto falta.
- Busca e filtro por categoria.
- Botão **Vou doar** → nome, grupo/família (opcional), quantidade, contato.
- Também aceita doação de item **fora da lista**.
- Seção de **PIX** com QR + copia-e-cola (some se não configurar chave).

**Painel da coordenação (`/admin`, com login)**
- Resumo (cobertura, itens completos, doações, pessoas) e cobertura por categoria.
- **Acompanhamento ao vivo** por item (filtro Todos / Faltando / Completos).
- **Doações registradas**: marcar recebido, cancelar, reativar, excluir.
- **Gerenciar a lista**: adicionar item, resetar doações de um item, excluir item,
  criar/excluir categoria — tudo pela tela, sem mexer em código.
- Exportar **Excel** e **PDF**.

**Por baixo**: FastAPI + SQLAlchemy async + SQLite, WebSocket para o tempo real,
autenticação por cookie assinado (JWT), QR PIX gerado localmente (padrão BR Code do
Bacen, sem depender de internet). Tudo em Docker.

---

## Rodar local (teste)

```bash
cp .env.example .env      # edite ao menos ADMIN_PASSWORD, SECRET_KEY e o PIX
# para teste local sem HTTPS, deixe COOKIE_SECURE=false no .env
docker compose up --build
```

Abra `http://localhost:8090` (doador) e `http://localhost:8090/admin` (coordenação).
A porta do host é ajustável no `docker-compose.yml`.

---

## Hospedar online (fora da Skyhawk)

O ponto de atenção deste app é que os dados (as doações) **não podem sumir** e o uso é
concentrado nos dias que antecedem o evento. Por isso, ao escolher onde hospedar, fuja de:

- Plataformas cujo plano grátis **hiberna** o serviço depois de alguns minutos sem acesso
  (ex.: o free do Render dorme após 15 min → o primeiro jovem que abrir o link espera
  30–60s numa tela em branco); e
- Plataformas com disco **efêmero**, onde um reinício do contêiner apaga o SQLite.

Duas rotas boas, ambas **independentes da Skyhawk** (conta/servidor/domínio próprios):

### Opção A — "servidor mesmo" (recomendada): um VPS pequeno seu

Um VPS baratinho numa **conta pessoal** (Hetzner, DigitalOcean, Contabo, Hostinger…),
na faixa de **US$4–6/mês**, roda isto com folga e te dá controle total.

1. Crie o servidor (Ubuntu 24.04) e aponte um subdomínio (ex.: `doacoes.suaigreja.com.br` ou
   um domínio próprio da mocidade) para o IP dele.
2. Instale Docker, copie o projeto, crie o `.env` (com `COOKIE_SECURE=true`).
3. Suba: `docker compose up -d --build`.
4. Coloque um **Nginx** na frente com HTTPS (Let's Encrypt). Config mínima:

```nginx
server {
    server_name doacoes.suaigreja.com.br;
    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        # necessário para o WebSocket (o "ao vivo"):
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo certbot --nginx -d doacoes.suaigreja.com.br   # emite o HTTPS automaticamente
```

O volume `doacoes_data` guarda o `doacoes.db` de forma persistente entre reinícios.

### Opção B — zero custo: Northflank (free tier com disco persistente)

Se a ideia é **não pagar nada**, o Northflank hoje é a melhor opção que ainda oferece
**volume persistente** no plano grátis (essencial para o SQLite não sumir), com Docker,
WebSocket e HTTPS automático. Fluxo:

1. Suba este repositório no GitHub (numa conta/organização **da igreja**, não a da Skyhawk).
2. No Northflank, crie um serviço a partir do repo (ele lê o `Dockerfile`).
3. Adicione um **volume persistente** montado em `/data`.
4. Configure as variáveis do `.env` como *secrets* do serviço (não suba o `.env` no Git).
5. Exponha a porta `8000`; o Northflank cuida do TLS e do WebSocket.

> Fly.io deixou de ter plano grátis de verdade (hoje é só um trial curto), e o free do
> Render hiberna e não dá disco persistente — por isso não são ideais aqui. Se um dia
> quiser pagar por praticidade, tanto Render (a partir de ~US$7/mês/serviço + disco) quanto
> Railway (usage-based) rodam o mesmo `docker-compose` sem mudança no código.

O **mesmo projeto** roda igual nas duas opções — a decisão é só de custo × operação.

---

## Backup do banco

O banco é um único arquivo. Uma cópia periódica já resolve:

```bash
# copie o SQLite de dentro do volume para um arquivo datado
docker compose exec doacoes sh -c "cp /data/doacoes.db /data/backup-$(date +%F).db"
docker compose cp doacoes:/data/doacoes.db ./backup-doacoes.db
```

Guarde o `backup-doacoes.db` em outro lugar (Drive, e-mail, pendrive).

---

## Segurança — antes de publicar

- Defina uma `ADMIN_PASSWORD` forte e um `SECRET_KEY` aleatório (`openssl rand -hex 32`).
- Mantenha `COOKIE_SECURE=true` em produção (exige HTTPS).
- O `.env` real nunca vai para o Git (já está no `.gitignore`).
- O painel `/admin` é protegido por login; a página pública só deixa **criar** doações.
- Há um *honeypot* anti-robô no formulário e o QR PIX é gerado localmente.

---

## Estrutura

```
app/         FastAPI (main, models, schemas, pix, security, realtime, seed)
web/         páginas (index, admin, login) + static (style.css, doador.js, admin.js)
Dockerfile / docker-compose.yml / requirements.txt / .env.example
```

Feito com carinho para a mocidade. *"Prossigo para o alvo."* — Fp 3.14
