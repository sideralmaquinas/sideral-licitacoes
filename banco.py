"""Banco SQLite local (arquivo licitacoes.db)."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path

ARQUIVO = Path(__file__).with_name("licitacoes.db")

ESQUEMA = """
CREATE TABLE IF NOT EXISTS editais (
    id TEXT PRIMARY KEY,
    cnpj TEXT, ano INTEGER, sequencial INTEGER,
    orgao TEXT, esfera TEXT, unidade TEXT, uf TEXT, municipio TEXT,
    modalidade TEXT, modalidade_id INTEGER, situacao TEXT, srp INTEGER,
    objeto TEXT, info TEXT, valor REAL,
    publicacao TEXT, abertura TEXT, encerramento TEXT,
    link_origem TEXT, link_pncp TEXT,
    score INTEGER DEFAULT 0, categorias TEXT, maquina TEXT, termos TEXT,
    itens_baixados INTEGER DEFAULT 0,
    coletado_em TEXT
);
CREATE INDEX IF NOT EXISTS ix_score ON editais(score);
CREATE INDEX IF NOT EXISTS ix_enc ON editais(encerramento);

CREATE TABLE IF NOT EXISTS itens (
    edital_id TEXT, numero INTEGER, descricao TEXT, quantidade REAL,
    unidade TEXT, valor_unitario REAL, valor_total REAL,
    PRIMARY KEY (edital_id, numero)
);

CREATE TABLE IF NOT EXISTS progresso (
    chave TEXT PRIMARY KEY, concluido_em TEXT
);

-- quantos editais foram lidos em cada consulta (para a % de laser
-- continuar certa mesmo depois de apagar os editais que não são de laser)
CREATE TABLE IF NOT EXISTS contagem (
    chave TEXT PRIMARY KEY, lidos INTEGER
);
"""


def registrar_lidos(con, chave: str, lidos: int) -> None:
    con.execute("INSERT OR REPLACE INTO contagem VALUES (?, ?)", (chave, lidos))


def total_lidos(con) -> int:
    soma = con.execute("SELECT COALESCE(SUM(lidos), 0) FROM contagem").fetchone()[0]
    return max(soma, con.execute("SELECT COUNT(*) FROM editais").fetchone()[0])


def podar(con, dias: int) -> int:
    """Apaga editais sem perfil de laser publicados há mais de `dias` dias."""
    cur = con.execute(
        "DELETE FROM editais WHERE score < 2 AND substr(publicacao, 1, 10) < date('now', ?)",
        (f"-{dias} days",),
    )
    con.execute("DELETE FROM itens WHERE edital_id NOT IN (SELECT id FROM editais)")
    con.commit()
    return cur.rowcount

CAMPOS = ["id", "cnpj", "ano", "sequencial", "orgao", "esfera", "unidade", "uf",
          "municipio", "modalidade", "modalidade_id", "situacao", "srp", "objeto",
          "info", "valor", "publicacao", "abertura", "encerramento", "link_origem",
          "link_pncp"]


def conectar(arquivo: Path | str = ARQUIVO) -> sqlite3.Connection:
    con = sqlite3.connect(arquivo)
    con.row_factory = sqlite3.Row
    con.executescript(ESQUEMA)
    return con


def salvar_edital(con: sqlite3.Connection, e: dict, classe: dict) -> None:
    valores = [e.get(c) for c in CAMPOS]
    extra = [classe["score"], json.dumps(classe["categorias"], ensure_ascii=False),
             classe["maquina"], json.dumps(classe["termos"], ensure_ascii=False),
             datetime.now().isoformat(timespec="seconds")]
    cols = CAMPOS + ["score", "categorias", "maquina", "termos", "coletado_em"]
    atualiza = ", ".join(f"{c}=excluded.{c}" for c in cols if c not in ("id", "coletado_em"))
    con.execute(
        f"INSERT INTO editais ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))}) "
        f"ON CONFLICT(id) DO UPDATE SET {atualiza}",
        valores + extra,
    )


def atualizar_classe(con, edital_id: str, classe: dict) -> None:
    con.execute(
        "UPDATE editais SET score=?, categorias=?, maquina=?, termos=? WHERE id=?",
        (classe["score"], json.dumps(classe["categorias"], ensure_ascii=False),
         classe["maquina"], json.dumps(classe["termos"], ensure_ascii=False), edital_id),
    )


def salvar_itens(con, edital_id: str, itens: list[dict]) -> None:
    for i, it in enumerate(itens, 1):
        con.execute(
            "INSERT OR REPLACE INTO itens VALUES (?,?,?,?,?,?,?)",
            (edital_id, it.get("numeroItem") or i, it.get("descricao") or "",
             it.get("quantidade"), it.get("unidadeMedida") or "",
             it.get("valorUnitarioEstimado"), it.get("valorTotal")),
        )
    con.execute("UPDATE editais SET itens_baixados=1 WHERE id=?", (edital_id,))


def feito(con, chave: str) -> bool:
    return con.execute("SELECT 1 FROM progresso WHERE chave=?", (chave,)).fetchone() is not None


def marcar(con, chave: str) -> None:
    con.execute("INSERT OR REPLACE INTO progresso VALUES (?, ?)",
                (chave, datetime.now().isoformat(timespec="seconds")))
