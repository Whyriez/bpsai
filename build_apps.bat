@echo off
set BACKEND_DIR=.\backend
set DASHBOARD_DIR=.\dashboard-bpsai
set CHATBOT_DIR=.\chatbot-bpsai

echo Memulai proses build...

:: Build Dashboard
cd %DASHBOARD_DIR%
call npm run build
cd ..

:: Build Chatbot
cd %CHATBOT_DIR%
call npm run build
cd ..

:: Hapus folder lama dan Copy baru
rd /s /q %BACKEND_DIR%\app\static\dashboard
rd /s /q %BACKEND_DIR%\app\static\chatbot
xcopy /e /i /y %DASHBOARD_DIR%\dist %BACKEND_DIR%\app\static\dashboard
xcopy /e /i /y %CHATBOT_DIR%\dist %BACKEND_DIR%\app\static\chatbot

echo Selesai!
pause