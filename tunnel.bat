@echo off
echo ============================================
echo   SR&ED T661 - Phone Connection Setup
echo ============================================
echo.
echo This will:
echo   1. Start the feedback server on port 5000
echo   2. Create a public tunnel so your phone can reach it
echo.
echo After it starts, copy the tunnel URL and paste it
echo into the "Server URL" box on t661-checker.vercel.app
echo ============================================
echo.

:: Start the Python server in background
start "SRED-Server" cmd /c "cd /d %~dp0 && python ai/server.py"
timeout /t 2 /nobreak >nul

:: Try cloudflared first (free, no signup needed)
where cloudflared >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Starting Cloudflare tunnel...
    echo.
    cloudflared tunnel --url http://localhost:5000
    goto :end
)

:: Try ngrok
where ngrok >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Starting ngrok tunnel...
    echo.
    ngrok http 5000
    goto :end
)

:: Neither found - try npx cloudflared
echo No tunnel tool found. Installing cloudflared via npm...
echo.
npx cloudflared tunnel --url http://localhost:5000

:end
pause
