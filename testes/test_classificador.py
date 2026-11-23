"""Rode com: python -m pytest testes  (ou python testes/test_classificador.py)"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from classificador import classificar  # noqa: E402

# (objeto do edital, deve aparecer no painel?)
CASOS = [
    ("Registro de preços para aquisição de placas de identificação em aço inox e acrílico para as unidades escolares", True),
    ("Contratação de empresa para fornecimento de troféus e medalhas para os Jogos Escolares Municipais 2026", True),
    ("Aquisição de material pedagógico: material dourado, alfabeto móvel e blocos lógicos em MDF", True),
    ("Aquisição de máquina de corte e gravação a laser CO2 para o laboratório maker do campus", True),
    ("Contratação de serviços de comunicação visual, incluindo letras caixa, totens e adesivos", True),
    ("Aquisição de plaquetas de identificação patrimonial em alumínio anodizado", True),
    ("Contratação de empresa para decoração natalina da praça central - Natal Iluminado 2026", True),
    ("Fornecimento de urnas e caixas de sugestão em acrílico cristal", True),
    ("Aquisição de sinalização acessível em braille e mapa tátil conforme NBR 9050", True),
    ("Confecção e instalação de placas de inauguração em aço escovado", True),
    ("Aquisição de bicicletários e lixeiras em aço para mobiliário urbano", True),
    ("Aquisição de crachás e brasões para a Guarda Municipal", True),
    # ---- não devem aparecer
    ("Aquisição de impressoras multifuncionais laser e toners para a secretaria", False),
    ("Contratação de serviço de outsourcing de impressão com impressoras a laser", False),
    ("Aquisição de equipamento de laserterapia para a clínica de fisioterapia", False),
    ("Aquisição de trena a laser e nível a laser para a equipe de obras", False),
    ("Aquisição de placas de vídeo, placas mãe e memórias para os computadores", False),
    ("Contratação de empresa para sinalização viária horizontal e vertical", False),
    ("Aquisição de tinta acrílica para pintura das escolas", False),
    ("Aquisição de gêneros alimentícios para a merenda escolar", False),
    ("Aquisição de placas de gesso e drywall para reforma", False),
    ("Aquisição de medicamentos da atenção básica", False),
]


def test_casos():
    erros = []
    for objeto, esperado in CASOS:
        r = classificar(objeto)
        obtido = r["score"] >= 3
        if obtido != esperado:
            erros.append(f"{'FALTOU' if esperado else 'SOBROU'} [{r['score']}] {objeto} -> {r['termos']}")
    assert not erros, "\n" + "\n".join(erros)


if __name__ == "__main__":
    for objeto, esperado in CASOS:
        r = classificar(objeto)
        ok = (r["score"] >= 3) == esperado
        print(f"{'ok ' if ok else 'ERR'} {r['score']:>2} {r['maquina']:<9} {objeto[:70]:<70} {r['termos']}")
