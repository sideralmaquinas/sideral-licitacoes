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

var TERMOS = __TERMOS__;
var MODELO_PAINEL = __MODELO__;

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
