/**
 * SIDERAL LICITAÇÕES — versão Google Planilhas (Apps Script)
 *
 * Busca no PNCP os editais publicados por prefeituras, estados, governo federal,
 * autarquias, universidades e institutos federais, separa os que servem para
 * máquina laser e mostra num painel que abre no celular.
 *
 * Instalação: veja o arquivo LEIA-ME. Em resumo:
 *   1. Cole este código em Extensões → Apps Script de uma planilha nova.
 *   2. Rode a função "configurar" uma vez (ela cria as abas e o agendamento).
 *   3. Implantar → Nova implantação → App da Web, para ter o link do painel.
 *
 * Arquivo gerado por gerar_apps_script.py — para mudar os termos de laser,
 * edite termos_laser.py e gere de novo (ou edite TERMOS abaixo direto).
 */

// ============================ AJUSTES ============================
var CONFIG = {
  diasParaTras: 3,              // quantos dias de publicação manter em dia
  modalidades: [6, 8, 7, 4, 12], // 6 pregão eletr., 8 dispensa, 7 pregão pres., 4 concorrência eletr., 12 credenciamento
  ufs: [],                      // [] = Brasil inteiro; ex.: ['SP', 'MG']
  scoreGuardar: 2,              // nota mínima para guardar o edital na planilha
  scorePainel: 3,               // nota mínima mostrada no painel por padrão
  itensPorExecucao: 6,          // quantos editais por execução têm a lista de itens baixada
  diasManter: 120,              // editais encerrados há mais tempo que isso são apagados
  segundosPorExecucao: 270,     // Google limita a 6 min por execução
};
// =================================================================

