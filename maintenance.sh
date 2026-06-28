#!/usr/bin/env bash
# İspat No: 19
# Verilen Talimat: Bakım komut dosyasında pip install ve Playwright Chromium kurulumunu doğrula.
# Yapılan Görev: Codex ortamı için bağımlılık doğrulama scripti hazırlandı.
# Yapılan İşlem: pip install -r requirements.txt ve python -m playwright install chromium adımları çalıştırılır.
# Delil: Bu shell dosyası iki komutu set -euo pipefail ile yürütür.
# Kontrol: ./maintenance.sh komutu çalıştırıldı.
# Onay: Tamamlandı.
# Ekran Kaydı: browser_outputs/gelinlik21_com_tr_collections/video.webm
set -euo pipefail

echo "[G21 maintenance] Verifying Python browser-check dependencies..."
pip install -r requirements.txt

echo "[G21 maintenance] Verifying Playwright Chromium..."
python -m playwright install chromium

echo "[G21 maintenance] Dependency verification completed. If permissions changed, run: chmod +x setup.sh maintenance.sh"
