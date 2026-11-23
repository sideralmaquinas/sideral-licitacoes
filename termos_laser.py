"""Dicionário de termos: o que, num edital, indica produto feito em máquina laser.

Como editar:
- Escreva os termos SEM acento e em minúsculas (o texto do edital é normalizado
  assim antes da comparação).
- Cada termo é uma expressão regular. `s?` = plural opcional, `(a|b)` = um ou outro.
- Peso 3 = quase certeza de ser trabalho de laser; 2 = provável; 1 = só um indício.
- Depois de editar, rode `python coletar.py reclassificar` para reaplicar no banco.
"""

# maquina: "CO2" (MDF, acrílico, madeira, couro), "Fibra" (metais), "CO2/Fibra" (ambas)
CATEGORIAS = {
    "sinalizacao": {
        "nome": "Sinalização e comunicação visual",
        "maquina": "CO2/Fibra",
        "termos": {
            r"comunicacao visual": 3,
            r"sinalizacao (visual|interna|externa|predial|acessivel|tatil|de seguranca|de emergencia|de rota|fotoluminescente|de ambientes?|institucional)": 3,
            r"placas? (de |para )?(identificacao|sinalizacao|indicativas?|informativas?|de porta|de sala|de mesa|de ambiente)": 3,
            r"placas? (de )?inauguracao": 3,
            r"placas? (de |em )?(aco inox|inox|latao|aluminio|acrilico|pvc|mdf|aco escovado)": 3,
            r"letras? caixa": 3,
            r"letreiros?": 2,
            r"totem|totens": 2,
            r"fachadas?": 1,
            r"mapas? tateis|mapas? tatil|piso tatil": 2,
            r"braille": 2,
            r"rota de fuga": 2,
            r"placas? (de )?(rua|logradouros?|nomenclatura|numeracao predial|denominacao)": 3,
            r"placas? (de )?(obras?|identificacao de obras?)": 1,
        },
    },
    "patrimonio": {
        "nome": "Patrimônio e identificação",
        "maquina": "Fibra",
        "termos": {
            r"(plaquetas?|etiquetas?|placas?) (de |para )?(identificacao )?(de )?(patrimonio|tombamento|bens)": 3,
            r"plaquetas?": 2,
            r"identificacao patrimonial|tombamento patrimonial|patrimoniais? (em|de) (aluminio|inox)": 2,
            r"aluminio anodizado": 1,
            r"etiquetas? (metalicas?|em aluminio|de aluminio|em inox|de inox|anodizadas?)": 3,
            r"crachas?": 2,
            r"bot+ons?": 2,
            r"brasao|brasoes|insignias?": 2,
            r"chaveiros?": 2,
        },
    },
    "premiacao": {
        "nome": "Premiação, troféus e brindes",
        "maquina": "CO2/Fibra",
        "termos": {
            r"trofeus?": 3,
            r"medalhas?": 3,
            r"placas? (de )?(homenagem|premiacao|agradecimento|reconhecimento)": 3,
            r"honra ao merito": 3,
            r"estatuetas?": 2,
            r"premiacao|premiacoes": 1,
            r"brindes? (personalizados?|institucionais?|promocionais?)": 2,
            r"brindes?": 1,
            r"(material|materiais) promociona(l|is)": 1,
        },
    },
    "educacao": {
        "nome": "Material pedagógico e educação",
        "maquina": "CO2",
        "termos": {
            r"material dourado": 3,
            r"alfabeto movel": 3,
            r"tangram": 3,
            r"blocos? logicos?": 3,
            r"(jogos?|brinquedos?|kits?|recursos?) (pedagogicos?|educativos?|didaticos?|educacionais?)": 2,
            r"(material|materiais) (pedagogicos?|didaticos?)": 1,
            r"quebra[- ]?cabecas?": 2,
            r"(material|materiais|recursos?) (didaticos? )?(tateis|tatil|acessive(l|is))": 2,
            r"educacao inclusiva|sala de recursos multifuncionais": 1,
            r"maquetes?": 2,
            r"(em|de) mdf|mdf cru": 2,
            r"kits? (de )?robotica": 1,
        },
    },
    "maker": {
        "nome": "Máquinas laser e laboratório maker (venda Sideral)",
        "maquina": "Máquina",
        "termos": {
            r"(maquinas?|equipamentos?|cortadoras?|gravadoras?) (de |para )?(corte|gravacao|corte e gravacao) (a |por |com )?laser": 3,
            r"laser (co2|de co2|de fibra|fibra optica)": 3,
            r"(corte|gravacao|corte e gravacao) (a |por |com )?laser": 3,
            r"laboratorios? maker|espacos? maker|fab ?lab|cultura maker|laboratorios? de fabricacao digital": 3,
            r"router cnc|fresadoras? cnc|cnc router": 2,
            r"impressoras? 3d": 1,
            r"laser": 1,  # sobra depois das exclusões (impressora laser etc.)
        },
    },
    "acrilico": {
        "nome": "Acrílico, displays e expositores",
        "maquina": "CO2",
        "termos": {
            r"acrilicos?": 2,
            r"urnas?": 1,
            r"caixas? (de )?sugest(ao|oes)": 3,
            r"expositor(es)?": 2,
            r"displays? (de mesa|em acrilico|de acrilico|expositor)": 3,
            r"porta[- ]?(folhetos?|folders?|panfletos?|retratos?|copos?|canetas?|guardanapos?)": 2,
            r"divisorias? (de |em )?acrilico": 3,
            r"protetor(es)? facia(l|is)|face ?shields?": 2,
        },
    },
    "decoracao": {
        "nome": "Decoração natalina e datas comemorativas",
        "maquina": "CO2/Fibra",
        "termos": {
            r"(decoracao|ornamentacao|enfeites?) (natalin[ao]s?|de natal)": 3,
            r"natal (iluminado|luz)|natal de luz": 2,
            r"(decoracao|ornamentacao) (tematica|junina|de eventos|carnavalesca|de carnaval|de pascoa)": 2,
            r"(cenografia|cenarios?) (natalin[ao]s?|tematic[ao]s?)": 2,
            r"presepios?": 1,
        },
    },
    "metal": {
        "nome": "Metal: chapas, mobiliário urbano e serralheria",
        "maquina": "Fibra",
        "termos": {
            r"corte (de |em )?chapas?": 3,
            r"chapas? (de |em )?(aco|inox|aluminio|ferro) (cortadas?|recortadas?|perfuradas?)": 3,
            r"aco corten|corten": 3,
            r"guarda[- ]?corpos?": 2,
            r"bicicletarios?|paraciclos?": 2,
            r"mobiliario urbano": 2,
            r"(abrigos?|pontos?) (de )?onibus": 2,
            r"lixeiras? (de |em )?(aco|metal|inox|chapa)": 2,
            r"serralheria": 2,
            r"grades? (de |em )?(ferro|aco|protecao)": 1,
            r"portoes?": 1,
            r"estruturas? metalicas?": 1,
        },
    },
    "servico": {
        "nome": "Serviços de gravação e personalização",
        "maquina": "CO2/Fibra",
        "termos": {
            r"servicos? de gravacao": 3,
            r"gravacao (em|de) (metal|metais|madeira|vidro|acrilico|couro|copos?|tacas?|canetas?)": 3,
            r"personalizacao (de )?(brindes?|canetas?|copos?|uniformes?|objetos?)": 2,
            r"personalizad[ao]s?": 1,
        },
    },
}

