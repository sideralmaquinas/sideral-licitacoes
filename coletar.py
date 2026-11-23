"""Ferramenta Sideral Licitações - linha de comando.

Exemplos:
  python coletar.py publicadas --dias 7            # editais publicados nos últimos 7 dias
  python coletar.py publicadas --dias 30 --uf SP MG
  python coletar.py abertas                        # tudo que está recebendo proposta agora
  python coletar.py itens --limite 100             # baixa os itens dos melhores editais
  python coletar.py reclassificar                  # reaplica termos_laser.py no banco
  python coletar.py resumo                         # números do mercado
  python coletar.py painel                         # gera e abre painel.html
"""
from __future__ import annotations

import argparse
import json
import sys
import webbrowser
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path

import banco
import painel
from classificador import classificar, nome_categoria
from pncp import MODALIDADES, MODALIDADES_PADRAO, PNCP, ErroPNCP, normalizar

try:  # acentos no terminal do Windows
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def _processar_pagina(con, dados: dict) -> tuple[int, int]:
    registros = dados.get("data", []) if isinstance(dados, dict) else (dados or [])
    achados = 0
    for reg in registros:
        e = normalizar(reg)
        c = classificar(e["objeto"], e["info"])
        banco.salvar_edital(con, e, c)
        if c["score"] >= painel.SCORE_MINIMO:
            achados += 1
            print(f"    + [{c['score']:>2}] {e['uf']} {e['municipio'][:18]:<18} {e['objeto'][:80]}")
    con.commit()
    return len(registros), achados


def _paginar(con, buscar, rotulo: str) -> tuple[int, int]:
    pagina, total_pag, lidos, achados = 1, 1, 0, 0
    while pagina <= total_pag:
        dados = buscar(pagina)
        if not dados:
            break
        if isinstance(dados, dict):
            total_pag = int(dados.get("totalPaginas") or 1)
        n, a = _processar_pagina(con, dados)
        lidos += n
        achados += a
        print(f"  {rotulo} página {pagina}/{total_pag} ({n} editais, {a} de laser)")
        pagina += 1
    return lidos, achados


def cmd_publicadas(args):
    api, con = PNCP(intervalo=args.intervalo), banco.conectar()
    hoje = date.today()
    ufs = args.uf or [None]
    tot_l = tot_a = 0
    for i in range(args.dias - 1, -1, -1):
        dia = hoje - timedelta(days=i)
        for mod in args.modalidades:
            for uf in ufs:
                chave = f"pub:{dia.isoformat()}:{mod}:{uf or 'BR'}"
                if dia < hoje and banco.feito(con, chave) and not args.forcar:
                    continue
                rot = f"{dia:%d/%m} {MODALIDADES.get(mod, mod)[:22]}{' ' + uf if uf else ''}"
                l, a = _paginar(con, lambda p: api.publicadas(dia, dia, mod, uf, p), rot)
                tot_l += l
                tot_a += a
                banco.registrar_lidos(con, chave, l)
                con.commit()
                if dia < hoje:
                    banco.marcar(con, chave)
                    con.commit()
    print(f"\nPronto: {tot_l} editais lidos, {tot_a} com perfil de laser.")


def cmd_abertas(args):
    api, con = PNCP(intervalo=args.intervalo), banco.conectar()
    limite = date.today() + timedelta(days=args.ate_dias)
    tot_l = tot_a = 0
    for mod in args.modalidades:
        for uf in (args.uf or [None]):
            rot = f"abertas {MODALIDADES.get(mod, mod)[:22]}{' ' + uf if uf else ''}"
            l, a = _paginar(con, lambda p: api.abertas(limite, mod, uf, p), rot)
            tot_l += l
            tot_a += a
    print(f"\nPronto: {tot_l} editais abertos lidos, {tot_a} com perfil de laser.")


def cmd_itens(args):
    api, con = PNCP(intervalo=args.intervalo), banco.conectar()
    agora = datetime.now().isoformat(timespec="seconds")
    linhas = con.execute(
        "SELECT * FROM editais WHERE score >= ? AND itens_baixados = 0 "
        "AND (encerramento = '' OR encerramento >= ?) ORDER BY score DESC, valor DESC LIMIT ?",
        (args.min_score, agora, args.limite),
    ).fetchall()
    print(f"Baixando itens de {len(linhas)} editais...")
    for n, e in enumerate(linhas, 1):
        try:
            itens = api.itens(e["cnpj"], e["ano"], e["sequencial"])
        except ErroPNCP as erro:
            print(f"  ! {e['id']}: {erro}")
            continue
        banco.salvar_itens(con, e["id"], itens)
        descr = " . ".join(i.get("descricao") or "" for i in itens)
        banco.atualizar_classe(con, e["id"], classificar(e["objeto"], e["info"], descr))
        con.commit()
        print(f"  {n}/{len(linhas)} {len(itens):>3} itens - {e['objeto'][:70]}")


