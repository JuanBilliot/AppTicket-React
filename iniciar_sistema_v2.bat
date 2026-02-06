@echo off
echo ========================================
echo   INICIANDO SISTEMA DE TICKETS
echo ========================================
echo.
echo [INFO] Configuracion de puertos:
echo   - Frontend (React): Puerto 5173
echo   - Backend (Flask):  Puerto 5002
echo.
echo [INFO] Iniciando backend en puerto 5002...
start /B python app.py
echo.
echo [INFO] Backend iniciado. Esperando 3 segundos...
timeout /t 3 /nobreak > nul
echo.
echo [INFO] Iniciando frontend en puerto 5173...
cd /D "%~dp0\frontend"
start /B npm run dev
echo.
echo ========================================
echo   SISTEMA INICIADO CORRECTAMENTE
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://127.0.0.1:5002
echo ========================================
pause
