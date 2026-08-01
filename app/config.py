"""Configuração central — tudo vem de variáveis de ambiente (.env)."""
from __future__ import annotations

import os
from functools import lru_cache


class Settings:
    # Identidade do evento (aparece no topo da página do doador)
    EVENT_NAME: str = os.getenv("EVENT_NAME", "O Alvo é Cristo")
    EVENT_SUBTITLE: str = os.getenv(
        "EVENT_SUBTITLE",
        "Mocidade Presbiteriana de Ponta Grossa",
    )
    EVENT_VERSE: str = os.getenv(
        "EVENT_VERSE",
        "Prossigo para o alvo, para o prêmio da soberana vocação de Deus em Cristo Jesus.",
    )
    EVENT_VERSE_REF: str = os.getenv("EVENT_VERSE_REF", "Filipenses 3.14")

    # Banco de dados (SQLite em volume Docker por padrão)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:////data/doacoes.db"
    )

    # Segurança / admin
    ADMIN_USER: str = os.getenv("ADMIN_USER", "admin")
    # Senha em texto puro só para bootstrap; troque no .env. Vira hash no startup.
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "trocar-esta-senha")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")  # obrigatório em produção
    TOKEN_TTL_HOURS: int = int(os.getenv("TOKEN_TTL_HOURS", "12"))
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "true").lower() == "true"

    # PIX (BR Code / copia-e-cola). Deixe PIX_KEY vazio para esconder a seção.
    PIX_KEY: str = os.getenv("PIX_KEY", "")
    PIX_NAME: str = os.getenv("PIX_NAME", "")          # nome do beneficiário (máx 25)
    PIX_CITY: str = os.getenv("PIX_CITY", "")          # cidade (máx 15)
    PIX_DESCRIPTION: str = os.getenv("PIX_DESCRIPTION", "Doacao Mocidade")
    PIX_AMOUNT: str = os.getenv("PIX_AMOUNT", "")      # vazio = doador escolhe o valor
    # Aviso livre exibido junto ao PIX (ex.: centavos identificadores da tesouraria)
    PIX_NOTE: str = os.getenv(
        "PIX_NOTE",
        "Se preferir doar em dinheiro, faça um PIX para a igreja.",
    )

    @property
    def effective_secret(self) -> str:
        # Se ninguém definiu SECRET_KEY, deriva uma estável a partir da senha
        # (evita quebrar sessões em cada restart). Em produção, defina SECRET_KEY.
        if self.SECRET_KEY:
            return self.SECRET_KEY
        import hashlib
        return hashlib.sha256(
            f"{self.ADMIN_USER}:{self.ADMIN_PASSWORD}:alvo".encode()
        ).hexdigest()


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
