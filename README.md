# Sideral Licitações (MVP)

Busca no PNCP (Portal Nacional de Contratações Públicas) os editais de prefeituras, estados, governo federal, autarquias, universidades e institutos federais e separa os que podem ser atendidos com uma **máquina de corte a laser** (CO2 ou fibra).

## Instalar (uma vez, no Windows)

1. Instale o Python 3.10 ou mais novo em https://www.python.org/downloads/ e marque **"Add Python to PATH"** no instalador.
2. Descompacte esta pasta, abra um terminal dentro dela e rode:
   ```
   pip install -r requirements.txt
   ```

## Primeiro teste: quantos editais de laser saem por semana?

```
python coletar.py publicadas --dias 7
python coletar.py resumo
python coletar.py painel
```

Ou dê dois cliques em `rodar.bat`, que faz os três passos.

**A API do governo é lenta** (10 a 20 segundos por página de 50 editais). Uma semana do Brasil inteiro pode levar de 1 a 3 horas. Dá para:
- interromper com Ctrl+C a qualquer momento, porque o que foi coletado fica salvo, e quando você rodar de novo ele continua de onde parou;
- testar mais rápido com só um estado: `python coletar.py publicadas --dias 7 --uf SP`.

## Comandos

| Comando | O que faz |
|---|---|
| `python coletar.py publicadas --dias 30` | Coleta os editais publicados nos últimos 30 dias |
| `python coletar.py abertas` | Coleta tudo que está recebendo propostas agora |
| `python coletar.py itens --limite 100` | Baixa a lista de itens (descrição, quantidade, valor unitário) dos melhores editais |
| `python coletar.py resumo` | Números do mercado: total, % de laser, valor somado, categorias, estados |
| `python coletar.py painel` | Gera e abre o `painel.html` com filtros e exportação para CSV |
| `python coletar.py reclassificar` | Reaplica o dicionário depois que você editar `termos_laser.py` |

Opções úteis:
- `--uf SP MG PR` filtra os estados.
- `--modalidades 6 8` filtra as modalidades (6 = pregão eletrônico, 8 = dispensa).
- `--intervalo 3` aumenta a pausa entre chamadas, caso a API comece a responder "429".

## Como ele decide o que é "de laser"

O arquivo `termos_laser.py` tem 9 categorias de produto (sinalização, patrimônio, premiação, material pedagógico, máquinas/lab maker, acrílico, decoração natalina, metal, serviços de gravação). Cada termo tem um peso de 1 a 3, e o edital ganha uma nota. A partir da nota 3 ele aparece no painel.

O arquivo também tem uma lista de **exclusões**, para que "impressora laser", "toner", "laserterapia", "trena a laser", "placa de vídeo", "sinalização viária" etc. não gerem falso positivo.

Para melhorar a precisão, acrescente termos, rode `reclassificar` e gere o painel de novo.

## Arquivos

- `pncp.py`: cliente da API do PNCP (pausa entre chamadas e novas tentativas)
- `banco.py`: banco local `licitacoes.db` (SQLite)
- `termos_laser.py`: dicionário de termos (edite à vontade)
- `classificador.py`: dá a nota de cada edital
- `painel.py`: gera o `painel.html`
- `coletar.py`: linha de comando
- `testes/`: testes com dados simulados (`python testes/test_classificador.py`)

## Rodando sozinho na nuvem (GitHub)

O arquivo `.github/workflows/coleta-diaria.yml` faz o GitHub rodar a coleta **todo dia às 06:13** e publicar o painel num link (GitHub Pages), que você abre no celular. Seu computador não precisa ficar ligado.

- O link do painel fica assim: `https://SEU-USUARIO.github.io/sideral-licitacoes/`
- Para rodar na hora, vá na aba **Actions → Coleta diária de editais → Run workflow**. Ali você também escolhe quantos dias buscar e quais estados.
- Cada execução tem limite de 5 horas. O que faltar é continuado na execução seguinte.
- O resumo de cada execução aparece na própria página da execução, na aba Actions.
- Editais sem perfil de laser com mais de 45 dias são apagados (`podar`) para o banco não crescer sem parar. A contagem de editais lidos continua guardada, então a % de laser não muda.

Configuração única: no repositório, entre em **Settings → Pages → Source** e escolha **GitHub Actions**.

## Próximas fases

1. Alerta diário por e-mail ou WhatsApp com os editais novos.
2. Classificação por IA (Claude) dos editais com nota baixa ou duvidosa, além de leitura do PDF do edital.
3. Coletores do Sistema S (portais das federações: FIEMG, FIEB, FIEC, Paradigma etc.), que não ficam todos no PNCP.
4. Histórico de preços: quanto foi pago por item nos últimos 90 dias (resultados do PNCP).
5. Versão web com login para os alunos do Clube Sideral.
