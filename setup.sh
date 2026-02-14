#!/bin/bash
# ============================================
# SR&ED Report AI - Setup Script (Linux/Mac)
# ============================================
echo ""
echo "=========================================="
echo " SR&ED Report AI - Setup"
echo "=========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 not found. Install with:"
    echo "  Ubuntu/Debian: sudo apt install python3 python3-venv python3-pip"
    echo "  macOS: brew install python3"
    exit 1
fi

echo "[OK] Python found: $(python3 --version)"
echo ""

# Create virtual environment
echo "[1/4] Creating virtual environment..."
if [ ! -d "ai/venv" ]; then
    python3 -m venv ai/venv
    echo "       Virtual environment created at ai/venv"
else
    echo "       Virtual environment already exists"
fi
echo ""

# Activate and install
echo "[2/4] Installing Python dependencies..."
source ai/venv/bin/activate

pip install --upgrade pip > /dev/null 2>&1
pip install torch transformers accelerate bitsandbytes peft
echo ""

echo "[3/4] Dependencies installed!"
echo ""

# Check GPU
echo "[4/4] Checking GPU availability..."
python3 -c "
import torch
print(f'  CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'  GPU: {torch.cuda.get_device_name(0)}')
    print(f'  VRAM: {torch.cuda.get_device_properties(0).total_mem / 1024**3:.1f} GB')
else:
    print('  GPU: None - will use CPU')
"
echo ""

echo "=========================================="
echo " Setup Complete!"
echo "=========================================="
echo ""
echo " To start the AI server:"
echo "   source ai/venv/bin/activate"
echo "   python ai/server.py"
echo ""
echo " To train a custom model (requires GPU with 24GB+ VRAM):"
echo "   pip install axolotl"
echo "   axolotl train ai/axolotl_config.yml"
echo "   axolotl merge ai/axolotl_config.yml"
echo ""
echo " The web app works without the AI server too -"
echo " it uses built-in templates as fallback."
echo ""
