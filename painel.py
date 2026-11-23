"""Gera painel.html: um arquivo único, abre no navegador, sem servidor."""
from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

import banco
import termos_laser as T

SCORE_MINIMO = T.SCORE_MINIMO
ARQUIVO = Path(__file__).with_name("painel.html")


def _dados(con, min_score: int) -> dict:
    itens: dict[str, list] = {}
    for r in con.execute("SELECT * FROM itens ORDER BY edital_id, numero"):
        itens.setdefault(r["edital_id"], []).append(
            [r["descricao"], r["quantidade"], r["unidade"], r["valor_unitario"]])

    editais = []
    for r in con.execute("SELECT * FROM editais WHERE score >= ? ORDER BY encerramento", (min_score,)):
        editais.append({
            "id": r["id"], "o": r["objeto"], "org": r["orgao"], "un": r["unidade"],
            "uf": r["uf"], "mun": r["municipio"], "mod": r["modalidade"], "v": r["valor"] or 0,
            "pub": (r["publicacao"] or "")[:16], "ab": (r["abertura"] or "")[:16],
            "enc": (r["encerramento"] or "")[:16], "s": r["score"],
            "c": json.loads(r["categorias"] or "[]"), "m": r["maquina"] or "",
            "t": json.loads(r["termos"] or "[]"), "lp": r["link_pncp"], "lo": r["link_origem"],
            "srp": r["srp"], "it": itens.get(r["id"], [])[:30],
        })
    total = banco.total_lidos(con)
    periodo = con.execute("SELECT MIN(publicacao), MAX(publicacao) FROM editais").fetchone()
    return {
        "editais": editais,
        "categorias": {k: v["nome"] for k, v in T.CATEGORIAS.items()},
        "total_lidos": total,
        "periodo": [str(periodo[0] or "")[:10], str(periodo[1] or "")[:10]],
        "gerado": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "score_padrao": SCORE_MINIMO,
    }


def gerar(min_score: int = 2, con=None, destino: Path = ARQUIVO) -> Path:
    con = con or banco.conectar()
    dados = json.dumps(_dados(con, min_score), ensure_ascii=False).replace("</", "<\\/")
    html = MODELO.replace("__DADOS__", dados)
    destino.write_text(html, encoding="utf-8")
    logo = Path(__file__).with_name("assets") / "logo.png"
    if logo.exists() and destino.parent.resolve() != logo.parent.resolve():
        shutil.copy(logo, destino.parent / "logo.png")
    return destino


MODELO = r"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sideral Licitações · editais para quem tem máquina laser</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;800&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
<style>
/* Identidade Sideral: cinza claro #EAE9E8, cinza escuro #9D9D9C, amarelo #FFBB27, preto e branco.
   Montserrat ExtraBold (títulos), Montserrat SemiBold (subtítulos), Roboto (texto). */
:root{--bg:#EAE9E8;--card:#fff;--line:#d9d7d5;--tx:#000;--mut:#5f5f5e;--cinza:#9D9D9C;--ac:#FFBB27;--ac2:#000;--ok:#1f7a4d;--warn:#b26b00;--bad:#c8321f;
 --tit:"Montserrat",system-ui,sans-serif;--txt:"Roboto",system-ui,-apple-system,"Segoe UI",sans-serif}
