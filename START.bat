@echo off
title MTrans Launcher
chcp 65001 > nul

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

:: Необходимо для Node.js v17+ (react-scripts 5)
set NODE_OPTIONS=--openssl-legacy-provider

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║   MTrans — Платформа логистики        ║
echo  ║   Дипломная работа                    ║
echo  ╚═══════════════════════════════════════╝
echo.

if not exist "%BACKEND%\node_modules" (
  echo [1/2] Установка зависимостей backend...
  cd /d "%BACKEND%" && npm install
)

if not exist "%FRONTEND%\node_modules" (
  echo [2/2] Установка зависимостей frontend...
  cd /d "%FRONTEND%" && npm install
)

echo.
echo  Аккаунты для демонстрации (пароль: demo1234):
echo  ─────────────────────────────────────────────
echo  admin@mtrans.by        Администратор
echo  dispatcher@mtrans.by   Диспетчер
echo  broker@mtrans.by       Брокер
echo  carrier@mtrans.by      Перевозчик
echo  driver@mtrans.by       Водитель
echo  ─────────────────────────────────────────────
echo.
echo  Настройка БД: mysql -u root -p ^< backend\db\init.sql
echo                mysql -u root -p ^< backend\db\seed.sql
echo.

echo Запуск Backend (порт 4000)...
start "MTrans Backend" cmd /k "cd /d "%BACKEND%" && npm run dev"

timeout /t 3 /nobreak > nul

echo Запуск Frontend (порт 3000)...
start "MTrans Frontend" cmd /k "cd /d "%FRONTEND%" && set NODE_OPTIONS=--openssl-legacy-provider && npm start"

echo.
echo  Открывается в браузере: http://localhost:3000
echo  API endpoint:           http://localhost:4000/api/v1
echo  Здоровье сервера:       http://localhost:4000/health
echo.
timeout /t 5 /nobreak > nul
start http://localhost:3000
exit
