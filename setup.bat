@echo off
REM ============================================
REM SR&ED Report AI - Setup Script (Windows)
REM ============================================
echo.
echo ==========================================
echo  SR&ED Report AI - Setup
echo ==========================================
echo.

REM Check Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python 3.10+ from https://python.org
    echo.
    pause
    exit /b 1
)

echo [OK] Python found
python --version
echo.

REM Create virtual environment
echo [1/4] Creating virtual environment...
if not exist "ai\venv" (
    python -m venv ai\venv
    echo       Virtual environment created at ai\venv
) else (
    echo       Virtual environment already exists
)
echo.

REM Activate and install dependencies
echo [2/4] Installing Python dependencies...
call ai\venv\Scripts\activate.bat

pip install --upgrade pip >nul 2>&1
pip install torch --index-url https://download.pytorch.org/whl/cu121 2>nul || pip install torch
pip install transformers accelerate bitsandbytes peft
echo.

echo [3/4] Dependencies installed!
echo.

REM Check GPU
echo [4/4] Checking GPU availability...
python -c "import torch; print(f'  CUDA available: {torch.cuda.is_available()}'); print(f'  GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None - will use CPU\"}'); print(f'  VRAM: {torch.cuda.get_device_properties(0).total_mem / 1024**3:.1f} GB' if torch.cuda.is_available() else '')"
echo.

echo ==========================================
echo  Setup Complete!
echo ==========================================
echo.
echo  To start the AI server:
echo    ai\venv\Scripts\activate.bat
echo    python ai\server.py
echo.
echo  To train a custom model (requires GPU with 24GB+ VRAM):
echo    pip install axolotl
echo    axolotl train ai\axolotl_config.yml
echo    axolotl merge ai\axolotl_config.yml
echo.
echo  The web app works without the AI server too -
echo  it uses built-in templates as fallback.
echo.
pause
