@echo off
REM ============================================
REM SR&ED Report AI - Training Script (Windows)
REM ============================================
REM  
REM  REQUIREMENTS:
REM    - NVIDIA GPU with 24GB+ VRAM (RTX 3090/4090 or A100)
REM    - CUDA 12.1+ installed
REM    - Python 3.10+
REM    - ~50GB free disk space
REM
REM  This script fine-tunes Mistral-7B on SR&ED report data
REM  using QLoRA (4-bit quantization + LoRA adapters) via Axolotl.
REM
echo.
echo ==========================================
echo  SR&ED AI Model Training
echo ==========================================
echo.

REM Activate venv
if exist "ai\venv\Scripts\activate.bat" (
    call ai\venv\Scripts\activate.bat
) else (
    echo [ERROR] Virtual environment not found. Run setup.bat first.
    pause
    exit /b 1
)

REM Check GPU
echo Checking GPU...
python -c "import torch; assert torch.cuda.is_available(), 'No GPU found!'; print(f'GPU: {torch.cuda.get_device_name(0)} ({torch.cuda.get_device_properties(0).total_mem / 1024**3:.0f}GB VRAM)')"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] CUDA GPU required for training.
    echo        If you have an NVIDIA GPU, make sure CUDA drivers are installed.
    pause
    exit /b 1
)
echo.

REM Install Axolotl if needed
echo Installing Axolotl (if not already installed)...
pip install axolotl >nul 2>&1
echo.

REM Login to HuggingFace (needed for Mistral model access)
echo Step 1: HuggingFace Login
echo You need a HuggingFace account to download Mistral-7B.
echo Get your token at: https://huggingface.co/settings/tokens
echo.
huggingface-cli login
echo.

REM Start training
echo Step 2: Starting Training...
echo This will take 2-6 hours depending on your GPU.
echo.
echo Training config: ai\axolotl_config.yml
echo Dataset: ai\dataset\sred_training_data.jsonl
echo Output: ai\output\sred-mistral-7b-qlora\
echo.

axolotl train ai\axolotl_config.yml

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Training failed. Check the error messages above.
    pause
    exit /b 1
)

echo.
echo Training complete! Now merging adapters...
echo.

REM Merge LoRA adapters into base model
axolotl merge ai\axolotl_config.yml

echo.
echo ==========================================
echo  Training Complete!
echo ==========================================
echo.
echo  Merged model saved to: ai\output\sred-mistral-7b-qlora\merged\
echo.
echo  To use the model:
echo    set SRED_MODEL_PATH=ai\output\sred-mistral-7b-qlora\merged
echo    python ai\server.py
echo.
pause
