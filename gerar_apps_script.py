"""Gera apps_script/Code.gs (versão Google Planilhas) a partir de termos_laser.py e do painel."""
import json
from pathlib import Path

import painel
import termos_laser as T

RAIZ = Path(__file__).parent
termos = {
    "categorias": {k: {"nome": v["nome"], "maquina": v["maquina"], "termos": v["termos"]} for k, v in T.CATEGORIAS.items()},
    "exclusoes": T.EXCLUSOES,
    "penalidades": T.PENALIDADES,
}
modelo = painel.MODELO.replace(
    '<button onclick="exportar()">Exportar CSV</button>',
    '<a href="__PLANILHA__" target="_blank" rel="noopener"><button>Abrir planilha</button></a>',
)
codigo = (RAIZ / "apps_script" / "Code.template.js").read_text(encoding="utf-8")
codigo = codigo.replace("__TERMOS__", json.dumps(termos, ensure_ascii=False, indent=1), 1)
codigo = codigo.replace("__MODELO__", json.dumps(modelo, ensure_ascii=False), 1)
(RAIZ / "apps_script" / "Code.gs").write_text(codigo, encoding="utf-8")
print("apps_script/Code.gs gerado:", len(codigo), "caracteres")
