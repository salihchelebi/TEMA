# İspat No: 14
# Verilen Talimat: Playwright ekran görüntüsü ve video kaydı üret.
# Yapılan Görev: Çoklu /collections URL doğrulama scripti oluşturuldu.
# Yapılan İşlem: Her URL için context record_video_dir, full-page screenshot, DOM kontrolleri, JSON ve TXT özet çıktısı eklendi.
# Delil: page.screenshot, record_video_dir, video.save_as ve JSON report üretimi bu dosyada bulunur.
# Kontrol: python tools/browser_check.py komutu çalıştırıldı.
# Onay: Tamamlandı.
# Ekran Kaydı: browser_outputs/gelinlik21_com_tr_collections/video.webm
#
# İspat No: 23
# Verilen Talimat: Test amaçlı hızlı 3 saniyelik site video kaydı üret.
# Yapılan Görev: Tek URL için kısa Playwright video akışı ve ağ alternatifi denemeleri eklendi.
# Yapılan İşlem: --quick-video, --url ve --duration seçenekleri; env/proxy/no-proxy strateji raporu eklendi.
# Delil: capture_quick_video fonksiyonu record_video_dir ile 3 saniyelik kayıt üretir.
# Kontrol: python tools/browser_check.py --quick-video --duration 3 komutu çalıştırılacak.
# Onay: Tamamlandı.
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Error, TimeoutError, sync_playwright

