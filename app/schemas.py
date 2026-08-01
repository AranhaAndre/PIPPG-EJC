"""Schemas Pydantic (contratos de API)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

STATUS_VALIDOS = {"prometido", "recebido", "cancelado"}


# ------------------------- Doador -------------------------
class DonationCreate(BaseModel):
    item_id: int | None = None
    item_livre: str | None = Field(default=None, max_length=120)
    doador_nome: str = Field(min_length=2, max_length=120)
    grupo: str | None = Field(default=None, max_length=80)
    contato: str | None = Field(default=None, max_length=120)
    quantidade: float = Field(gt=0)
    unidade: str | None = Field(default="", max_length=60)
    observacao: str | None = Field(default=None, max_length=500)
    # honeypot anti-spam: campo escondido no form; se preenchido, é bot.
    website: str | None = None

    @field_validator("doador_nome")
    @classmethod
    def _nome_limpo(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Informe seu nome")
        return v


class DonationOut(BaseModel):
    id: int
    item_id: int | None
    item_livre: str | None
    doador_nome: str
    grupo: str | None
    contato: str | None
    quantidade: float
    unidade: str
    observacao: str | None
    status: str
    criado_em: datetime

    class Config:
        from_attributes = True


class DonationAdminUpdate(BaseModel):
    status: str | None = None
    quantidade: float | None = Field(default=None, gt=0)
    doador_nome: str | None = None
    grupo: str | None = None
    contato: str | None = None
    observacao: str | None = None

    @field_validator("status")
    @classmethod
    def _valid_status(cls, v):
        if v is not None and v not in STATUS_VALIDOS:
            raise ValueError("status inválido")
        return v


# ------------------------- Categorias -------------------------
class CategoryCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=80)
    ordem: int | None = None


class CategoryUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=80)
    ordem: int | None = None
    ativo: bool | None = None


class CategoryOut(BaseModel):
    id: int
    nome: str
    ordem: int
    ativo: bool

    class Config:
        from_attributes = True


# ------------------------- Itens (gestão) -------------------------
class ItemCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    meta: float = Field(gt=0)
    unidade: str = Field(default="", max_length=60)
    category_id: int | None = None
    categoria_nova: str | None = Field(default=None, max_length=80)  # cria categoria na hora
    ordem: int | None = None


class ItemUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    meta: float | None = Field(default=None, gt=0)
    unidade: str | None = Field(default=None, max_length=60)
    category_id: int | None = None
    ordem: int | None = None
    ativo: bool | None = None


# ------------------------- Progresso (leitura pública) -------------------------
class ItemProgress(BaseModel):
    id: int
    nome: str
    category_id: int | None
    categoria: str
    meta: float
    unidade: str
    doado: float          # soma de prometido + recebido
    recebido: float       # só recebido
    percentual: float     # 0..100 (limitado a 100 na barra)
    doadores: list[str]   # nomes que doaram esse item
    completo: bool


class LoginIn(BaseModel):
    usuario: str
    senha: str
