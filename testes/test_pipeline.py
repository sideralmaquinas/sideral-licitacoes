"""Testa coleta -> banco -> itens -> painel com uma API do PNCP simulada (sem internet)."""
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))

import banco  # noqa: E402
import coletar  # noqa: E402
import painel  # noqa: E402
import pncp  # noqa: E402
from test_classificador import CASOS  # noqa: E402

random.seed(7)
CIDADES = [("SP", "Campinas"), ("MG", "Belo Horizonte"), ("PR", "Curitiba"), ("SC", "Joinville"),
           ("RS", "Caxias do Sul"), ("GO", "Goiânia"), ("BA", "Salvador"), ("SP", "Ribeirão Preto")]
ORGAOS = ["MUNICIPIO DE {c}", "SERVICO NACIONAL DE APRENDIZAGEM INDUSTRIAL", "INSTITUTO FEDERAL DE EDUCACAO",
          "CAMARA MUNICIPAL DE {c}", "UNIVERSIDADE FEDERAL", "SECRETARIA DE ESTADO DA EDUCACAO"]


def registro(i, objeto):
    uf, cid = CIDADES[i % len(CIDADES)]
    agora = datetime.now()
    enc = agora + timedelta(days=random.choice([-3, 1, 2, 5, 9, 15, 25]), hours=random.randint(0, 20))
    return {
        "numeroControlePNCP": f"0000000000{i:04d}-1-{i:06d}/2026",
        "anoCompra": 2026, "sequencialCompra": i,
        "orgaoEntidade": {"cnpj": f"{46000000000100 + i}", "razaoSocial": random.choice(ORGAOS).format(c=cid.upper()),
                          "esferaId": "M", "poderId": "E"},
        "unidadeOrgao": {"ufSigla": uf, "municipioNome": cid, "nomeUnidade": "Secretaria de Administração"},
        "modalidadeId": random.choice([6, 6, 8, 7]), "modalidadeNome": None,
        "situacaoCompraNome": "Divulgada no PNCP", "srp": i % 2 == 0,
        "objetoCompra": objeto, "informacaoComplementar": "",
        "valorTotalEstimado": round(random.uniform(3000, 380000), 2),
        "dataPublicacaoPncp": (agora - timedelta(days=1)).isoformat(timespec="seconds"),
        "dataAberturaProposta": (agora - timedelta(days=1)).isoformat(timespec="seconds"),
        "dataEncerramentoProposta": enc.isoformat(timespec="seconds"),
        "linkSistemaOrigem": "https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras",
    }


REGISTROS = [registro(i, o) for i, (o, _) in enumerate(CASOS * 3)]
for r in REGISTROS:
    r["modalidadeNome"] = pncp.MODALIDADES[r["modalidadeId"]]


def falso_get(self, url, params=None):
    if url.endswith("/itens"):
        return [{"numeroItem": 1, "descricao": "Placa em aço inox escovado 20x30 cm gravada a laser", "quantidade": 40,
                 "unidadeMedida": "UN", "valorUnitarioEstimado": 185.0},
                {"numeroItem": 2, "descricao": "Placa em acrílico cristal 3mm com impressão UV 15x20", "quantidade": 120,
                 "unidadeMedida": "UN", "valorUnitarioEstimado": 62.5}]
    pag, tam = params["pagina"], 25
    lote = REGISTROS[(pag - 1) * tam: pag * tam]
    if not lote:
        return None
    return {"data": lote, "totalRegistros": len(REGISTROS), "totalPaginas": -(-len(REGISTROS) // tam), "numeroPagina": pag}


def test_pipeline(tmp_path=None):
    tmp = Path(tmp_path or RAIZ / "testes" / "_tmp")
    tmp.mkdir(exist_ok=True)
    db = tmp / "teste.db"
    db.unlink(missing_ok=True)
    banco.ARQUIVO = db
    original = banco.conectar
    banco.conectar = lambda arquivo=db: original(arquivo)
    pncp.PNCP._get = falso_get

    coletar.main(["publicadas", "--dias", "1", "--modalidades", "6", "--intervalo", "0"])
    coletar.main(["itens", "--limite", "5", "--intervalo", "0"])
    coletar.main(["resumo"])
    con = banco.conectar()
    total = con.execute("SELECT COUNT(*) FROM editais").fetchone()[0]
    laser = con.execute("SELECT COUNT(*) FROM editais WHERE score >= 3").fetchone()[0]
    assert total == len(REGISTROS)
    assert laser == 12 * 3
    destino = painel.gerar(min_score=2, con=con, destino=tmp / "painel.html")
    assert "Sideral" in destino.read_text(encoding="utf-8")
    print("painel:", destino)


if __name__ == "__main__":
    test_pipeline()