var TERMOS = {
 "categorias": {
  "sinalizacao": {
   "nome": "Sinalização e comunicação visual",
   "maquina": "CO2/Fibra",
   "termos": {
    "comunicacao visual": 3,
    "sinalizacao (visual|interna|externa|predial|acessivel|tatil|de seguranca|de emergencia|de rota|fotoluminescente|de ambientes?|institucional)": 3,
    "placas? (de |para )?(identificacao|sinalizacao|indicativas?|informativas?|de porta|de sala|de mesa|de ambiente)": 3,
    "placas? (de )?inauguracao": 3,
    "placas? (de |em )?(aco inox|inox|latao|aluminio|acrilico|pvc|mdf|aco escovado)": 3,
    "letras? caixa": 3,
    "letreiros?": 2,
    "totem|totens": 2,
    "fachadas?": 1,
    "mapas? tateis|mapas? tatil|piso tatil": 2,
    "braille": 2,
    "rota de fuga": 2,
    "placas? (de )?(rua|logradouros?|nomenclatura|numeracao predial|denominacao)": 3,
    "placas? (de )?(obras?|identificacao de obras?)": 1
   }
  },
  "patrimonio": {
   "nome": "Patrimônio e identificação",
   "maquina": "Fibra",
   "termos": {
    "(plaquetas?|etiquetas?|placas?) (de |para )?(identificacao )?(de )?(patrimonio|tombamento|bens)": 3,
    "plaquetas?": 2,
    "identificacao patrimonial|tombamento patrimonial|patrimoniais? (em|de) (aluminio|inox)": 2,
    "aluminio anodizado": 1,
    "etiquetas? (metalicas?|em aluminio|de aluminio|em inox|de inox|anodizadas?)": 3,
    "crachas?": 2,
    "bot+ons?": 2,
    "brasao|brasoes|insignias?": 2,
    "chaveiros?": 2
   }
  },
  "premiacao": {
   "nome": "Premiação, troféus e brindes",
   "maquina": "CO2/Fibra",
   "termos": {
    "trofeus?": 3,
    "medalhas?": 3,
    "placas? (de )?(homenagem|premiacao|agradecimento|reconhecimento)": 3,
    "honra ao merito": 3,
    "estatuetas?": 2,
    "premiacao|premiacoes": 1,
    "brindes? (personalizados?|institucionais?|promocionais?)": 2,
    "brindes?": 1,
    "(material|materiais) promociona(l|is)": 1
   }
  },
  "educacao": {
   "nome": "Material pedagógico e educação",
   "maquina": "CO2",
   "termos": {
    "material dourado": 3,
    "alfabeto movel": 3,
    "tangram": 3,
    "blocos? logicos?": 3,
    "(jogos?|brinquedos?|kits?|recursos?) (pedagogicos?|educativos?|didaticos?|educacionais?)": 2,
    "(material|materiais) (pedagogicos?|didaticos?)": 1,
    "quebra[- ]?cabecas?": 2,
    "(material|materiais|recursos?) (didaticos? )?(tateis|tatil|acessive(l|is))": 2,
    "educacao inclusiva|sala de recursos multifuncionais": 1,
    "maquetes?": 2,
    "(em|de) mdf|mdf cru": 2,
    "kits? (de )?robotica": 1
   }
  },
  "maker": {
   "nome": "Máquinas laser e laboratório maker (venda Sideral)",
   "maquina": "Máquina",
   "termos": {
    "(maquinas?|equipamentos?|cortadoras?|gravadoras?) (de |para )?(corte|gravacao|corte e gravacao) (a |por |com )?laser": 3,
    "laser (co2|de co2|de fibra|fibra optica)": 3,
    "(corte|gravacao|corte e gravacao) (a |por |com )?laser": 3,
    "laboratorios? maker|espacos? maker|fab ?lab|cultura maker|laboratorios? de fabricacao digital": 3,
    "router cnc|fresadoras? cnc|cnc router": 2,
    "impressoras? 3d": 1,
    "laser": 1
   }
  },
  "acrilico": {
   "nome": "Acrílico, displays e expositores",
   "maquina": "CO2",
   "termos": {
    "acrilicos?": 2,
    "urnas?": 1,
    "caixas? (de )?sugest(ao|oes)": 3,
    "expositor(es)?": 2,
    "displays? (de mesa|em acrilico|de acrilico|expositor)": 3,
    "porta[- ]?(folhetos?|folders?|panfletos?|retratos?|copos?|canetas?|guardanapos?)": 2,
    "divisorias? (de |em )?acrilico": 3,
    "protetor(es)? facia(l|is)|face ?shields?": 2
   }
  },
  "decoracao": {
   "nome": "Decoração natalina e datas comemorativas",
   "maquina": "CO2/Fibra",
   "termos": {
    "(decoracao|ornamentacao|enfeites?) (natalin[ao]s?|de natal)": 3,
    "natal (iluminado|luz)|natal de luz": 2,
    "(decoracao|ornamentacao) (tematica|junina|de eventos|carnavalesca|de carnaval|de pascoa)": 2,
    "(cenografia|cenarios?) (natalin[ao]s?|tematic[ao]s?)": 2,
    "presepios?": 1
   }
  },
  "metal": {
   "nome": "Metal: chapas, mobiliário urbano e serralheria",
   "maquina": "Fibra",
   "termos": {
    "corte (de |em )?chapas?": 3,
    "chapas? (de |em )?(aco|inox|aluminio|ferro) (cortadas?|recortadas?|perfuradas?)": 3,
    "aco corten|corten": 3,
    "guarda[- ]?corpos?": 2,
    "bicicletarios?|paraciclos?": 2,
    "mobiliario urbano": 2,
    "(abrigos?|pontos?) (de )?onibus": 2,
    "lixeiras? (de |em )?(aco|metal|inox|chapa)": 2,
    "serralheria": 2,
    "grades? (de |em )?(ferro|aco|protecao)": 1,
    "portoes?": 1,
    "estruturas? metalicas?": 1
   }
  },
  "servico": {
   "nome": "Serviços de gravação e personalização",
   "maquina": "CO2/Fibra",
   "termos": {
    "servicos? de gravacao": 3,
    "gravacao (em|de) (metal|metais|madeira|vidro|acrilico|couro|copos?|tacas?|canetas?)": 3,
    "personalizacao (de )?(brindes?|canetas?|copos?|uniformes?|objetos?)": 2,
    "personalizad[ao]s?": 1
   }
  }
 },
 "exclusoes": [
  "impressoras?( multifuncion(al|ais))?( a| de)? laser",
  "multifuncion(al|ais)( a| de)? laser",
  "laser ?jet",
  "tonn?er(s)?",
  "cartuchos?",
  "laserterapia|laser terapeutico|laser de baixa (potencia|intensidade)|fotobiomodulacao",
  "laser (oftalmologico|odontologico|cirurgico|medico|hospitalar|de diodo)",
  "depilacao( a)? laser",
  "(trenas?|medidor(es)?|nive(l|is)|niveladores?|distanciometros?|termometros?|miras?|apontador(es)?|ponteiras?|leitor(es)?|scanners?|sensor(es)?|velocimetros?|radar(es)?)( digita(l|is))?( de distancia)?( a| de)? laser",
  "placas? (de )?(video|mae|rede|captura|som|gesso|cimenticias?|drywall|solar(es)?|fotovoltaicas?|eletronicas?|de petri|de circuito|de veiculos?|veiculares|mercosul|de transito|de regulamentacao|de advertencia|de orientacao|de forro|de eva|de isopor|de vidro|de ceramica|de granito|de marmore|cervical|oclusa(l|is)|bacteriologica|de cultura)",
  "sinalizacao (viaria|horizontal|vertical|semaforica|de transito|rodoviaria)",
  "urnas? (funeraria|funerarias|mortuarias?|eletronicas?)",
  "tinta acrilica|massa acrilica|resina acrilica|selador acrilico|verniz acrilico|fundo acrilico|acrilico (para|de) pintura",
  "medicamentos?|insumos? hospitalares?"
 ],
 "penalidades": {
  "obras? de (construcao|reforma|ampliacao|engenharia)|construcao de|pavimentacao|recapeamento": 2,
  "locacao de (veiculos?|maquinas pesadas|imovel)": 2,
  "servicos? (continuados?|de limpeza|de vigilancia|de manutencao predial)": 1,
  "generos alimenticios|merenda|alimentacao escolar": 2,
  "(materiais|material) de construcao": 2,
  "servicos? (de |especializados? (de|em) )?engenharia": 2,
  "caminhao|munk|guindaste|retroescavadeira": 2,
  "concessao (de uso|onerosa)|permissao de uso": 3,
  "vigilancia (armada|desarmada|patrimonial|eletronica)|seguranca patrimonial": 2
 }
};
var MODELO_PAINEL = "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>Sideral Licitações - editais para máquina laser</title>\n<style>\n:root{--bg:#0f1218;--card:#171b23;--line:#262c37;--tx:#e8eaed;--mut:#8b93a1;--ac:#ff6a1a;--ac2:#ffb38a;--ok:#3ecf8e;--warn:#f5b942;--bad:#ef5b5b}\n*{box-sizing:border-box}\nbody{margin:0;font:14px/1.45 system-ui,-apple-system,\"Segoe UI\",Roboto,sans-serif;background:var(--bg);color:var(--tx)}\nheader{padding:22px 28px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}\nh1{margin:0;font-size:20px;letter-spacing:.2px}\nh1 span{color:var(--ac)}\n.sub{color:var(--mut);font-size:12.5px;margin-top:3px}\nmain{display:grid;grid-template-columns:270px 1fr;gap:0;min-height:calc(100vh - 70px)}\naside{border-right:1px solid var(--line);padding:18px 20px;position:sticky;top:0;align-self:start;max-height:100vh;overflow:auto}\naside label{display:block;color:var(--mut);font-size:11.5px;text-transform:uppercase;letter-spacing:.6px;margin:14px 0 5px}\ninput,select{width:100%;background:var(--card);border:1px solid var(--line);color:var(--tx);border-radius:7px;padding:8px 9px;font:inherit}\ninput[type=range]{accent-color:var(--ac);padding:0}\ninput:focus,select:focus{outline:1px solid var(--ac);border-color:var(--ac)}\n.row{display:flex;gap:8px}\nbutton{background:var(--card);color:var(--tx);border:1px solid var(--line);border-radius:7px;padding:8px 12px;font:inherit;cursor:pointer}\nbutton:hover{border-color:var(--ac)}\nbutton.pri{background:var(--ac);border-color:var(--ac);color:#140800;font-weight:600}\nsection{padding:18px 26px}\n.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}\n.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}\n.kpi b{display:block;font-size:22px;font-variant-numeric:tabular-nums}\n.kpi small{color:var(--mut)}\n.bars{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}\n.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}\n.box h3{margin:0 0 8px;font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.6px;font-weight:600}\n.bar{display:grid;grid-template-columns:minmax(0,1fr) 120px 34px;gap:8px;align-items:center;font-size:12.5px;padding:2px 0;cursor:pointer}\n.bar:hover .nm{color:var(--ac2)}\n.bar .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.bar .tr{height:7px;background:#232833;border-radius:4px;overflow:hidden}\n.bar .tr i{display:block;height:100%;background:var(--ac);border-radius:4px}\n.bar .n{text-align:right;color:var(--mut);font-variant-numeric:tabular-nums}\n.ed{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-bottom:10px}\n.ed:hover{border-color:#353d4b}\n.top{display:flex;justify-content:space-between;gap:14px}\n.obj{font-weight:600;font-size:14.5px}\n.meta{color:var(--mut);font-size:12.5px;margin-top:4px}\n.val{text-align:right;white-space:nowrap}\n.val b{font-size:16px;font-variant-numeric:tabular-nums}\n.prazo{font-size:12px;margin-top:3px}\n.chips{margin-top:8px;display:flex;flex-wrap:wrap;gap:5px}\n.chip{font-size:11.5px;border:1px solid var(--line);border-radius:999px;padding:2px 8px;color:var(--mut)}\n.chip.c{border-color:#5a3a26;color:var(--ac2)}\n.chip.m{border-color:#2a4b3f;color:var(--ok)}\n.chip.s{border-color:#4a4426;color:var(--warn)}\n.acts{margin-top:9px;display:flex;gap:14px;font-size:12.5px}\na{color:var(--ac2);text-decoration:none}a:hover{text-decoration:underline}\ndetails{margin-top:8px}summary{cursor:pointer;color:var(--mut);font-size:12.5px}\ntable{width:100%;border-collapse:collapse;margin-top:6px;font-size:12.5px}\ntd,th{border-top:1px solid var(--line);padding:5px 6px;text-align:left;vertical-align:top}\nth{color:var(--mut);font-weight:500}\ntd.r,th.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}\n.vazio{color:var(--mut);padding:40px;text-align:center}\n.mais{display:block;margin:14px auto}\n#tf{display:none}\n@media(max-width:900px){main{grid-template-columns:1fr}aside{position:static;max-height:none;border-right:0;border-bottom:1px solid var(--line);padding:6px 16px 14px}.kpis{grid-template-columns:1fr 1fr;gap:8px}.kpi b{font-size:18px}.bars{grid-template-columns:1fr}\n #tf{display:block;width:100%;margin-top:12px}#extra{display:none}aside.aberto #extra{display:block}\n header{padding:16px 16px 12px}section{padding:14px 12px}.ed{padding:12px 13px}\n .top{flex-direction:column;gap:6px}.val{text-align:left;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.val .prazo,.val .meta{margin:0}\n .bar{grid-template-columns:minmax(0,1fr) 90px 28px}}\n</style>\n</head>\n<body>\n<header>\n  <div>\n    <h1>Sideral <span>Licitações</span></h1>\n    <div class=\"sub\" id=\"sub\"></div>\n  </div>\n  <div class=\"row\" style=\"width:auto\">\n    <a href=\"__PLANILHA__\" target=\"_blank\" rel=\"noopener\"><button>Abrir planilha</button></a>\n  </div>\n</header>\n<main>\n<aside>\n  <label>Buscar</label>\n  <input id=\"q\" placeholder=\"troféu, inox, Campinas...\">\n  <label>Situação</label>\n  <select id=\"st\"><option value=\"abertas\">Recebendo propostas</option><option value=\"todas\">Todas</option><option value=\"encerradas\">Encerradas</option></select>\n  <button id=\"tf\" onclick=\"this.parentNode.classList.toggle('aberto');this.textContent=this.parentNode.classList.contains('aberto')?'Menos filtros ▴':'Mais filtros ▾'\">Mais filtros ▾</button>\n  <div id=\"extra\">\n  <label>Categoria</label>\n  <select id=\"cat\"><option value=\"\">Todas</option></select>\n  <label>Máquina</label>\n  <select id=\"maq\"><option value=\"\">Todas</option><option>CO2</option><option>Fibra</option><option>CO2/Fibra</option><option value=\"Máquina\">Venda de máquina</option></select>\n  <label>Estado</label>\n  <select id=\"uf\"><option value=\"\">Brasil inteiro</option></select>\n  <label>Modalidade</label>\n  <select id=\"mod\"><option value=\"\">Todas</option></select>\n  <label>Valor estimado mínimo (R$)</label>\n  <input id=\"vmin\" type=\"number\" min=\"0\" step=\"1000\" placeholder=\"0\">\n  <label>Nota mínima: <span id=\"sv\"></span></label>\n  <input id=\"sc\" type=\"range\" min=\"2\" max=\"12\" step=\"1\">\n  <label>Ordenar por</label>\n  <select id=\"ord\"><option value=\"enc\">Prazo mais próximo</option><option value=\"v\">Maior valor</option><option value=\"s\">Maior nota</option><option value=\"pub\">Mais recentes</option></select>\n  <div class=\"row\" style=\"margin-top:16px\"><button onclick=\"limpar()\" style=\"width:100%\">Limpar filtros</button></div>\n  </div>\n</aside>\n<section>\n  <div class=\"kpis\">\n    <div class=\"kpi\"><b id=\"k1\">0</b><small>editais no filtro</small></div>\n    <div class=\"kpi\"><b id=\"k2\">R$ 0</b><small>valor estimado somado</small></div>\n    <div class=\"kpi\"><b id=\"k3\">0</b><small>encerram em até 7 dias</small></div>\n    <div class=\"kpi\"><b id=\"k4\">0%</b><small>dos editais lidos são de laser</small></div>\n  </div>\n  <div class=\"bars\">\n    <div class=\"box\"><h3>Por categoria</h3><div id=\"bc\"></div></div>\n    <div class=\"box\"><h3>Por estado</h3><div id=\"bu\"></div></div>\n  </div>\n  <div id=\"lista\"></div>\n  <button class=\"mais\" id=\"mais\" onclick=\"lim+=100;render()\">Mostrar mais</button>\n</section>\n</main>\n<script type=\"application/json\" id=\"dados\">__DADOS__</script>\n<script>\nconst D=JSON.parse(document.getElementById('dados').textContent);\nconst E=D.editais, CAT=D.categorias, $=id=>document.getElementById(id);\nconst brl=v=>'R$ '+Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0});\nconst esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));\nconst dt=s=>s?new Date(s):null;\nconst fdt=s=>{const d=dt(s);return d&&!isNaN(d)?d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—'};\nlet lim=100, filtrados=[];\n$('sub').textContent=`${E.length} editais com perfil de laser · ${D.total_lidos.toLocaleString('pt-BR')} lidos no PNCP · publicados de ${D.periodo[0]||'—'} a ${D.periodo[1]||'—'} · atualizado ${D.gerado}`;\nObject.entries(CAT).forEach(([k,v])=>$('cat').insertAdjacentHTML('beforeend',`<option value=\"${k}\">${esc(v)}</option>`));\n[...new Set(E.map(e=>e.uf).filter(Boolean))].sort().forEach(u=>$('uf').insertAdjacentHTML('beforeend',`<option>${u}</option>`));\n[...new Set(E.map(e=>e.mod).filter(Boolean))].sort().forEach(m=>$('mod').insertAdjacentHTML('beforeend',`<option>${esc(m)}</option>`));\n$('sc').value=D.score_padrao;\nfunction prazo(e){const d=dt(e.enc);if(!d||isNaN(d))return '';const dias=(d-Date.now())/864e5;\n if(dias<0)return '<div class=\"prazo\" style=\"color:var(--mut)\">Encerrado</div>';\n const cor=dias<3?'var(--bad)':dias<7?'var(--warn)':'var(--ok)';\n const txt=dias<1?`encerra em ${Math.max(1,Math.round(dias*24))}h`:`encerra em ${Math.floor(dias)} dia${Math.floor(dias)>1?'s':''}`;\n return `<div class=\"prazo\" style=\"color:${cor}\">● ${txt}</div>`}\nfunction filtrar(){\n const q=$('q').value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''),st=$('st').value,c=$('cat').value,m=$('maq').value,u=$('uf').value,mo=$('mod').value,vm=+$('vmin').value||0,sc=+$('sc').value,now=Date.now();\n $('sv').textContent=sc;\n filtrados=E.filter(e=>{\n  if(e.s<sc)return false; if(c&&!e.c.includes(c))return false; if(m&&e.m!==m)return false;\n  if(u&&e.uf!==u)return false; if(mo&&e.mod!==mo)return false; if(vm&&e.v<vm)return false;\n  const d=dt(e.enc),aberta=!d||isNaN(d)||d>=now;\n  if(st==='abertas'&&!aberta)return false; if(st==='encerradas'&&aberta)return false;\n  if(q){const h=(e.o+' '+e.org+' '+e.un+' '+e.mun+' '+e.uf+' '+e.t.join(' ')+' '+e.it.map(i=>i[0]).join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');if(!q.split(/\\s+/).every(w=>h.includes(w)))return false}\n  return true});\n const o=$('ord').value;\n filtrados.sort((a,b)=>o==='v'?b.v-a.v:o==='s'?b.s-a.s||b.v-a.v:o==='pub'?(b.pub>a.pub?1:-1):((a.enc||'9')>(b.enc||'9')?1:-1));\n lim=100;render();\n}\nfunction barras(el,cont,nomes,campo){\n const arr=Object.entries(cont).sort((a,b)=>b[1]-a[1]).slice(0,9),mx=arr.length?arr[0][1]:1;\n el.innerHTML=arr.map(([k,n])=>`<div class=\"bar\" onclick=\"$('${campo}').value='${k}';filtrar()\"><span class=\"nm\">${esc(nomes?nomes[k]||k:k)}</span><span class=\"tr\"><i style=\"width:${n/mx*100}%\"></i></span><span class=\"n\">${n}</span></div>`).join('')||'<div class=\"sub\">—</div>';\n}\nfunction render(){\n const F=filtrados,now=Date.now();\n $('k1').textContent=F.length.toLocaleString('pt-BR');\n $('k2').textContent=brl(F.reduce((s,e)=>s+e.v,0));\n $('k3').textContent=F.filter(e=>{const d=dt(e.enc);return d&&d>=now&&d-now<7*864e5}).length;\n $('k4').textContent=D.total_lidos?(E.filter(e=>e.s>=D.score_padrao).length/D.total_lidos*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':'—';\n const cc={},cu={};F.forEach(e=>{if(e.c[0])cc[e.c[0]]=(cc[e.c[0]]||0)+1;if(e.uf)cu[e.uf]=(cu[e.uf]||0)+1});\n barras($('bc'),cc,CAT,'cat');barras($('bu'),cu,null,'uf');\n $('lista').innerHTML=F.slice(0,lim).map(e=>`<div class=\"ed\"><div class=\"top\"><div>\n  <div class=\"obj\">${esc(e.o)}</div>\n  <div class=\"meta\">${esc(e.org)}${e.un&&e.un!==e.org?' · '+esc(e.un):''} · ${esc(e.mun)}/${esc(e.uf)} · ${esc(e.mod)}${e.srp?' · Registro de preços':''}</div>\n  </div><div class=\"val\"><b>${e.v?brl(e.v):'sem valor'}</b>${prazo(e)}<div class=\"meta\">abre ${fdt(e.ab)}</div></div></div>\n  <div class=\"chips\">${e.c.slice(0,3).map(c=>`<span class=\"chip c\">${esc(CAT[c]||c)}</span>`).join('')}${e.m?`<span class=\"chip m\">${esc(e.m==='Máquina'?'Venda de máquina':'Laser '+e.m)}</span>`:''}<span class=\"chip s\">nota ${e.s}</span>${e.t.slice(0,5).map(t=>`<span class=\"chip\">${esc(t)}</span>`).join('')}</div>\n  ${e.it.length?`<details><summary>${e.it.length} ${e.it.length>1?'itens':'item'} do edital</summary><table><tr><th>Descrição</th><th class=\"r\">Qtd</th><th class=\"r\">Unit. estimado</th></tr>${e.it.map(i=>`<tr><td>${esc(i[0])}</td><td class=\"r\">${i[1]??''} ${esc(i[2]||'')}</td><td class=\"r\">${i[3]!=null?brl(i[3]):''}</td></tr>`).join('')}</table></details>`:''}\n  <div class=\"acts\">${e.lp?`<a href=\"${esc(e.lp)}\" target=\"_blank\" rel=\"noopener\">Ver edital no PNCP ↗</a>`:''}${e.lo?`<a href=\"${esc(e.lo)}\" target=\"_blank\" rel=\"noopener\">Sistema de origem ↗</a>`:''}</div>\n </div>`).join('')||'<div class=\"vazio\">Nenhum edital com esses filtros.</div>';\n $('mais').style.display=F.length>lim?'block':'none';\n}\nfunction limpar(){['q','cat','maq','uf','mod','vmin'].forEach(i=>$(i).value='');$('st').value='abertas';$('sc').value=D.score_padrao;$('ord').value='enc';filtrar()}\nfunction exportar(){\n const cab=['objeto','orgao','unidade','municipio','uf','modalidade','valor_estimado','abertura','encerramento','categoria','maquina','nota','link_pncp'];\n const lin=filtrados.map(e=>[e.o,e.org,e.un,e.mun,e.uf,e.mod,e.v,e.ab,e.enc,CAT[e.c[0]]||'',e.m,e.s,e.lp]);\n const csv='﻿'+[cab,...lin].map(r=>r.map(x=>'\"'+String(x??'').replace(/\"/g,'\"\"')+'\"').join(';')).join('\\n');\n const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='editais_laser.csv';a.click();\n}\n['q','st','cat','maq','uf','mod','vmin','sc','ord'].forEach(i=>$(i).addEventListener('input',filtrar));\nfiltrar();\n</script>\n</body>\n</html>\n";

