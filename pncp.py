"""Cliente da API pública de consulta do PNCP (Portal Nacional de Contratações Públicas).

Não precisa de login. A API é lenta (10-20 s por página) e devolve 429 se for
chamada rápido demais, então este cliente espaça as chamadas e tenta de novo
com espera crescente.
"""
from __future__ import annotations

import time
from datetime import date

import requests

BASE_CONSULTA = "https://pncp.gov.br/api/consulta"
BASE_PNCP = "https://pncp.gov.br/api/pncp"

MODALIDADES = {
    1: "Leilão - Eletrônico",
    2: "Diálogo Competitivo",
    3: "Concurso",
    4: "Concorrência - Eletrônica",
    5: "Concorrência - Presencial",
    6: "Pregão - Eletrônico",
    7: "Pregão - Presencial",
    8: "Dispensa de Licitação",
    9: "Inexigibilidade",
    10: "Manifestação de Interesse",
    11: "Pré-qualificação",
    12: "Credenciamento",
    13: "Leilão - Presencial",
}

# Modalidades em que uma empresa de corte a laser realmente disputa.
MODALIDADES_PADRAO = [6, 8, 7, 4, 12]

TAMANHO_PAGINA = 50


class ErroPNCP(Exception):
    pass


class PNCP:
    def __init__(self, intervalo: float = 2.0, timeout: int = 90, tentativas: int = 6):
        self.intervalo = intervalo
        self.timeout = timeout
        self.tentativas = tentativas
        self._ultima = 0.0
        self.sessao = requests.Session()
        self.sessao.headers.update({
            "Accept": "application/json",
            "User-Agent": "SideralLicitacoes/0.1 (+https://sideralmaquinas.com.br)",
        })

    # ------------------------------------------------------------------ base
    def _get(self, url: str, params: dict | None = None) -> dict | list | None:
        espera = 5.0
        ultimo_erro = ""
        for tentativa in range(1, self.tentativas + 1):
            falta = self.intervalo - (time.time() - self._ultima)
            if falta > 0:
                time.sleep(falta)
            self._ultima = time.time()
            try:
                r = self.sessao.get(url, params=params, timeout=self.timeout)
            except requests.RequestException as e:
                ultimo_erro = f"{type(e).__name__}: {e}"
            else:
                if r.status_code == 204 or not r.content:
                    return None  # PNCP responde 204 quando não há resultados
                if r.status_code == 200:
                    try:
                        return r.json()
                    except ValueError:
                        ultimo_erro = "resposta não é JSON"
                elif r.status_code in (429, 500, 502, 503, 504):
                    ultimo_erro = f"HTTP {r.status_code}"
                else:
                    raise ErroPNCP(f"HTTP {r.status_code} em {r.url}: {r.text[:300]}")
            print(f"    ! {ultimo_erro} - tentativa {tentativa}/{self.tentativas}, aguardando {espera:.0f}s")
            time.sleep(espera)
            espera = min(espera * 2, 120)
        raise ErroPNCP(f"Falhou após {self.tentativas} tentativas: {ultimo_erro} ({url})")

    @staticmethod
    def _data(d: date) -> str:
        return d.strftime("%Y%m%d")

    # ------------------------------------------------------------ consultas
    def publicadas(self, data_ini: date, data_fim: date, modalidade: int,
                   uf: str | None = None, pagina: int = 1) -> dict | None:
        """Contratações publicadas no período (uma modalidade por chamada)."""
        params = {
            "dataInicial": self._data(data_ini),
            "dataFinal": self._data(data_fim),
            "codigoModalidadeContratacao": modalidade,
            "pagina": pagina,
            "tamanhoPagina": TAMANHO_PAGINA,
        }
        if uf:
            params["uf"] = uf
        return self._get(f"{BASE_CONSULTA}/v1/contratacoes/publicacao", params)

    def abertas(self, data_final: date, modalidade: int | None = None,
                uf: str | None = None, pagina: int = 1) -> dict | None:
        """Contratações com recebimento de propostas em aberto até data_final."""
        params = {"dataFinal": self._data(data_final), "pagina": pagina,
                  "tamanhoPagina": TAMANHO_PAGINA}
        if modalidade:
            params["codigoModalidadeContratacao"] = modalidade
        if uf:
            params["uf"] = uf
        return self._get(f"{BASE_CONSULTA}/v1/contratacoes/proposta", params)

    def itens(self, cnpj: str, ano: int, sequencial: int) -> list[dict]:
        """Itens de uma contratação (descrição, quantidade, valor estimado)."""
        todos: list[dict] = []
        pagina = 1
        while True:
            dados = self._get(
                f"{BASE_PNCP}/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens",
                {"pagina": pagina, "tamanhoPagina": 100},
            )
            if not dados:
                break
            lote = dados if isinstance(dados, list) else dados.get("data", [])
            todos.extend(lote)
            if len(lote) < 100:
                break
            pagina += 1
        return todos


def normalizar(reg: dict) -> dict:
    """Achata um registro de contratação do PNCP no formato do nosso banco."""
    org = reg.get("orgaoEntidade") or {}
    uni = reg.get("unidadeOrgao") or {}
    cnpj = org.get("cnpj") or ""
    ano = reg.get("anoCompra")
    seq = reg.get("sequencialCompra")
    ident = reg.get("numeroControlePNCP") or f"{cnpj}-{ano}-{seq}"
    return {
        "id": ident,
        "cnpj": cnpj,
        "ano": ano,
        "sequencial": seq,
        "orgao": org.get("razaoSocial") or "",
        "esfera": org.get("esferaId") or "",
        "unidade": uni.get("nomeUnidade") or "",
        "uf": uni.get("ufSigla") or "",
        "municipio": uni.get("municipioNome") or "",
        "modalidade": reg.get("modalidadeNome") or MODALIDADES.get(reg.get("modalidadeId"), ""),
        "modalidade_id": reg.get("modalidadeId"),
        "situacao": reg.get("situacaoCompraNome") or "",
        "srp": 1 if reg.get("srp") else 0,
        "objeto": (reg.get("objetoCompra") or "").strip(),
        "info": (reg.get("informacaoComplementar") or "").strip()[:2000],
        "valor": reg.get("valorTotalEstimado") or 0,
        "publicacao": reg.get("dataPublicacaoPncp") or "",
        "abertura": reg.get("dataAberturaProposta") or "",
        "encerramento": reg.get("dataEncerramentoProposta") or "",
        "link_origem": reg.get("linkSistemaOrigem") or "",
        "link_pncp": f"https://pncp.gov.br/app/editais/{cnpj}/{ano}/{seq}" if cnpj and ano and seq else "",
    }
