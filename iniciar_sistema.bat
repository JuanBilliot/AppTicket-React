@echo off
title TicketFlow Launcher
color 0A

echo ===================================================
echo      INICIANDO SISTEMA TICKETFLOW
echo ===================================================
echo.

:: 1. Iniciar el Backend (Python/Flask)
echo [1/4] Iniciando Servidor Backend (Puerto 5002)...
start "TicketFlow Backend" /min cmd /k "call venv\Scripts\activate && python app.py"

:: 2. Iniciar Servicio de Tickets Automatico
echo [2/4] Iniciando Servicio de Sincronizacion de Tickets...
start "TicketFlow Email Service" /min cmd /k "call venv\Scripts\activate && python ticket_service.py"

:: 3. Iniciar el Frontend (React/Vite)
echo [3/4] Iniciando Interfaz Frontend...
cd frontend
start "TicketFlow Frontend" /min cmd /k "npm run dev"

:: 4. Esperar y abrir navegador
echo [4/4] Esperando a que los servicios esten listos...
timeout /t 6 >nul

echo.
echo ===================================================
echo      SISTEMA INICIADO CORRECTAMENTE
echo      - Backend: http://localhost:5002
echo      - Frontend: http://localhost:5173
echo      - Servicio de Tickets: Activo (cada 10 min)
echo ===================================================

start http://localhost:5173

:: Opcional: Cerrar esta ventana automaticamente despues de unos segundos
timeout /t 3 >nul
exit
