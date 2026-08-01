"""Camada de banco — SQLAlchemy 2.x async sobre SQLite (aiosqlite)."""
from __future__ import annotations

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings


class Base(DeclarativeBase):
    pass


# SQLite + async. check_same_thread desligado para o pool async.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False},
)

# PRAGMAs aplicados a CADA conexão nova (fora de transação, do jeito certo):
# - WAL: leitura não bloqueia durante escrita (bom p/ tempo real)
# - foreign_keys: necessário para o ondelete=SET NULL das doações
# - busy_timeout: espera curta em vez de erro se o banco estiver ocupado
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine.sync_engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):  # noqa: ANN001
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA busy_timeout=5000")
        cur.close()

SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