var BASE = 'https://pncp.gov.br/api/consulta';
var BASE_PNCP = 'https://pncp.gov.br/api/pncp';
var MODALIDADES = {1:'Leilão - Eletrônico',2:'Diálogo Competitivo',3:'Concurso',4:'Concorrência - Eletrônica',5:'Concorrência - Presencial',6:'Pregão - Eletrônico',7:'Pregão - Presencial',8:'Dispensa de Licitação',9:'Inexigibilidade',10:'Manifestação de Interesse',11:'Pré-qualificação',12:'Credenciamento',13:'Leilão - Presencial'};
var ABA_EDITAIS = 'Editais';
var ABA_CONTROLE = 'Controle';
var COLUNAS = ['id','publicacao','encerramento','abertura','uf','municipio','orgao','unidade','modalidade','valor','objeto','nota','categoria','categorias','maquina','termos','link_pncp','link_origem','srp','itens','itens_ok'];
var TZ = 'America/Sao_Paulo';

// ======================= MENU E CONFIGURAÇÃO =======================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Sideral')
    .addItem('Coletar agora', 'coletar')
    .addItem('Reclassificar editais', 'reclassificar')
    .addItem('Configurar / reinstalar agendamento', 'configurar')
    .addToUi();
}

function configurar() {
  var ss = SpreadsheetApp.getActive();
  var ed = ss.getSheetByName(ABA_EDITAIS) || ss.insertSheet(ABA_EDITAIS);
  if (ed.getLastRow() === 0) {
    ed.appendRow(COLUNAS);
    ed.setFrozenRows(1);
    ed.getRange(1, 1, 1, COLUNAS.length).setFontWeight('bold');
  }
  var ct = ss.getSheetByName(ABA_CONTROLE) || ss.insertSheet(ABA_CONTROLE);
  if (ct.getLastRow() === 0) {
    ct.appendRow(['consulta', 'proxima_pagina', 'total_paginas', 'lidos', 'de_laser', 'concluida', 'atualizado_em']);
    ct.setFrozenRows(1);
    ct.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  var padrao = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
  if (padrao && ss.getSheets().length > 2 && padrao.getLastRow() === 0) ss.deleteSheet(padrao);

  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('coletar').timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger('limpar').timeBased().everyDays(1).atHour(3).create();
  log_('Configurado. A coleta roda a cada 15 minutos.');
}

// ============================ COLETA ============================
function coletar() {
  var trava = LockService.getScriptLock();
  if (!trava.tryLock(5000)) { log_('Outra coleta já está rodando.'); return; }
  var inicio = Date.now();
  var resta = function () { return CONFIG.segundosPorExecucao * 1000 - (Date.now() - inicio); };
  try {
    var ss = SpreadsheetApp.getActive();
    var ed = ss.getSheetByName(ABA_EDITAIS), ct = ss.getSheetByName(ABA_CONTROLE);
    if (!ed || !ct) { configurar(); ed = ss.getSheetByName(ABA_EDITAIS); ct = ss.getSheetByName(ABA_CONTROLE); }
    var ids = idsExistentes_(ed);
    var controle = lerControle_(ct);
    var fila = montarFila_(controle);
    var novos = 0, lidos = 0;

    for (var f = 0; f < fila.length && resta() > 60000; f++) {
      var q = fila[f];
      var c = controle[q.chave] || (controle[q.chave] = { linha: 0, pagina: 1, total: 0, lidos: 0, laser: 0, ok: false });
      while (!c.ok && resta() > 60000) {
        var r = pncpGet_(BASE + '/v1/contratacoes/publicacao', {
          dataInicial: q.data, dataFinal: q.data, codigoModalidadeContratacao: q.mod,
          uf: q.uf || null, pagina: c.pagina, tamanhoPagina: 50,
        });
        if (r.parar) { log_('PNCP pediu pausa (' + r.motivo + '). Continua na próxima execução.'); salvarControle_(ct, q.chave, c); return finalizar_(novos, lidos); }
        var dados = r.dados;
        var regs = dados && dados.data ? dados.data : [];
        var linhas = [];
        regs.forEach(function (reg) {
          var e = normalizar_(reg);
          if (ids[e.id]) return;
          var k = classificar(e.objeto, e.info);
          if (k.score >= CONFIG.scoreGuardar) {
            linhas.push(paraLinha_(e, k));
            ids[e.id] = true;
            c.laser++;
          }
        });
        if (linhas.length) ed.getRange(ed.getLastRow() + 1, 1, linhas.length, COLUNAS.length).setValues(linhas);
        novos += linhas.length;
        lidos += regs.length;
        c.lidos = (c.pagina - 1) * 50 + regs.length;  // conta certa mesmo relendo a última página
        c.total = dados ? (dados.totalPaginas || 1) : 0;
        if (!dados || c.pagina >= c.total) {
          c.ok = q.data < hoje_();  // o dia de hoje ainda vai receber editais
          if (!c.ok) { c.pagina = c.total ? c.total : 1; salvarControle_(ct, q.chave, c); break; }
        } else {
          c.pagina++;
        }
        salvarControle_(ct, q.chave, c);
      }
    }
    if (resta() > 60000) baixarItens_(ed, resta);
    return finalizar_(novos, lidos);
  } finally {
    trava.releaseLock();
  }
}

function finalizar_(novos, lidos) {
  log_('Execução: ' + lidos + ' editais lidos, ' + novos + ' novos de laser.');
  return { lidos: lidos, novos: novos };
}

function montarFila_(controle) {
  var fila = [];
  var ufs = CONFIG.ufs.length ? CONFIG.ufs : [''];
  for (var i = CONFIG.diasParaTras - 1; i >= 0; i--) {
    var d = Utilities.formatDate(new Date(Date.now() - i * 864e5), TZ, 'yyyyMMdd');
    CONFIG.modalidades.forEach(function (mod) {
      ufs.forEach(function (uf) {
        var chave = d + '|' + mod + '|' + (uf || 'BR');
        var c = controle[chave];
        if (!c || !c.ok) fila.push({ chave: chave, data: d, mod: mod, uf: uf });
      });
    });
  }
  return fila;
}

function baixarItens_(ed, resta) {
  var n = ed.getLastRow() - 1;
  if (n < 1) return;
  var col = function (nome) { return COLUNAS.indexOf(nome); };
  var vals = ed.getRange(2, 1, n, COLUNAS.length).getValues();
  var agora = new Date();
  var candidatos = [];
  vals.forEach(function (v, i) {
    var enc = v[col('encerramento')] ? new Date(v[col('encerramento')]) : null;
    if (!v[col('itens_ok')] && v[col('nota')] >= CONFIG.scorePainel && (!enc || enc >= agora)) candidatos.push(i);
  });
  candidatos.sort(function (a, b) { return vals[b][col('nota')] - vals[a][col('nota')] || vals[b][col('valor')] - vals[a][col('valor')]; });
  candidatos.slice(0, CONFIG.itensPorExecucao).forEach(function (i) {
    if (resta() < 45000) return;
    var partes = String(vals[i][col('link_pncp')]).split('/editais/')[1];
    if (!partes) return;
    var p = partes.split('/');
    var r = pncpGet_(BASE_PNCP + '/v1/orgaos/' + p[0] + '/compras/' + p[1] + '/' + p[2] + '/itens', { pagina: 1, tamanhoPagina: 100 });
    if (r.parar) return;
    var lista = Array.isArray(r.dados) ? r.dados : (r.dados && r.dados.data) || [];
    var itens = lista.slice(0, 30).map(function (it) {
      return [String(it.descricao || '').slice(0, 300), it.quantidade, it.unidadeMedida || '', it.valorUnitarioEstimado];
    });
    var k = classificar(vals[i][col('objeto')], itens.map(function (x) { return x[0]; }).join(' . '));
    var linha = i + 2;
    ed.getRange(linha, col('nota') + 1, 1, 4).setValues([[k.score, nomeCat_(k.categorias[0]), JSON.stringify(k.categorias), k.maquina]]);
    ed.getRange(linha, col('termos') + 1).setValue(k.termos.join(', '));
    ed.getRange(linha, col('itens') + 1, 1, 2).setValues([[JSON.stringify(itens), 1]]);
  });
}

// ===================== PNCP: chamadas e formato =====================
function pncpGet_(url, params) {
  var qs = Object.keys(params).filter(function (k) { return params[k] !== null && params[k] !== ''; })
    .map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  var resp;
  try {
    resp = UrlFetchApp.fetch(url + '?' + qs, { muteHttpExceptions: true, headers: { Accept: 'application/json' } });
  } catch (err) {
    return { parar: true, motivo: String(err).slice(0, 120) };
  }
  var cod = resp.getResponseCode();
  if (cod === 204) return { dados: null };
  if (cod === 200) {
    try { return { dados: JSON.parse(resp.getContentText()) }; }
    catch (e) { return { parar: true, motivo: 'resposta não é JSON' }; }
  }
  if (cod === 429 || cod >= 500) return { parar: true, motivo: 'HTTP ' + cod };
  log_('HTTP ' + cod + ' em ' + url + ': ' + resp.getContentText().slice(0, 200));
  return { dados: null };
}

function normalizar_(reg) {
  var org = reg.orgaoEntidade || {}, uni = reg.unidadeOrgao || {};
  var cnpj = org.cnpj || '', ano = reg.anoCompra, seq = reg.sequencialCompra;
  return {
    id: reg.numeroControlePNCP || (cnpj + '-' + ano + '-' + seq),
    orgao: org.razaoSocial || '', unidade: uni.nomeUnidade || '',
    uf: uni.ufSigla || '', municipio: uni.municipioNome || '',
    modalidade: reg.modalidadeNome || MODALIDADES[reg.modalidadeId] || '',
    srp: reg.srp ? 1 : 0,
    objeto: String(reg.objetoCompra || '').trim(),
    info: String(reg.informacaoComplementar || '').trim().slice(0, 2000),
    valor: reg.valorTotalEstimado || 0,
    publicacao: reg.dataPublicacaoPncp || '', abertura: reg.dataAberturaProposta || '',
    encerramento: reg.dataEncerramentoProposta || '',
    link_origem: reg.linkSistemaOrigem || '',
    link_pncp: cnpj && ano && seq ? 'https://pncp.gov.br/app/editais/' + cnpj + '/' + ano + '/' + seq : '',
  };
}

function txt_(s) { s = String(s || ''); return /^[=+\-@]/.test(s) ? "'" + s : s; }

function paraLinha_(e, k) {
  return [e.id, e.publicacao, e.encerramento, e.abertura, e.uf, txt_(e.municipio), txt_(e.orgao), txt_(e.unidade),
    e.modalidade, e.valor, txt_(e.objeto), k.score, nomeCat_(k.categorias[0]), JSON.stringify(k.categorias),
    k.maquina, k.termos.join(', '), e.link_pncp, e.link_origem, e.srp, '', ''];
}

// ======================== CLASSIFICADOR ========================
var _rx = null;
function compilar_() {
  if (_rx) return _rx;
  var b = function (p) { return new RegExp('(?<![a-z0-9])(?:' + p + ')(?![a-z0-9])', 'g'); };
  _rx = { cats: {}, excl: TERMOS.exclusoes.map(b), pen: [] };
  Object.keys(TERMOS.categorias).forEach(function (ch) {
    var t = TERMOS.categorias[ch].termos;
    _rx.cats[ch] = Object.keys(t).map(function (p) { return { rx: new RegExp('(?<![a-z0-9])(?:' + p + ')(?![a-z0-9])'), peso: t[p] }; });
  });
  Object.keys(TERMOS.penalidades).forEach(function (p) { _rx.pen.push({ rx: new RegExp('(?<![a-z0-9])(?:' + p + ')(?![a-z0-9])'), peso: TERMOS.penalidades[p] }); });
  return _rx;
}

function normalizarTexto_(t) {
  t = String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return ' ' + t.replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
}

function classificar() {
  var R = compilar_();
  var partes = Array.prototype.slice.call(arguments).filter(function (x) { return x; });
  var txt = normalizarTexto_(partes.join(' . '));
  R.excl.forEach(function (rx) { txt = txt.replace(rx, ' '); });
  var porCat = {}, achados = [];
  Object.keys(R.cats).forEach(function (ch) {
    var pts = 0;
    R.cats[ch].forEach(function (t) {
      var m = txt.match(t.rx);
      if (m) { pts += t.peso; achados.push(m[0].trim()); }
    });
    if (pts) porCat[ch] = pts;
  });
  var ord = Object.keys(porCat).sort(function (a, b) { return porCat[b] - porCat[a]; });
  if (!ord.length) return { score: 0, categorias: [], maquina: '', termos: [] };
  var score = porCat[ord[0]] + Math.floor(ord.slice(1).reduce(function (s, c) { return s + porCat[c]; }, 0) / 2);
  R.pen.forEach(function (p) { if (p.rx.test(txt)) score -= p.peso; });
  score = Math.max(score, 0);
  var maqs = {};
  ord.forEach(function (c) { if (porCat[c] >= 2) maqs[TERMOS.categorias[c].maquina] = 1; });
  if (!Object.keys(maqs).length) maqs[TERMOS.categorias[ord[0]].maquina] = 1;
  var maquina = maqs['Máquina'] ? 'Máquina' : (maqs['CO2/Fibra'] || (maqs.CO2 && maqs.Fibra)) ? 'CO2/Fibra' : Object.keys(maqs)[0];
  var termos = achados.filter(function (x, i) { return achados.indexOf(x) === i; }).slice(0, 12);
  return { score: score, categorias: ord, maquina: maquina, termos: termos };
}

function nomeCat_(ch) { return ch && TERMOS.categorias[ch] ? TERMOS.categorias[ch].nome : ''; }

function reclassificar() {
  var ed = SpreadsheetApp.getActive().getSheetByName(ABA_EDITAIS);
  var n = ed.getLastRow() - 1;
  if (n < 1) return;
  var col = function (nome) { return COLUNAS.indexOf(nome); };
  var vals = ed.getRange(2, 1, n, COLUNAS.length).getValues();
  vals.forEach(function (v) {
    var itens = [];
    try { itens = JSON.parse(v[col('itens')] || '[]'); } catch (e) {}
    var k = classificar(v[col('objeto')], itens.map(function (x) { return x[0]; }).join(' . '));
    v[col('nota')] = k.score; v[col('categoria')] = nomeCat_(k.categorias[0]);
    v[col('categorias')] = JSON.stringify(k.categorias); v[col('maquina')] = k.maquina; v[col('termos')] = k.termos.join(', ');
  });
  ed.getRange(2, 1, n, COLUNAS.length).setValues(vals);
  log_(n + ' editais reclassificados.');
}

// ========================= PLANILHA =========================
function idsExistentes_(ed) {
  var ids = {};
  var n = ed.getLastRow() - 1;
  if (n > 0) ed.getRange(2, 1, n, 1).getValues().forEach(function (v) { ids[v[0]] = true; });
  return ids;
}

function lerControle_(ct) {
  var mapa = {};
  var n = ct.getLastRow() - 1;
  if (n < 1) return mapa;
  ct.getRange(2, 1, n, 6).getValues().forEach(function (v, i) {
    mapa[String(v[0])] = { linha: i + 2, pagina: Number(v[1]) || 1, total: Number(v[2]) || 0, lidos: Number(v[3]) || 0, laser: Number(v[4]) || 0, ok: v[5] === true || v[5] === 'TRUE' };
  });
  return mapa;
}

function salvarControle_(ct, chave, c) {
  var linha = [chave, c.pagina, c.total, c.lidos, c.laser, c.ok, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm')];
  if (!c.linha) { c.linha = ct.getLastRow() + 1; }
  ct.getRange(c.linha, 1, 1, linha.length).setValues([linha]);
}

function limpar() {
  var ss = SpreadsheetApp.getActive();
  var ed = ss.getSheetByName(ABA_EDITAIS);
  var n = ed.getLastRow() - 1;
  if (n < 1) return;
  var limite = new Date(Date.now() - CONFIG.diasManter * 864e5);
  var iEnc = COLUNAS.indexOf('encerramento'), iPub = COLUNAS.indexOf('publicacao');
  var vals = ed.getRange(2, 1, n, COLUNAS.length).getValues();
  var manter = vals.filter(function (v) { var d = new Date(v[iEnc] || v[iPub]); return isNaN(d) || d >= limite; });
  if (manter.length === vals.length) return;
  ed.getRange(2, 1, n, COLUNAS.length).clearContent();
  if (manter.length) ed.getRange(2, 1, manter.length, COLUNAS.length).setValues(manter);
  log_((vals.length - manter.length) + ' editais antigos apagados.');
}

function hoje_() { return Utilities.formatDate(new Date(), TZ, 'yyyyMMdd'); }
function log_(msg) { console.log(msg); }

// =========================== PAINEL ===========================
function doGet() {
  var html = MODELO_PAINEL
    .replace('__PLANILHA__', function () { return SpreadsheetApp.getActive().getUrl(); })
    .replace('__DADOS__', function () { return JSON.stringify(dadosPainel_()).replace(/<\//g, '<\\/'); });
  return HtmlService.createHtmlOutput(html)
    .setTitle('Sideral Licitações')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function dadosPainel_() {
  var ss = SpreadsheetApp.getActive();
  var ed = ss.getSheetByName(ABA_EDITAIS), ct = ss.getSheetByName(ABA_CONTROLE);
  var col = function (nome) { return COLUNAS.indexOf(nome); };
  var iso = function (x) { return x instanceof Date ? Utilities.formatDate(x, TZ, "yyyy-MM-dd'T'HH:mm") : String(x || '').slice(0, 16); };
  var editais = [];
  var n = ed ? ed.getLastRow() - 1 : 0;
  if (n > 0) ed.getRange(2, 1, n, COLUNAS.length).getValues().forEach(function (v) {
    var itens = [], cats = [];
    try { itens = JSON.parse(v[col('itens')] || '[]'); } catch (e) {}
    try { cats = JSON.parse(v[col('categorias')] || '[]'); } catch (e) {}
    editais.push({
      id: v[col('id')], o: v[col('objeto')], org: v[col('orgao')], un: v[col('unidade')], uf: v[col('uf')],
      mun: v[col('municipio')], mod: v[col('modalidade')], v: Number(v[col('valor')]) || 0,
      pub: iso(v[col('publicacao')]), ab: iso(v[col('abertura')]), enc: iso(v[col('encerramento')]),
      s: Number(v[col('nota')]) || 0, c: cats, m: v[col('maquina')],
      t: String(v[col('termos')] || '').split(', ').filter(String), lp: v[col('link_pncp')], lo: v[col('link_origem')],
      srp: v[col('srp')], it: itens,
    });
  });
  var lidos = 0, datas = [];
  var m = ct ? ct.getLastRow() - 1 : 0;
  if (m > 0) ct.getRange(2, 1, m, 4).getValues().forEach(function (v) { lidos += Number(v[3]) || 0; datas.push(String(v[0]).split('|')[0]); });
  datas.sort();
  var fmt = function (d) { return d ? d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8) : ''; };
  var cats = {};
  Object.keys(TERMOS.categorias).forEach(function (k) { cats[k] = TERMOS.categorias[k].nome; });
  return {
    editais: editais, categorias: cats, total_lidos: Math.max(lidos, editais.length),
    periodo: [fmt(datas[0]), fmt(datas[datas.length - 1])],
    gerado: Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm'), score_padrao: CONFIG.scorePainel,
  };
}
