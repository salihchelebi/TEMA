from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse
import time
import requests

from g21_web_bot_auth import get_web_bot_auth_headers

BASE_DIR = Path("forcodex")
REPORTS_DIR = BASE_DIR / "reports"
LOGS_DIR = BASE_DIR / "logs"
VERIFICATION_DIR = BASE_DIR / "verification"

for folder in [REPORTS_DIR, LOGS_DIR, VERIFICATION_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

DOMAINS = [
    "https://gelinlik21.com.tr",
    "https://tr.gelinlik21.com.tr",
    "https://ar.gelinlik21.com.tr",
    "https://fr.gelinlik21.com.tr",
    "https://de.gelinlik21.com.tr",
    "https://ru.gelinlik21.com.tr",
    "https://nl.gelinlik21.com.tr",
    "https://es.gelinlik21.com.tr",
]

report_file = REPORTS_DIR / "g21-http-access-report.md"
log_file = LOGS_DIR / "g21-http-access.log"
verification_file = VERIFICATION_DIR / "g21-http-access-check.txt"

results = []


def write_log(text):
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(text + "\n")


for base_url in DOMAINS:
    parsed = urlparse(base_url)
    host = parsed.netloc
    headers = get_web_bot_auth_headers(host)

    try:
        r = requests.get(base_url + "/", headers=headers, timeout=20)
        html_size = len(r.text or "")
        ok = r.status_code == 200 and html_size > 500

        results.append({
            "domain": base_url,
            "status": r.status_code,
            "html_size": html_size,
            "ok": ok,
            "error": "",
        })
        write_log(f"{base_url} => {r.status_code}, html_size={html_size}, ok={ok}")
    except Exception as e:
        results.append({
            "domain": base_url,
            "status": "ERROR",
            "html_size": 0,
            "ok": False,
            "error": str(e).replace("\n", " "),
        })
        write_log(f"{base_url} => ERROR: {e}")

    time.sleep(1)

with open(report_file, "w", encoding="utf-8") as f:
    f.write("# G21 Web Bot Auth HTTP Erişim Raporu\n\n")
    f.write(f"Tarih: {datetime.now().isoformat()}\n\n")
    f.write("| Domain | Status | HTML Boyutu | Başarılı mı | Hata |\n")
    f.write("|---|---:|---:|---|---|\n")
    for item in results:
        f.write(f"| {item['domain']} | {item['status']} | {item['html_size']} | {item['ok']} | {item['error']} |\n")

with open(verification_file, "w", encoding="utf-8") as f:
    for item in results:
        f.write(f"{item['domain']} | status={item['status']} | html_size={item['html_size']} | ok={item['ok']} | error={item['error']}\n")

print("HTTP erişim testi tamamlandı.")
print(f"Rapor: {report_file}")
print(f"Doğrulama: {verification_file}")
print(f"Log: {log_file}")
