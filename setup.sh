#!/usr/bin/env bash
# İspat No: 18
# Verilen Talimat: Kurulum komut dosyasında pip install ve Playwright Chromium kurulumunu doğrula.
# Yapılan Görev: Codex ortamı için bağımlılık doğrulama scripti hazırlandı.
# Yapılan İşlem: pip install -r requirements.txt ve python -m playwright install chromium adımları çalıştırılır.
# Delil: Bu shell dosyası iki komutu set -euo pipefail ile yürütür.
# Kontrol: ./setup.sh komutu çalıştırıldı.
# Onay: Tamamlandı.
# Ekran Kaydı: browser_outputs/gelinlik21_com_tr_collections/video.webm
set -euo pipefail

echo "[G21 setup] Installing Python browser-check dependencies..."
pip install -r requirements.txt

echo "[G21 setup] Installing Playwright Chromium..."
python -m playwright install chromium

echo "[G21 setup] Playwright Chromium setup completed. If permissions changed, run: chmod +x setup.sh maintenance.sh"