def cmd_reclassificar(args):
    con = banco.conectar()
    itens = {}
    for r in con.execute("SELECT edital_id, descricao FROM itens"):
        itens.setdefault(r["edital_id"], []).append(r["descricao"] or "")
    n = 0
    for e in con.execute("SELECT id, objeto, info FROM editais").fetchall():
        banco.atualizar_classe(con, e["id"], classificar(e["objeto"], e["info"], " . ".join(itens.get(e["id"], []))))
        n += 1
    con.commit()
    print(f"{n} editais reclassificados.")


def cmd_resumo(args):
    con = banco.conectar()
    total = banco.total_lidos(con)
    rows = con.execute("SELECT * FROM editais WHERE score >= ?", (args.min_score,)).fetchall()
    if not total:
        print("Banco vazio. Rode primeiro: python coletar.py publicadas --dias 7")
        return
    valor = sum(r["valor"] or 0 for r in rows)
    cats, ufs, maqs = Counter(), Counter(), Counter()
    for r in rows:
        for c in json.loads(r["categorias"] or "[]")[:1]:
            cats[c] += 1
        ufs[r["uf"]] += 1
        maqs[r["maquina"]] += 1
    periodo = con.execute("SELECT MIN(publicacao), MAX(publicacao) FROM editais").fetchone()
    print(f"\nPeríodo: {str(periodo[0])[:10]} a {str(periodo[1])[:10]}")
    print(f"Editais lidos: {total:,}".replace(",", "."))
    print(f"Com perfil de laser (nota >= {args.min_score}): {len(rows)} ({len(rows) / total:.1%})")
    print(f"Valor estimado somado: R$ {valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
    print("\nPor categoria:")
    for c, n in cats.most_common():
        print(f"  {n:>5}  {nome_categoria(c)}")
    print("\nPor máquina:")
    for m, n in maqs.most_common():
        print(f"  {n:>5}  {m}")
    print("\nTop 10 estados:")
    for u, n in ufs.most_common(10):
        print(f"  {n:>5}  {u}")


def cmd_painel(args):
    destino = Path(args.saida) if args.saida else painel.ARQUIVO
    destino.parent.mkdir(parents=True, exist_ok=True)
    caminho = painel.gerar(min_score=args.min_score, destino=destino)
    print(f"Painel gerado: {caminho}")
    if not args.nao_abrir:
        webbrowser.open(caminho.resolve().as_uri())


def cmd_podar(args):
    n = banco.podar(banco.conectar(), args.dias)
    print(f"{n} editais sem perfil de laser com mais de {args.dias} dias foram apagados.")


def main(argv=None):
    p = argparse.ArgumentParser(description="Ferramenta Sideral Licitações")
    sub = p.add_subparsers(dest="cmd", required=True)

    def comuns(sp, modalidades=True):
        sp.add_argument("--uf", nargs="*", help="siglas dos estados (padrão: Brasil inteiro)")
        if modalidades:
            sp.add_argument("--modalidades", nargs="*", type=int, default=MODALIDADES_PADRAO,
                            help="códigos (6=pregão eletr., 8=dispensa, 7=pregão pres., 4=concorrência eletr., 12=credenciamento)")
        sp.add_argument("--intervalo", type=float, default=2.0, help="segundos entre chamadas à API")

    sp = sub.add_parser("publicadas", help="coleta editais publicados nos últimos N dias")
    sp.add_argument("--dias", type=int, default=7)
    sp.add_argument("--forcar", action="store_true", help="recoleta dias já concluídos")
    comuns(sp)
    sp.set_defaults(f=cmd_publicadas)

    sp = sub.add_parser("abertas", help="coleta editais recebendo propostas agora")
    sp.add_argument("--ate-dias", type=int, default=60, help="encerramento até daqui a N dias")
    comuns(sp)
    sp.set_defaults(f=cmd_abertas)

    sp = sub.add_parser("itens", help="baixa os itens dos editais de laser")
    sp.add_argument("--limite", type=int, default=100)
    sp.add_argument("--min-score", type=int, default=painel.SCORE_MINIMO)
    sp.add_argument("--intervalo", type=float, default=2.0)
    sp.set_defaults(f=cmd_itens)

    sp = sub.add_parser("reclassificar", help="reaplica o dicionário de termos")
    sp.set_defaults(f=cmd_reclassificar)

    sp = sub.add_parser("resumo", help="números do mercado")
    sp.add_argument("--min-score", type=int, default=painel.SCORE_MINIMO)
    sp.set_defaults(f=cmd_resumo)

    sp = sub.add_parser("painel", help="gera painel.html")
    sp.add_argument("--min-score", type=int, default=2)
    sp.add_argument("--nao-abrir", action="store_true")
    sp.add_argument("--saida", help="caminho do HTML (padrão: painel.html)")
    sp.set_defaults(f=cmd_painel)

    sp = sub.add_parser("podar", help="apaga editais antigos que não são de laser")
    sp.add_argument("--dias", type=int, default=45)
    sp.set_defaults(f=cmd_podar)

    args = p.parse_args(argv)
    try:
        args.f(args)
    except KeyboardInterrupt:
        print("\nInterrompido. O que já foi coletado está salvo; rode de novo para continuar.")


if __name__ == "__main__":
    main()