# Trechos removidos do texto ANTES de procurar os termos. Servem para que
# "impressora laser" não conte como "laser", "placa de vídeo" não conte como placa etc.
EXCLUSOES = [
    r"impressoras?( multifuncion(al|ais))?( a| de)? laser",
    r"multifuncion(al|ais)( a| de)? laser",
    r"laser ?jet",
    r"tonn?er(s)?",
    r"cartuchos?",
    r"laserterapia|laser terapeutico|laser de baixa (potencia|intensidade)|fotobiomodulacao",
    r"laser (oftalmologico|odontologico|cirurgico|medico|hospitalar|de diodo)",
    r"depilacao( a)? laser",
    r"(trenas?|medidor(es)?|nive(l|is)|niveladores?|distanciometros?|termometros?|miras?|apontador(es)?|ponteiras?|leitor(es)?|scanners?|sensor(es)?|velocimetros?|radar(es)?)( digita(l|is))?( de distancia)?( a| de)? laser",
    r"placas? (de )?(video|mae|rede|captura|som|gesso|cimenticias?|drywall|solar(es)?|fotovoltaicas?|eletronicas?|de petri|de circuito|de veiculos?|veiculares|mercosul|de transito|de regulamentacao|de advertencia|de orientacao|de forro|de eva|de isopor|de vidro|de ceramica|de granito|de marmore|cervical|oclusa(l|is)|bacteriologica|de cultura)",
    r"sinalizacao (viaria|horizontal|vertical|semaforica|de transito|rodoviaria)",
    r"urnas? (funeraria|funerarias|mortuarias?|eletronicas?)",
    r"tinta acrilica|massa acrilica|resina acrilica|selador acrilico|verniz acrilico|fundo acrilico|acrilico (para|de) pintura",
    r"medicamentos?|insumos? hospitalares?",
]

# Indícios de que o objeto é outra coisa (obra, serviço continuado...) e o
# item de laser é só uma parte pequena. Cada um tira pontos.
PENALIDADES = {
    r"obras? de (construcao|reforma|ampliacao|engenharia)|construcao de|pavimentacao|recapeamento": 2,
    r"locacao de (veiculos?|maquinas pesadas|imovel)": 2,
    r"servicos? (continuados?|de limpeza|de vigilancia|de manutencao predial)": 1,
    r"generos alimenticios|merenda|alimentacao escolar": 2,
}

# Pontuação mínima para o edital aparecer no painel por padrão.
SCORE_MINIMO = 3
