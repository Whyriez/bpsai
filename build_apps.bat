@echo off
setlocal enabledelayedexpansion

set BACKEND_DIR=backend
set DASHBOARD_DIR=dashboard-bpsai
set CHATBOT_DIR=chatbot-bpsai

:: ==============================
:: MENU
:: ==============================
echo ========================================
echo        BUILD FRONTEND MENU
echo ========================================
echo 1. Build Dashboard
echo 2. Build Chatbot
echo 3. Build All
echo ========================================
set /p CHOICE=Pilih opsi (1/2/3): 

if "%CHOICE%"=="1" goto build_dashboard
if "%CHOICE%"=="2" goto build_chatbot
if "%CHOICE%"=="3" goto build_all

echo.
echo Input tidak valid!
pause
exit /b 1

:: ==============================
:: BUILD DASHBOARD
:: ==============================
:build_dashboard
echo ========================================
echo BUILDING DASHBOARD FRONTEND...
echo ========================================
cd %DASHBOARD_DIR%
call npm run build
cd ..

if exist %BACKEND_DIR%\app\static\dashboard (
    rmdir /s /q %BACKEND_DIR%\app\static\dashboard
)
mkdir %BACKEND_DIR%\app\static\dashboard
xcopy %DASHBOARD_DIR%\dist\* %BACKEND_DIR%\app\static\dashboard\ /E /I /Y
goto done

:: ==============================
:: BUILD CHATBOT
:: ==============================
:build_chatbot
echo ========================================
echo BUILDING CHATBOT FRONTEND...
echo ========================================
cd %CHATBOT_DIR%
call npm run build
cd ..

if exist %BACKEND_DIR%\app\static\chatbot (
    rmdir /s /q %BACKEND_DIR%\app\static\chatbot
)
mkdir %BACKEND_DIR%\app\static\chatbot
xcopy %CHATBOT_DIR%\dist\* %BACKEND_DIR%\app\static\chatbot\ /E /I /Y
goto done

:: ==============================
:: BUILD ALL
:: ==============================
:build_all
call :build_dashboard
call :build_chatbot
goto done

:: ==============================
:: DONE
:: ==============================
:done
echo.
echo ========================================
echo PROSES SELESAI!
echo Silakan restart service Flask jika perlu.
echo ========================================
pause
endlocal
