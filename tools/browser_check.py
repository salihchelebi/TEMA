from pathlib import Path
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("browser_outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

URL = "https://gelinlik21.com.tr/collections"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    context = browser.new_context(
        viewport={"width": 1440, "height": 1200},
        record_video_dir=str(OUTPUT_DIR),
        record_video_size={"width": 1440, "height": 1200},
    )

    page = context.new_page()
    page.goto(URL, wait_until="networkidle", timeout=60000)

    page.screenshot(
        path=str(OUTPUT_DIR / "collections-screenshot.png"),
        full_page=True
    )

    context.close()
    browser.close()

print("Ekran görüntüsü ve video kaydı oluşturuldu.")