"""Autenticação do admin: hash de senha (bcrypt) + JWT em cookie httpOnly."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Cookie, HTTPException, status

from .config import settings

COOKIE_NAME = "ejc_admin"
ALGO = "HS256"

# Hash da senha do admin, calculado uma vez no import.
_ADMIN_HASH = bcrypt.hashpw(settings.ADMIN_PASSWORD.encode(), bcrypt.gensalt())


def check_credentials(usuario: str, senha: str) -> bool:
    if usuario != settings.ADMIN_USER:
        return False
    try:
        return bcrypt.checkpw(senha.encode(), _ADMIN_HASH)
    except ValueError:
        return False


def create_token() -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=settings.TOKEN_TTL_HOURS)
    payload = {"sub": settings.ADMIN_USER, "role": "admin", "exp": exp}
    return jwt.encode(payload, settings.effective_secret, algorithm=ALGO)


def require_admin(ejc_admin: str | None = Cookie(default=None)) -> str:
    """Dependency: exige cookie de admin válido, senão 401."""
    if not ejc_admin:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Faça login")
    try:
        data = jwt.decode(ejc_admin, settings.effective_secret, algorithms=[ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão expirada")
    if data.get("role") != "admin":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sem permissão")
    return data["sub"]