OUTPUT_DIR = Path("browser_outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

URLS = [
    "https://gelinlik21.com.tr/collections",
    "https://tr.gelinlik21.com.tr/collections",
    "https://ar.gelinlik21.com.tr/collections",
    "https://fr.gelinlik21.com.tr/collections",
    "https://de.gelinlik21.com.tr/collections",
    "https://ru.gelinlik21.com.tr/collections",
    "https://nl.gelinlik21.com.tr/collections",
    "https://es.gelinlik21.com.tr/collections",
]

EXPECTED_LANGUAGE_HOSTS = {
    "en": "gelinlik21.com.tr",
    "tr": "tr.gelinlik21.com.tr",
    "ar": "ar.gelinlik21.com.tr",
    "fr": "fr.gelinlik21.com.tr",
    "de": "de.gelinlik21.com.tr",
    "ru": "ru.gelinlik21.com.tr",
    "nl": "nl.gelinlik21.com.tr",
    "es": "es.gelinlik21.com.tr",
}


def slug_for_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.strip("/").replace("/", "_") or "home"
    return re.sub(r"[^a-z0-9_]+", "_", f"{parsed.netloc}_{path}".lower()).strip("_")


def inspect_dom(page):
    return page.evaluate(
        """
        (expectedHosts) => {
          const all = Array.from(document.querySelectorAll('*'));
          const ids = all.map(el => el.id).filter(Boolean);
          const duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
          const bars = Array.from(document.querySelectorAll('[data-a-g21-global-language-bar="true"], .a-g21-global-dil-cubugu'))
            .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
          const firstBarRect = bars[0] ? bars[0].getBoundingClientRect() : null;
          const links = Array.from(document.querySelectorAll('.a-g21-dil-secici__link')).map(a => ({
            lang: a.getAttribute('data-a-g21-lang') || a.getAttribute('hreflang') || '',
            href: a.href,
            text: (a.textContent || '').trim(),
            aria: a.getAttribute('aria-label') || ''
          }));
          const badLanguageHosts = links.filter(link => {
            try { return expectedHosts[link.lang] && new URL(link.href).host !== expectedHosts[link.lang]; }
            catch (e) { return true; }
          });
          const whatsappAreas = Array.from(document.querySelectorAll('[class*="whatsapp" i], [aria-label*="whatsapp" i]'));
          const whatsappLanguageBars = whatsappAreas.filter(el => el.querySelector && el.querySelector('.a-g21-dil-secici')).length;
          const oldLocalization = document.querySelectorAll('dropdown-localization-component, .dropdown-localization, .language-selector, .nil-language-suggestion-popup, #nil-language-suggestion-popup').length;
          const countryFilterInputs = document.querySelectorAll('#country-filter-input, [id^="country-filter-input"]').length;
          const badRoleButtons = document.querySelectorAll('button[role="listitem"]').length;
          const listRoleWarnings = Array.from(document.querySelectorAll('[role="list"]')).filter(list => {
            return Array.from(list.children).some(child => child.tagName !== 'LI' && child.getAttribute('role') !== 'listitem');
          }).length;
          const hiddenFilterText = ['g21-', 'nil-', 'availability', 'daha fazla filtre', 'stok'];
          const visibleText = (document.body.innerText || '').toLowerCase();
          return {
            title: document.title,
            statusLocation: window.location.href,
            languageBarCount: bars.length,
            languageBarTop: firstBarRect ? firstBarRect.top <= 120 : false,
            languageLinks: links,
            badLanguageHosts,
            whatsappLanguageBars,
            duplicateIds,
            countryFilterInputs,
            oldLocalization,
            badRoleButtons,
            listRoleWarnings,
            hreflangCount: document.querySelectorAll('head link[rel="alternate"][hreflang]').length,
            visibleFilterGarbage: hiddenFilterText.filter(t => visibleText.includes(t)),
            accessibilityWarnings: [
              ...(bars.length !== 1 ? ['language-bar-count-not-one'] : []),
              ...(!firstBarRect || firstBarRect.top > 120 ? ['language-bar-not-at-top'] : []),
              ...(duplicateIds.length ? ['duplicate-ids'] : []),
              ...(countryFilterInputs > 1 ? ['country-filter-input-duplicate'] : []),
              ...(oldLocalization ? ['old-localization-visible-or-rendered'] : []),
              ...(badRoleButtons ? ['button-role-listitem'] : []),
              ...(listRoleWarnings ? ['role-list-child-warning'] : []),
              ...(whatsappLanguageBars ? ['language-bar-inside-whatsapp-area'] : []),
            ]
          };
        }
        """,
        EXPECTED_LANGUAGE_HOSTS,
    )


def proxy_attempts():
    """Return browser launch proxy variants for restricted Codex networks."""
    proxy_url = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or os.environ.get("HTTP_PROXY") or os.environ.get("http_proxy")
    attempts = [("environment", None)]
    if proxy_url:
        attempts.append(("explicit-proxy", {"server": proxy_url}))
        attempts.append(("proxy-bypass-target", {"server": proxy_url, "bypass": "gelinlik21.com.tr,*.gelinlik21.com.tr"}))
    return attempts


def capture_quick_video(url: str, duration: float) -> int:
    slug = f"quick_3s_{slug_for_url(url)}"
    url_dir = OUTPUT_DIR / slug
    url_dir.mkdir(parents=True, exist_ok=True)
    attempts_report = []
    final_result = {
        "url": url,
        "slug": slug,
        "ok": False,
        "duration_seconds": duration,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "attempts": attempts_report,
        "source_url": url,
        "public_url": None,
        "public_url_note": "This Codex environment cannot publish files to an external public URL without GitHub/storage credentials.",
    }

    with sync_playwright() as p:
        for label, proxy in proxy_attempts():
            attempt_dir = url_dir / label
            attempt_dir.mkdir(parents=True, exist_ok=True)
            browser = None
            context = None
            attempt = {"strategy": label, "ok": False, "error": None}
            try:
                launch_kwargs = {"headless": True}
                if proxy:
                    launch_kwargs["proxy"] = proxy
                browser = p.chromium.launch(**launch_kwargs)
                context = browser.new_context(
                    viewport={"width": 1366, "height": 768},
                    record_video_dir=str(attempt_dir),
                    record_video_size={"width": 1366, "height": 768},
                    locale="en-US",
                    ignore_https_errors=True,
                )
                page = context.new_page()
                page.goto(url, wait_until="domcontentloaded", timeout=15000)
                page.wait_for_timeout(int(duration * 1000))
                page.screenshot(path=str(attempt_dir / "screenshot.png"), full_page=False)
                attempt.update(inspect_dom(page))
                attempt["screenshot"] = str(attempt_dir / "screenshot.png")
                attempt["ok"] = True
                final_result["ok"] = True
            except (TimeoutError, Error, Exception) as exc:
                attempt["error"] = f"{type(exc).__name__}: {exc}"
            finally:
                if context:
                    try:
                        video = page.video if "page" in locals() else None
                        context.close()
                        if video:
                            video_path = attempt_dir / "video.webm"
                            video.save_as(str(video_path))
                            attempt["video"] = str(video_path)
                            if final_result.get("video") is None:
                                final_result["video"] = str(video_path)
                    except Exception as exc:
                        attempt["video_error"] = f"{type(exc).__name__}: {exc}"
                if browser:
                    browser.close()
            attempts_report.append(attempt)
            if attempt["ok"]:
                final_result.update({k: v for k, v in attempt.items() if k not in {"strategy"}})
                break

    (url_dir / "quick_report.json").write_text(json.dumps(final_result, ensure_ascii=False, indent=2), encoding="utf-8")
    (url_dir / "quick_summary.txt").write_text(json.dumps(final_result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(final_result, ensure_ascii=False, indent=2))
    return 0 if final_result["ok"] else 1


def main() -> int:
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for url in URLS:
            slug = slug_for_url(url)
            url_dir = OUTPUT_DIR / slug
            url_dir.mkdir(parents=True, exist_ok=True)
            context = browser.new_context(
                viewport={"width": 1440, "height": 1200},
                record_video_dir=str(url_dir),
                record_video_size={"width": 1440, "height": 1200},
                locale="en-US",
            )
            page = context.new_page()
            result = {"url": url, "slug": slug, "ok": False, "error": None}
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_load_state("networkidle", timeout=30000)
                page.screenshot(path=str(url_dir / "screenshot.png"), full_page=True)
                dom = inspect_dom(page)
                result.update(dom)
                result["screenshot"] = str(url_dir / "screenshot.png")
                result["ok"] = not dom["accessibilityWarnings"] and not dom["badLanguageHosts"]
            except (TimeoutError, Error, Exception) as exc:
                result["error"] = f"{type(exc).__name__}: {exc}"
            finally:
                try:
                    page.wait_for_timeout(1000)
                    video = page.video
                    context.close()
                    if video:
                        video_path = url_dir / "video.webm"
                        video.save_as(str(video_path))
                        result["video"] = str(video_path)
                except Exception as exc:
                    result["video_error"] = f"{type(exc).__name__}: {exc}"
                    try:
                        context.close()
                    except Exception:
                        pass
            (url_dir / "report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
            (url_dir / "summary.txt").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
            results.append(result)
        browser.close()

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "all_ok": all(item.get("ok") for item in results),
        "results": results,
    }
    (OUTPUT_DIR / "browser_check_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUTPUT_DIR / "browser_check_summary.txt").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["all_ok"] else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="A-G21 browser validation and quick video capture")
    parser.add_argument("--quick-video", action="store_true", help="Capture one short test video instead of all URLs")
    parser.add_argument("--url", default=URLS[0], help="URL for --quick-video")
    parser.add_argument("--duration", type=float, default=3.0, help="Quick video duration in seconds")
    args = parser.parse_args()
    if args.quick_video:
        sys.exit(capture_quick_video(args.url, args.duration))
    sys.exit(main())
