@echo off
title TranscribeAI - Servidor Local
color 0B
echo ========================================================
echo   Iniciando TranscribeAI com Suporte ao YouTube
echo ========================================================
echo.
echo Verificando dependencias essenciais...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERRO] O sistema Node.js nao foi encontrado no seu computador.
    echo Por favor, baixe e instale em: https://nodejs.org/
    echo Depois de instalar, abra este arquivo novamente.
    pause
    exit
)

echo Preparando o motor de download... (Aguarde um momento)
call npm install --silent >nul 2>&1

echo.
echo ========================================================
echo Sistema Carregado com Sucesso!
echo.
echo IMPORTANTE: Esta janela precisa ficar aberta enquanto
echo voce estiver usando o aplicativo. Voce pode minimiza-la!
echo ========================================================
echo.
echo O navegador abrira automaticamente...

:: Comando silencioso para abrir o navegador apos 1.5 segundos
start /b cmd /c "timeout /t 1 >nul & start http://localhost:3000"

:: Inicia o servidor Node.js
node server.js

pause
