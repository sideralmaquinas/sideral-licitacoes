"""Dá uma nota de 'serve para máquina laser' a cada edital, usando termos_laser.py."""
from __future__ import annotations

import re
import unicodedata
from functools import lru_cache

import termos_laser as T


def normalizar_texto(txt: str) -> str:
    txt = unicodedata.normalize("NFKD", txt or "")
    txt = "".join(c for c in txt if not unicodedata.combining(c))
    txt = txt.lower()
    txt = re.sub(r"[^a-z0-9]+", " ", txt)
    return f" {txt.strip()} "


@lru_cache(maxsize=1)
def _compilados():
    def b(p):  # delimita por palavra
        return re.compile(rf"(?<![a-z0-9])(?:{p})(?![a-z0-9])")

    cats = {
        chave: [(termo, b(termo), peso) for termo, peso in c["termos"].items()]
        for chave, c in T.CATEGORIAS.items()
    }
    excl = [b(p) for p in T.EXCLUSOES]
    pen = [(b(p), peso) for p, peso in T.PENALIDADES.items()]
    return cats, excl, pen


def classificar(*textos: str) -> dict:
    cats, excl, pen = _compilados()
    txt = normalizar_texto(" . ".join(t for t in textos if t))
    for rx in excl:
        txt = rx.sub(" ", txt)

    por_cat: dict[str, int] = {}
    achados: list[str] = []
    for chave, termos in cats.items():
        pts = 0
        for termo, rx, peso in termos:
            m = rx.search(txt)
            if m:
                pts += peso
                achados.append(m.group(0).strip())
        if pts:
            por_cat[chave] = pts

    if not por_cat:
        return {"score": 0, "categorias": [], "maquina": "", "termos": []}

    ordenadas = sorted(por_cat, key=por_cat.get, reverse=True)
    # nota = melhor categoria inteira + metade das demais (evita inflar por indícios soltos)
    score = por_cat[ordenadas[0]] + sum(por_cat[c] for c in ordenadas[1:]) // 2
    score -= sum(peso for rx, peso in pen if rx.search(txt))
    score = max(score, 0)

    maquinas = {T.CATEGORIAS[c]["maquina"] for c in ordenadas if por_cat[c] >= 2}
    if not maquinas:
        maquinas = {T.CATEGORIAS[ordenadas[0]]["maquina"]}
    if "Máquina" in maquinas:
        maquina = "Máquina"
    elif "CO2/Fibra" in maquinas or {"CO2", "Fibra"} <= maquinas:
        maquina = "CO2/Fibra"
    else:
        maquina = maquinas.pop()

    return {
        "score": score,
        "categorias": ordenadas,
        "maquina": maquina,
        "termos": list(dict.fromkeys(achados))[:12],
    }


def nome_categoria(chave: str) -> str:
    return T.CATEGORIAS.get(chave, {}).get("nome", chave)
