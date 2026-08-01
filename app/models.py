"""Modelos ORM."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Category(Base):
    """Uma seção da lista (ex.: 'Sábado · Almoço', 'Bebidas').

    A coordenação cria, renomeia e reordena pelo painel.
    """

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)

    itens: Mapped[list["Item"]] = relationship(
        back_populates="categoria", cascade="all, delete-orphan"
    )


class Item(Base):
    """Um item da lista, com a meta a ser atingida."""

    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    meta: Mapped[float] = mapped_column(Float, nullable=False)          # ex.: 36
    unidade: Mapped[str] = mapped_column(String(60), default="")        # ex.: "kg"
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)

    categoria: Mapped["Category | None"] = relationship(back_populates="itens")
    doacoes: Mapped[list["Donation"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )


class Donation(Base):
    """Uma doação (compromisso) feita por alguém.

    status:
      - prometido : registrada pelo doador, ainda não entregue
      - recebido  : confirmada pela organização (entregue)
      - cancelado : não conta no progresso
    """

    __tablename__ = "donations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int | None] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"), nullable=True
    )
    item_livre: Mapped[str | None] = mapped_column(String(120), nullable=True)  # fora da lista
    doador_nome: Mapped[str] = mapped_column(String(120), nullable=False)
    grupo: Mapped[str | None] = mapped_column(String(80), nullable=True)  # ex.: núcleo/família
    contato: Mapped[str | None] = mapped_column(String(120), nullable=True)
    quantidade: Mapped[float] = mapped_column(Float, nullable=False)
    unidade: Mapped[str] = mapped_column(String(60), default="")
    observacao: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="prometido")
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    item: Mapped["Item | None"] = relationship(back_populates="doacoes")