*{box-sizing:border-box}
body{margin:0;font:400 14px/1.5 var(--txt);background:var(--bg);color:var(--tx)}
header{background:#000;color:#fff;padding:18px 28px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;position:relative;overflow:hidden;border-bottom:6px solid var(--ac)}
header::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-55deg,transparent 0 22px,rgba(255,255,255,.035) 22px 24px);pointer-events:none}
.marca{display:flex;align-items:center;gap:18px;position:relative}
.marca img{height:46px;width:auto;display:block}
.marca .wm{display:none;font:800 22px/1 var(--tit);letter-spacing:1px}
.marca .wm small{display:block;font:600 9.5px/1.4 var(--tit);letter-spacing:2.2px;color:var(--cinza);margin-top:3px}
.divi{width:2px;align-self:stretch;background:#333}
h1{margin:0;font:800 22px/1.1 var(--tit);color:var(--ac);text-transform:uppercase;letter-spacing:.5px}
.sub{color:#bdbdbc;font:300 12.5px/1.45 var(--txt);margin-top:4px;max-width:720px}
main{display:grid;grid-template-columns:280px 1fr;min-height:calc(100vh - 90px)}
aside{padding:20px 22px;position:sticky;top:0;align-self:start;max-height:100vh;overflow:auto;border-right:1px solid var(--line)}
aside label{display:block;color:var(--mut);font:600 11px/1 var(--tit);text-transform:uppercase;letter-spacing:.9px;margin:16px 0 6px}
input,select{width:100%;background:#fff;border:1.5px solid var(--line);color:var(--tx);border-radius:6px;padding:9px 10px;font:400 14px var(--txt)}
input[type=range]{accent-color:#000;padding:0;border:0;background:transparent}
input:focus,select:focus{outline:none;border-color:#000;box-shadow:0 0 0 3px rgba(255,187,39,.45)}
.row{display:flex;gap:8px}
button{background:#fff;color:#000;border:1.5px solid #000;border-radius:6px;padding:9px 14px;font:600 13px var(--tit);cursor:pointer;letter-spacing:.2px}
button:hover{background:#000;color:#fff}
header button{background:var(--ac);border-color:var(--ac);color:#000;position:relative;text-transform:uppercase;font-weight:800;letter-spacing:.6px}
header button:hover{background:#fff;border-color:#fff;color:#000}
section{padding:20px 26px}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}
.kpi{background:#fff;border-radius:8px;padding:14px 16px;border-top:4px solid #000}
.kpi:first-child{background:#000;color:#fff;border-top-color:var(--ac)}
.kpi:first-child b{color:var(--ac)}
.kpi:first-child small{color:#bdbdbc}
.kpi b{display:block;font:800 24px/1.15 var(--tit);font-variant-numeric:tabular-nums}
.kpi small{color:var(--mut);font-size:12.5px}
.bars{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
.box{background:#fff;border-radius:8px;padding:14px 16px}
.box h3{margin:0 0 10px;font:800 12px/1 var(--tit);text-transform:uppercase;letter-spacing:1px}
.bar{display:grid;grid-template-columns:minmax(0,1fr) 130px 34px;gap:10px;align-items:center;font-size:13px;padding:3px 0;cursor:pointer}
.bar:hover .nm{text-decoration:underline;text-decoration-color:var(--ac);text-decoration-thickness:3px}
.bar .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar .tr{height:9px;background:#efeeed;border-radius:2px;overflow:hidden}
.bar .tr i{display:block;height:100%;background:var(--ac)}
.bar .n{text-align:right;font:600 12.5px var(--tit);font-variant-numeric:tabular-nums}
.ed{background:#fff;border-radius:8px;padding:16px 18px;margin-bottom:10px;border-left:5px solid var(--ac);transition:box-shadow .15s}
.ed:hover{box-shadow:0 4px 18px rgba(0,0,0,.08)}
.top{display:flex;justify-content:space-between;gap:16px}
.obj{font:600 15px/1.35 var(--tit)}
.meta{color:var(--mut);font-size:12.5px;margin-top:5px}
.val{text-align:right;white-space:nowrap}
.val b{font:800 17px var(--tit);font-variant-numeric:tabular-nums}
.prazo{font:600 12px var(--tit);margin-top:4px}
.chips{margin-top:10px;display:flex;flex-wrap:wrap;gap:6px}
.chip{font-size:11.5px;border-radius:4px;padding:3px 8px;background:#f1f0ef;color:#3d3d3c}
.chip.c{background:var(--ac);color:#000;font:600 11.5px var(--tit)}
.chip.m{background:#000;color:#fff;font:600 11.5px var(--tit)}
.chip.s{background:#fff;color:#000;border:1.5px solid #000;font:600 11.5px var(--tit)}
.acts{margin-top:11px;display:flex;gap:18px;font:600 12.5px var(--tit)}
a{color:#000;text-decoration:underline;text-decoration-color:var(--ac);text-decoration-thickness:3px;text-underline-offset:3px}
a:hover{background:var(--ac)}
details{margin-top:10px}summary{cursor:pointer;color:var(--mut);font:600 12.5px var(--tit)}
table{width:100%;border-collapse:collapse;margin-top:6px;font-size:12.5px}
td,th{border-top:1px solid var(--line);padding:6px;text-align:left;vertical-align:top}
th{color:var(--mut);font:600 11px var(--tit);text-transform:uppercase;letter-spacing:.6px}
td.r,th.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.vazio{color:var(--mut);padding:40px;text-align:center;background:#fff;border-radius:8px}
.mais{display:block;margin:16px auto}
footer{background:#000;color:#bdbdbc;padding:18px 28px;font:300 12.5px var(--txt);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
footer b{color:#fff;font:800 13px var(--tit);letter-spacing:.3px}
footer b span{color:var(--ac)}
#tf{display:none}
@media(max-width:900px){main{grid-template-columns:1fr}aside{position:static;max-height:none;border-right:0;border-bottom:1px solid var(--line);padding:6px 16px 16px}.kpis{grid-template-columns:1fr 1fr;gap:8px}.kpi b{font-size:19px}.bars{grid-template-columns:1fr}
 #tf{display:block;width:100%;margin-top:14px}#extra{display:none}aside.aberto #extra{display:block}
 header{padding:14px 16px}.marca img{height:36px}h1{font-size:18px}.divi{display:none}.marca{gap:12px;flex-wrap:wrap}
 section{padding:14px 12px}.ed{padding:13px 14px}
 .top{flex-direction:column;gap:6px}.val{text-align:left;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.val .prazo,.val .meta{margin:0}
 .bar{grid-template-columns:minmax(0,1fr) 90px 28px}}
</style>
</head>
<body>
<header>
  <div class="marca">
    <img src="logo.png" alt="Sideral Máquinas" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
    <div class="wm">SIDERAL<small>MÁQUINA DE FAZER DINHEIRO</small></div>
    <span class="divi"></span>
    <div>
      <h1>Licitações</h1>
      <div class="sub" id="sub"></div>
    </div>
  </div>
  <div class="row" style="width:auto">
    <button onclick="exportar()">Exportar CSV</button>
  </div>
</header>
<main>
<aside>
  <label>Buscar</label>
  <input id="q" placeholder="troféu, inox, Campinas...">
  <label>Situação</label>
  <select id="st"><option value="abertas">Recebendo propostas</option><option value="todas">Todas</option><option value="encerradas">Encerradas</option></select>
  <button id="tf" onclick="this.parentNode.classList.toggle('aberto');this.textContent=this.parentNode.classList.contains('aberto')?'Menos filtros ▴':'Mais filtros ▾'">Mais filtros ▾</button>
  <div id="extra">
  <label>Categoria</label>
  <select id="cat"><option value="">Todas</option></select>
  <label>Máquina</label>
  <select id="maq"><option value="">Todas</option><option>CO2</option><option>Fibra</option><option>CO2/Fibra</option><option value="Máquina">Venda de máquina</option></select>
  <label>Estado</label>
  <select id="uf"><option value="">Brasil inteiro</option></select>
  <label>Modalidade</label>
  <select id="mod"><option value="">Todas</option></select>
  <label>Valor estimado mínimo (R$)</label>
  <input id="vmin" type="number" min="0" step="1000" placeholder="0">
  <label>Nota mínima: <span id="sv"></span></label>
  <input id="sc" type="range" min="2" max="12" step="1">
  <label>Ordenar por</label>
  <select id="ord"><option value="enc">Prazo mais próximo</option><option value="v">Maior valor</option><option value="s">Maior nota</option><option value="pub">Mais recentes</option></select>
  <div class="row" style="margin-top:16px"><button onclick="limpar()" style="width:100%">Limpar filtros</button></div>
  </div>
</aside>
<section>
  <div class="kpis">
    <div class="kpi"><b id="k1">0</b><small>editais no filtro</small></div>
    <div class="kpi"><b id="k2">R$ 0</b><small>valor estimado somado</small></div>
    <div class="kpi"><b id="k3">0</b><small>encerram em até 7 dias</small></div>
    <div class="kpi"><b id="k4">0%</b><small>dos editais lidos são de laser</small></div>
  </div>
  <div class="bars">
    <div class="box"><h3>Por categoria</h3><div id="bc"></div></div>
    <div class="box"><h3>Por estado</h3><div id="bu"></div></div>
  </div>
  <div id="lista"></div>
  <button class="mais" id="mais" onclick="lim+=100;render()">Mostrar mais</button>
</section>
</main>
<footer><b>SIDERAL <span>MÁQUINAS</span></b><span>Qualquer um vende máquina. Nós entregamos negócio.</span><span>Dados públicos do PNCP · confira sempre o edital oficial</span></footer>
<script type="application/json" id="dados">__DADOS__</script>
<script>
const D=JSON.parse(document.getElementById('dados').textContent);
const E=D.editais, CAT=D.categorias, $=id=>document.getElementById(id);
const brl=v=>'R$ '+Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dt=s=>s?new Date(s):null;
const fdt=s=>{const d=dt(s);return d&&!isNaN(d)?d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—'};
let lim=100, filtrados=[];
const fd=d=>d?d.split('-').reverse().join('/'):'—';$('sub').textContent=`Editais para quem tem máquina laser · ${D.total_lidos.toLocaleString('pt-BR')} editais analisados de ${fd(D.periodo[0])} a ${fd(D.periodo[1])} · atualizado ${D.gerado}`;
Object.entries(CAT).forEach(([k,v])=>$('cat').insertAdjacentHTML('beforeend',`<option value="${k}">${esc(v)}</option>`));
[...new Set(E.map(e=>e.uf).filter(Boolean))].sort().forEach(u=>$('uf').insertAdjacentHTML('beforeend',`<option>${u}</option>`));
[...new Set(E.map(e=>e.mod).filter(Boolean))].sort().forEach(m=>$('mod').insertAdjacentHTML('beforeend',`<option>${esc(m)}</option>`));
$('sc').value=D.score_padrao;
function prazo(e){const d=dt(e.enc);if(!d||isNaN(d))return '';const dias=(d-Date.now())/864e5;
 if(dias<0)return '<div class="prazo" style="color:var(--mut)">Encerrado</div>';
 const cor=dias<3?'var(--bad)':dias<7?'var(--warn)':'var(--ok)';
 const txt=dias<1?`encerra em ${Math.max(1,Math.round(dias*24))}h`:`encerra em ${Math.floor(dias)} dia${Math.floor(dias)>1?'s':''}`;
 return `<div class="prazo" style="color:${cor}">● ${txt}</div>`}
function filtrar(){
 const q=$('q').value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''),st=$('st').value,c=$('cat').value,m=$('maq').value,u=$('uf').value,mo=$('mod').value,vm=+$('vmin').value||0,sc=+$('sc').value,now=Date.now();
 $('sv').textContent=sc;
 filtrados=E.filter(e=>{
  if(e.s<sc)return false; if(c&&!e.c.includes(c))return false; if(m&&e.m!==m)return false;
  if(u&&e.uf!==u)return false; if(mo&&e.mod!==mo)return false; if(vm&&e.v<vm)return false;
  const d=dt(e.enc),aberta=!d||isNaN(d)||d>=now;
  if(st==='abertas'&&!aberta)return false; if(st==='encerradas'&&aberta)return false;
  if(q){const h=(e.o+' '+e.org+' '+e.un+' '+e.mun+' '+e.uf+' '+e.t.join(' ')+' '+e.it.map(i=>i[0]).join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');if(!q.split(/\s+/).every(w=>h.includes(w)))return false}
  return true});
 const o=$('ord').value;
 filtrados.sort((a,b)=>o==='v'?b.v-a.v:o==='s'?b.s-a.s||b.v-a.v:o==='pub'?(b.pub>a.pub?1:-1):((a.enc||'9')>(b.enc||'9')?1:-1));
 lim=100;render();
}
function barras(el,cont,nomes,campo){
 const arr=Object.entries(cont).sort((a,b)=>b[1]-a[1]).slice(0,9),mx=arr.length?arr[0][1]:1;
 el.innerHTML=arr.map(([k,n])=>`<div class="bar" onclick="$('${campo}').value='${k}';filtrar()"><span class="nm">${esc(nomes?nomes[k]||k:k)}</span><span class="tr"><i style="width:${n/mx*100}%"></i></span><span class="n">${n}</span></div>`).join('')||'<div class="sub">—</div>';
}
function render(){
 const F=filtrados,now=Date.now();
 $('k1').textContent=F.length.toLocaleString('pt-BR');
 $('k2').textContent=brl(F.reduce((s,e)=>s+e.v,0));
 $('k3').textContent=F.filter(e=>{const d=dt(e.enc);return d&&d>=now&&d-now<7*864e5}).length;
 $('k4').textContent=D.total_lidos?(E.filter(e=>e.s>=D.score_padrao).length/D.total_lidos*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':'—';
 const cc={},cu={};F.forEach(e=>{if(e.c[0])cc[e.c[0]]=(cc[e.c[0]]||0)+1;if(e.uf)cu[e.uf]=(cu[e.uf]||0)+1});
 barras($('bc'),cc,CAT,'cat');barras($('bu'),cu,null,'uf');
 $('lista').innerHTML=F.slice(0,lim).map(e=>`<div class="ed"><div class="top"><div>
  <div class="obj">${esc(e.o)}</div>
  <div class="meta">${esc(e.org)}${e.un&&e.un!==e.org?' · '+esc(e.un):''} · ${esc(e.mun)}/${esc(e.uf)} · ${esc(e.mod)}${e.srp?' · Registro de preços':''}</div>
  </div><div class="val"><b>${e.v?brl(e.v):'sem valor'}</b>${prazo(e)}<div class="meta">abre ${fdt(e.ab)}</div></div></div>
  <div class="chips">${e.c.slice(0,3).map(c=>`<span class="chip c">${esc(CAT[c]||c)}</span>`).join('')}${e.m?`<span class="chip m">${esc(e.m==='Máquina'?'Oportunidade: venda de máquina':'Laser '+e.m)}</span>`:''}<span class="chip s">nota ${e.s}</span>${e.t.slice(0,5).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>
  ${e.it.length?`<details><summary>${e.it.length} ${e.it.length>1?'itens':'item'} do edital</summary><table><tr><th>Descrição</th><th class="r">Qtd</th><th class="r">Unit. estimado</th></tr>${e.it.map(i=>`<tr><td>${esc(i[0])}</td><td class="r">${i[1]??''} ${esc(i[2]||'')}</td><td class="r">${i[3]!=null?brl(i[3]):''}</td></tr>`).join('')}</table></details>`:''}
  <div class="acts">${e.lp?`<a href="${esc(e.lp)}" target="_blank" rel="noopener">Ver edital no PNCP ↗</a>`:''}${e.lo?`<a href="${esc(e.lo)}" target="_blank" rel="noopener">Sistema de origem ↗</a>`:''}</div>
 </div>`).join('')||'<div class="vazio">Nenhum edital com esses filtros.</div>';
 $('mais').style.display=F.length>lim?'block':'none';
}
function limpar(){['q','cat','maq','uf','mod','vmin'].forEach(i=>$(i).value='');$('st').value='abertas';$('sc').value=D.score_padrao;$('ord').value='enc';filtrar()}
function exportar(){
 const cab=['objeto','orgao','unidade','municipio','uf','modalidade','valor_estimado','abertura','encerramento','categoria','maquina','nota','link_pncp'];
 const lin=filtrados.map(e=>[e.o,e.org,e.un,e.mun,e.uf,e.mod,e.v,e.ab,e.enc,CAT[e.c[0]]||'',e.m,e.s,e.lp]);
 const csv='﻿'+[cab,...lin].map(r=>r.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(';')).join('\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='editais_laser.csv';a.click();
}
['q','st','cat','maq','uf','mod','vmin','sc','ord'].forEach(i=>$(i).addEventListener('input',filtrar));
filtrar();
</script>
</body>
</html>
"""
