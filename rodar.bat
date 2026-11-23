@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Coletando editais publicados nos ultimos 7 dias (pode demorar, Ctrl+C para parar)...
python coletar.py publicadas --dias 7
python coletar.py resumo
python coletar.py painel
pause
