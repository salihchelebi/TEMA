from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
import shutil
import traceback

from g21_web_bot_auth import get_web_bot_auth_headers

BASE_DIR = Path("forcodex")
SCREENSHOTS_DIR = BASE_DIR / "screenshots"
VIDEOS_DIR = BASE_DIR / "videos"
REPORTS_DIR = BASE_DIR / "reports"
LOGS_DIR = BASE_DIR / "logs"
VERIFICATION_DIR = BASE_DIR / "verification"

TARGET_URL = "https://gelinlik21.com.tr"

for folder in [SCREENSHOTS_DIR, VIDEOS_DIR, REPORTS_DIR, LOGS_DIR, VERIFICATION_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
video_temp_dir = VIDEOS_DIR / f"temp-{timestamp}"
video_temp_dir.mkdir(parents=True, exist_ok=True)

final_video = VIDEOS_DIR / "gelinlik21-3sn-video.webm"
final_screenshot = SCREENSHOTS_DIR / "gelinlik21-homepage.png"
report_file = REPORTS_DIR / "gelinlik21-access-report.md"
log_file = LOGS_DIR / "gelinlik21-playwright.log"
verification_file = VERIFICATION_DIR / "gelinlik21-file-check.txt"

parsed = urlparse(TARGET_URL)
host = parsed.netloc
auth_headers = get_web_bot_auth_headers(host)

status = {
    "target_url": TARGET_URL,
    "page_opened": False,
    "screenshot_created": False,
    "video_created": False,
    "error": "",
    "final_url": "",
    "title": "",
    "video_path": str(final_video),
    "screenshot_path": str(final_screenshot),
}


def write_log(text):
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(text + "\n")


try:
    write_log("=== Playwright video testi başladı ===")
    write_log(f"Hedef URL: {TARGET_URL}")
    write_log(f"Web Bot Auth host: {host}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context(
            viewport={"width": 1440, "height": 1200},
            record_video_dir=str(video_temp_dir),
            record_video_size={"width": 1440, "height": 1200},
            extra_http_headers=auth_headers,
            ignore_https_errors=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="en-US",
        )
        page = context.new_page()

        try:
            response = page.goto(TARGET_URL, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(3000)
            status["page_opened"] = response is not None and response.status < 400
            status["final_url"] = page.url
            status["title"] = page.title()
            page.screenshot(path=str(final_screenshot), full_page=True)
            status["screenshot_created"] = final_screenshot.exists()
            if response is not None:
                write_log(f"HTTP status: {response.status}")
        except PlaywrightTimeoutError as e:
            status["error"] = f"Timeout hatası: {str(e)}"
            write_log(status["error"])
            try:
                page.screenshot(path=str(final_screenshot), full_page=True)
                status["screenshot_created"] = final_screenshot.exists()
            except Exception as screenshot_error:
                write_log(f"Screenshot alınamadı: {screenshot_error}")
        except Exception:
            status["error"] = traceback.format_exc()
            write_log("Sayfa açılış hatası:")
            write_log(status["error"])
            try:
                page.set_content(f"<html><body><h1>G21 Codex erişim hatası</h1><pre>{status['error']}</pre></body></html>")
                page.wait_for_timeout(3000)
                page.screenshot(path=str(final_screenshot), full_page=True)
                status["screenshot_created"] = final_screenshot.exists()
            except Exception as screenshot_error:
                write_log(f"Screenshot alınamadı: {screenshot_error}")

        context.close()
        browser.close()

    videos = sorted(video_temp_dir.glob("*.webm"), key=lambda x: x.stat().st_mtime, reverse=True)
    if videos:
        if final_video.exists():
            final_video.unlink()
        shutil.move(str(videos[0]), str(final_video))
        status["video_created"] = final_video.exists()
    if video_temp_dir.exists():
        shutil.rmtree(video_temp_dir, ignore_errors=True)
except Exception:
    status["error"] = traceback.format_exc()
    write_log(status["error"])

video_size = final_video.stat().st_size if final_video.exists() else 0
screenshot_size = final_screenshot.stat().st_size if final_screenshot.exists() else 0

if not final_screenshot.exists():
    try:
        from PIL import Image, ImageDraw

        img = Image.new("RGB", (1440, 1200), color=(255, 250, 242))
        draw = ImageDraw.Draw(img)
        draw.text((40, 40), "G21 Codex Playwright screenshot fallback", fill=(20, 20, 20))
        draw.text((40, 90), f"Target: {TARGET_URL}", fill=(20, 20, 20))
        draw.text((40, 140), "Live navigation failed before page screenshot could be captured.", fill=(120, 0, 0))
        draw.text((40, 190), (status["error"] or "No error captured")[:1200], fill=(20, 20, 20))
        img.save(final_screenshot)
        status["screenshot_created"] = final_screenshot.exists()
        screenshot_size = final_screenshot.stat().st_size if final_screenshot.exists() else 0
    except Exception as fallback_error:
        write_log(f"Fallback screenshot üretilemedi: {fallback_error}")

with open(verification_file, "w", encoding="utf-8") as f:
    f.write("Gelinlik21 Playwright Doğrulama Çıktısı\n")
    f.write("=====================================\n")
    f.write(f"Hedef URL: {TARGET_URL}\n")
    f.write(f"Web Bot Auth host: {host}\n")
    f.write(f"Sayfa açıldı mı: {status['page_opened']}\n")
    f.write(f"Son URL: {status['final_url']}\n")
    f.write(f"Sayfa başlığı: {status['title']}\n")
    f.write(f"Video oluştu mu: {status['video_created']}\n")
    f.write(f"Video yolu: {final_video}\n")
    f.write(f"Video boyutu: {video_size} bytes\n")
    f.write(f"Screenshot oluştu mu: {status['screenshot_created']}\n")
    f.write(f"Screenshot yolu: {final_screenshot}\n")
    f.write(f"Screenshot boyutu: {screenshot_size} bytes\n")
    f.write(f"Hata: {status['error']}\n")

with open(report_file, "w", encoding="utf-8") as f:
    f.write("# Gelinlik21 Playwright Site Erişim ve Video Kayıt Raporu\n\n")
    f.write(f"## Hedef URL\n\n{TARGET_URL}\n\n")
    f.write(f"## Web Bot Auth Host\n\n`{host}`\n\n")
    f.write("## Sonuç\n\n")
    f.write(f"- Sayfa açıldı mı: `{status['page_opened']}`\n")
    f.write(f"- Son URL: `{status['final_url']}`\n")
    f.write(f"- Sayfa başlığı: `{status['title']}`\n")
    f.write(f"- Video oluştu mu: `{status['video_created']}`\n")
    f.write(f"- Video dosyası: `{final_video}`\n")
    f.write(f"- Video boyutu: `{video_size} bytes`\n")
    f.write(f"- Screenshot oluştu mu: `{status['screenshot_created']}`\n")
    f.write(f"- Screenshot dosyası: `{final_screenshot}`\n")
    f.write(f"- Screenshot boyutu: `{screenshot_size} bytes`\n\n")
    if status["error"]:
        f.write("## Hata\n\n")
        f.write(f"```text\n{status['error']}\n```\n\n")
    f.write("## Açıklama\n\n")
    f.write("Video oluşması tek başına site açıldı demek değildir. Site açılmadıysa video hata/engel ekranını kaydetmiştir.\n")

print("=== TEST TAMAMLANDI ===")
print(f"Rapor: {report_file}")
print(f"Video: {final_video}")
print(f"Screenshot: {final_screenshot}")
print(f"Doğrulama: {verification_file}")
print(f"Log: {log_file}")
