"""Gerador de PIX estático (BR Code / EMV) — payload copia-e-cola e QR em SVG.

Segue o padrão EMV®/BR Code do Banco Central. Não depende de internet.
"""
from __future__ import annotations

import unicodedata

import segno

from .config import settings


def _ascii(txt: str) -> str:
    """PIX exige ASCII; remove acentos e caracteres fora do padrão."""
    norm = unicodedata.normalize("NFKD", txt or "")
    return "".join(c for c in norm if not unicodedata.combining(c)).encode(
        "ascii", "ignore"
    ).decode()


def _emv(tag: str, value: str) -> str:
    return f"{tag}{len(value):02d}{value}"


def _crc16(payload: str) -> str:
    crc = 0xFFFF
    for byte in payload.encode("utf-8"):
        crc ^= byte << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if (crc & 0x8000) else (crc << 1)
            crc &= 0xFFFF
    return f"{crc:04X}"


def build_payload() -> str | None:
    """Monta o BR Code estático. Retorna None se não houver chave configurada."""
    key = settings.PIX_KEY.strip()
    if not key:
        return None

    name = (_ascii(settings.PIX_NAME) or "RECEBEDOR")[:25]
    city = (_ascii(settings.PIX_CITY) or "BRASIL")[:15]
    desc = _ascii(settings.PIX_DESCRIPTION)[:40]

    # Merchant Account Information (tag 26)
    mai = _emv("00", "br.gov.bcb.pix") + _emv("01", key)
    if desc:
        mai += _emv("02", desc)

    parts = [
        _emv("00", "01"),          # payload format indicator
        _emv("26", mai),           # merchant account info (pix)
        _emv("52", "0000"),        # merchant category code
        _emv("53", "986"),         # moeda BRL
    ]

    amount = settings.PIX_AMOUNT.strip().replace(",", ".")
    if amount:
        try:
            parts.append(_emv("54", f"{float(amount):.2f}"))
        except ValueError:
            pass

    parts += [
        _emv("58", "BR"),
        _emv("59", name),
        _emv("60", city),
        _emv("62", _emv("05", "***")),  # additional data / txid livre
    ]

    payload = "".join(parts) + "6304"
    return payload + _crc16(payload)


def qr_svg() -> str | None:
    """QR do PIX em SVG inline (string). None se sem chave."""
    payload = build_payload()
    if not payload:
        return None
    qr = segno.make(payload, error="m")
    import io

    buf = io.BytesIO()
    qr.save(
        buf, kind="svg", scale=4, border=2,
        dark="#10214b", light=None,   # light=None => fundo transparente
        xmldecl=False, svgns=True, nl=False,
    )
    return buf.getvalue().decode("utf-8")


def pix_context() -> dict:
    payload = build_payload()
    return {
        "enabled": bool(payload),
        "payload": payload or "",
        "copia_cola": payload or "",
        "name": settings.PIX_NAME,
        "city": settings.PIX_CITY,
        "key": settings.PIX_KEY,
        "amount": settings.PIX_AMOUNT,
        "note": settings.PIX_NOTE,
    }
