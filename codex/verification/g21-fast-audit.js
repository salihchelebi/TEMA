/* eslint-disable no-console */

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { chromium } = require("playwright");
const sharp = require("sharp");

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, "reports");
const SHOT_DIR = path.join(ROOT, "screenshots");
const VIDEO_DIR = path.join(ROOT, "videos");

for (const dir of [REPORT_DIR, SHOT_DIR, VIDEO_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

const ENV = process.env;

if (!ENV.GTOKEN || ENV.GTOKEN === "BURAYA_GITHUB_TOKEN_DEGERINI_YAZ" || ENV.GTOKEN === "BURAYA_TOKEN_VALUE") {
  console.error("HATA: process.env.GTOKEN yok. Token değeri loglanmadı.");
  process.exit(1);
}

console.log("GTOKEN loaded: yes");

const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");

const BASE_URL = ENV.G21_BASE_URL || "https://gelinlik21.com.tr";
const DEFAULT_G21_DOMAINS = [
  "https://gelinlik21.com.tr",
  "https://tr.gelinlik21.com.tr",
  "https://ar.gelinlik21.com.tr",
  "https://fr.gelinlik21.com.tr",
  "https://de.gelinlik21.com.tr",
  "https://ru.gelinlik21.com.tr",
  "https://nl.gelinlik21.com.tr",
  "https://es.gelinlik21.com.tr"
].join(",");
const DOMAINS = String(ENV.G21_DOMAINS || DEFAULT_G21_DOMAINS)
  .split(",")
  .map(x => x.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const DEFAULT_CONCURRENCY = Number(ENV.G21_DEFAULT_CONCURRENCY || 10);
const CPU_COUNT = Math.max(1, os.cpus()?.length || 1);
let activeConcurrency = Math.min(DEFAULT_CONCURRENCY, CPU_COUNT < 4 ? Math.max(4, CPU_COUNT * 3) : DEFAULT_CONCURRENCY);

const MAX_PAGES = Number(ENV.G21_MAX_PAGES || 260);
const MAX_SITEMAP_URLS = Number(ENV.G21_MAX_SITEMAP_URLS || 180);
const MAX_LINKS_PER_PAGE = Number(ENV.G21_MAX_LINKS_PER_PAGE || 90);
const MAX_CLICKS_PER_PAGE = Number(ENV.G21_MAX_CLICKS_PER_PAGE || 28);
const MAX_RETRIES = Number(ENV.G21_MAX_RETRIES || 2);


const WEB_BOT_AUTH_PATH = path.join(ROOT, "codex/verification/g21-web-bot-auth.json");
const REQUIRE_WEB_BOT_AUTH = ENV.G21_REQUIRE_WEB_BOT_AUTH === "1";
let webBotAuthByHost = {};

function loadWebBotAuth() {
  if (!fs.existsSync(WEB_BOT_AUTH_PATH)) {
    if (REQUIRE_WEB_BOT_AUTH) {
      console.error("HATA: G21_REQUIRE_WEB_BOT_AUTH=1 ama local Web Bot Auth dosyası yok. Header değerleri loglanmadı.");
      process.exit(1);
    }
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(WEB_BOT_AUTH_PATH, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.error("HATA: Web Bot Auth JSON okunamadı. Header değerleri loglanmadı.");
    process.exit(1);
  }
}

function getWebBotAuthHeadersForUrl(rawUrl) {
  let hostname = "";
  try {
    hostname = new URL(rawUrl).hostname;
  } catch {
    return {};
  }

  const entry = webBotAuthByHost[hostname];
  const hasAll = entry && entry["Signature-Input"] && entry.Signature && entry["Signature-Agent"];

  if (!hasAll) {
    if (REQUIRE_WEB_BOT_AUTH) {
      throw new Error(`Web Bot Auth header eksik: ${hostname}`);
    }
    return {};
  }

  return {
    "Signature-Input": String(entry["Signature-Input"]),
    Signature: String(entry.Signature),
    "Signature-Agent": String(entry["Signature-Agent"])
  };
}

webBotAuthByHost = loadWebBotAuth();

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1200, isMobile: false },
  { name: "mobile", width: 390, height: 844, isMobile: true }
];

const BLOCKED_RESOURCE_HOST_PARTS = [
  "google-analytics",
  "googletagmanager",
  "doubleclick",
  "facebook.net",
  "connect.facebook.net",
  "tiktok",
  "hotjar",
  "clarity.ms",
  "pinterest",
  "snapchat",
  "bing.com",
  "yandex",
  "klaviyo",
  "criteo"
];

const DANGEROUS_URL_PARTS = [
  "/cart",
  "/login",
  "/checkout",
  "/checkouts",
  "/account",
  "/admin",
  "/orders",
  "/payment",
  "/payments",
  "shopify.com/checkout",
  "paypal",
  "stripe",
  "iyzico",
  "paytr"
];

const DANGEROUS_TEXT = [
  "pay",
  "payment",
  "checkout",
  "complete order",
  "place order",
  "siparişi tamamla",
  "ödeme",
  "ödeme yap",
  "satın al",
  "buy now",
  "submit",
  "send",
  "gönder"
];

const TEST_PATHS = [
  "/",
  "/collections",
  "/collections/all",
  "/search?q=gelinlik",
  "/pages/contact",
  "/pages/wedding-dress-measurement-guide",
  "/404-g21-playwright-test-page"
];

const SELECTORS = {
  header: ["header", ".header", "#shopify-section-header", "[data-section-type='header']"],
  footer: ["footer", ".footer", "#shopify-section-footer"],
  language: [
    "[data-a-g21-language-bar]",
    "[data-language-bar]",
    "[data-localization-form]",
    ".localization-form",
    "a[href*='tr.gelinlik21']",
    "a[href*='ar.gelinlik21']",
    "a[href*='fr.gelinlik21']"
  ],
  hamburger: [
    "header button[aria-label*='menu' i]",
    "header button[aria-controls*='menu' i]",
    ".menu-drawer-container summary",
    "summary[aria-controls*='menu' i]",
    "[data-drawer-open]"
  ],
  collectionGrid: [
    "[data-product-grid]",
    ".product-grid",
    ".collection",
    ".collection-grid",
    ".card-product",
    ".product-card",
    "a[href*='/products/']"
  ],
  productMedia: [
    "product-info",
    ".product",
    ".product__media",
    ".product-media",
    "[data-media-id]",
    "variant-selects"
  ],
  filter: [
    "button:has-text('Filter')",
    "button:has-text('Filters')",
    "summary:has-text('Filter')",
    ".facets__summary",
    "[data-filter]",
    "button[aria-controls*='Facet' i]"
  ],
  sort: [
    "select[name='sort_by']",
    "button:has-text('Sort')",
    "summary:has-text('Sort')",
    "[data-sort]"
  ],
  gridButtons: [
    "button[data-columns]",
    "[data-grid-columns]",
    "button[aria-label*='column' i]",
    "button:has-text('2')",
    "button:has-text('3')",
    "button:has-text('4')",
    "button:has-text('5')"
  ],
  productCard: [
    ".product-card a[href*='/products/']",
    ".card-product a[href*='/products/']",
    "a[href*='/products/']"
  ],
  whatsapp: [
    "a[href*='wa.me']",
    "a[href*='whatsapp.com']",
    "a[href*='api.whatsapp']"
  ],
  accordion: [
    "main details summary",
    ".accordion summary",
    "button[aria-expanded]"
  ],
  clickable: [
    "button",
    "a[href]",
    "input[type='submit']",
    "[role='button']",
    "summary",
    "details summary",
    "select"
  ]
};

const LIKELY_FILES = {
  header: ["sections/header.liquid", "layout/theme.liquid", "assets/base.css"],
  footer: ["sections/footer.liquid", "layout/theme.liquid", "assets/base.css"],
  language: ["snippets/A-g21-dil-secici.liquid", "sections/header.liquid", "layout/theme.liquid", "assets/base.css"],
  collection: ["sections/main-collection.liquid", "snippets/product-card.liquid", "assets/base.css", "assets/facets.js"],
  product: ["sections/main-product.liquid", "snippets/product-media.liquid", "snippets/variant-picker.liquid", "assets/base.css"],
  network: ["layout/theme.liquid", "assets/*", "sections/*.liquid", "snippets/*.liquid"],
  js: ["assets/*.js", "layout/theme.liquid", "sections/*.liquid"],
  mobile: ["assets/base.css", "sections/header.liquid", "sections/main-collection.liquid", "sections/main-product.liquid"],
  search: ["templates/search.json", "sections/main-search.liquid", "assets/base.css"],
  cart: ["templates/cart.json", "sections/main-cart.liquid", "assets/base.css"],
  notFound: ["templates/404.json", "sections/main-404.liquid", "layout/theme.liquid"]
};

const state = {
  seenUrls: new Set(),
  pagesTested: [],
  brokenLinks: [],
  consoleErrors: [],
  networkErrors: [],
  issues: [],
  discoveredUrls: [],
  retryTasks: [],
  workerCrashes: 0,
  timeoutCount: 0,
  memoryPressureCount: 0
};

function safeWriteJSON(file, data) {
  fs.writeFileSync(path.join(REPORT_DIR, file), JSON.stringify(data, null, 2), "utf8");
}

function appendIssue(issue) {
  state.issues.push({ id: state.issues.length + 1, runId: RUN_ID, ...issue });
}

function hash(input) {
  return crypto.createHash("sha1").update(String(input)).digest("hex").slice(0, 10);
}

function slug(input) {
  return String(input)
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 130) || "page";
}

function isDangerousUrl(url) {
  const lower = String(url || "").toLowerCase();
  return DANGEROUS_URL_PARTS.some(x => lower.includes(x));
}

function normalizeUrl(raw, base) {
  try {
    const url = new URL(raw, base);
    url.hash = "";

    const removableParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "_pos", "_sid", "_ss", "variant"
    ];

    for (const key of removableParams) url.searchParams.delete(key);

    const pathName = url.pathname.replace(/\/+$/, "") || "/";
    url.pathname = pathName;

    const keepParams = new URLSearchParams();
    if (url.pathname === "/search" && url.searchParams.get("q")) {
      keepParams.set("q", url.searchParams.get("q"));
    }
    url.search = keepParams.toString();

    return url.toString();
  } catch {
    return null;
  }
}

function sameAllowedDomain(url) {
  try {
    const host = new URL(url).host;
    return DOMAINS.some(domain => new URL(domain).host === host);
  } catch {
    return false;
  }
}

function getLanguageFromUrl(url) {
  try {
    const host = new URL(url).host;
    if (host.startsWith("tr.")) return "tr";
    if (host.startsWith("ar.")) return "ar";
    if (host.startsWith("fr.")) return "fr";
    if (host.startsWith("de.")) return "de";
    if (host.startsWith("ru.")) return "ru";
    if (host.startsWith("nl.")) return "nl";
    if (host.startsWith("es.")) return "es";
    return "main";
  } catch {
    return "unknown";
  }
}

function pageType(url) {
  try {
    const pathname = new URL(url).pathname;
    if (pathname.includes("/products/")) return "product";
    if (pathname.includes("/collections")) return "collection";
    if (pathname.includes("/search")) return "search";
    if (pathname.includes("/cart")) return "cart";
    if (pathname.includes("/pages/")) return "page";
    if (pathname.includes("404")) return "404";
    if (pathname === "/") return "home";
    return "other";
  } catch {
    return "unknown";
  }
}

function likelyFilesFor(type) {
  if (type === "product") return LIKELY_FILES.product;
  if (type === "collection") return LIKELY_FILES.collection;
  if (type === "search") return LIKELY_FILES.search;
  if (type === "cart") return LIKELY_FILES.cart;
  if (type === "404") return LIKELY_FILES.notFound;
  return ["layout/theme.liquid", "assets/base.css", "sections/*.liquid"];
}

async function fetchText(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "G21-Playwright-Audit/1.0", ...getWebBotAuthHeadersForUrl(url) }
    });

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractSitemapLocs(xml) {
  if (!xml) return [];
  const locs = [];
  const regex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let match;
  while ((match = regex.exec(xml))) locs.push(match[1].trim());
  return locs;
}

async function discoverFromSitemaps() {
  const urls = new Set();

  for (const domain of DOMAINS) {
    const sitemapCandidates = [
      `${domain}/sitemap.xml`,
      `${domain}/sitemap_index.xml`,
      `${domain}/sitemap_products_1.xml`,
      `${domain}/sitemap_collections_1.xml`,
      `${domain}/sitemap_pages_1.xml`
    ];

    for (const sitemapUrl of sitemapCandidates) {
      const xml = await fetchText(sitemapUrl);
      if (!xml) continue;

      const locs = extractSitemapLocs(xml);

      for (const loc of locs) {
        if (loc.endsWith(".xml")) {
          const childXml = await fetchText(loc);
          for (const childLoc of extractSitemapLocs(childXml)) {
            const normalized = normalizeUrl(childLoc, domain);
            if (normalized && sameAllowedDomain(normalized) && !isDangerousUrl(normalized)) urls.add(normalized);
          }
        } else {
          const normalized = normalizeUrl(loc, domain);
          if (normalized && sameAllowedDomain(normalized) && !isDangerousUrl(normalized)) urls.add(normalized);
        }

        if (urls.size >= MAX_SITEMAP_URLS) break;
      }

      if (urls.size >= MAX_SITEMAP_URLS) break;
    }
  }

  return [...urls];
}

async function saveWebp(page, name, fullPage = true) {
  const fileName = `${RUN_ID}_${slug(name)}_${hash(name)}.webp`;
  const outPath = path.join(SHOT_DIR, fileName);

  try {
    const buffer = await page.screenshot({ fullPage, type: "png", timeout: 20000 });
    await sharp(buffer).webp({ quality: 62, effort: 5 }).toFile(outPath);
    return path.relative(ROOT, outPath);
  } catch (err) {
    return `SCREENSHOT_FAILED:${err.name}`;
  }
}

async function routeHandler(route) {
  const req = route.request();
  const url = req.url().toLowerCase();

  if (isDangerousUrl(url)) return route.abort();
  if (BLOCKED_RESOURCE_HOST_PARTS.some(x => url.includes(x))) return route.abort();

  return route.continue();
}

async function visibleAny(page, selectors, timeout = 900) {
  for (const selector of selectors) {
    try {
      const loc = page.locator(selector).first();
      const count = await loc.count();
      if (count > 0 && await loc.isVisible({ timeout })) return { ok: true, selector };
    } catch {
      continue;
    }
  }
  return { ok: false, selector: null };
}

async function getTextSafe(locator) {
  try {
    return String(await locator.innerText({ timeout: 800 })).trim().slice(0, 80);
  } catch {
    return "";
  }
}

async function getAttrSafe(locator, attr) {
  try {
    return await locator.getAttribute(attr, { timeout: 800 });
  } catch {
    return null;
  }
}

async function isSafeClickable(locator) {
  const text = (await getTextSafe(locator)).toLowerCase();
  const href = await getAttrSafe(locator, "href");
  const type = await getAttrSafe(locator, "type");
  const role = await getAttrSafe(locator, "role");

  if (href && isDangerousUrl(href)) return false;
  if (type && String(type).toLowerCase() === "submit") return false;
  if (role && String(role).toLowerCase() === "button" && DANGEROUS_TEXT.some(x => text.includes(x))) return false;
  if (DANGEROUS_TEXT.some(x => text.includes(x))) return false;

  return true;
}

async function discoverInternalLinks(page, currentUrl) {
  try {
    const hrefs = await page.locator("a[href]").evaluateAll(els =>
      els.map(a => a.href).filter(Boolean).slice(0, 500)
    );

    const normalized = [];

    for (const href of hrefs) {
      const n = normalizeUrl(href, currentUrl);
      if (!n) continue;
      if (!sameAllowedDomain(n)) continue;
      if (isDangerousUrl(n)) continue;
      if (normalized.includes(n)) continue;
      normalized.push(n);
      if (normalized.length >= Number(process.env.G21_MAX_LINKS_PER_PAGE || 90)) break;
    }

    return normalized;
  } catch {
    return [];
  }
}

async function checkFooterOrder(page, meta, evidenceBase) {
  try {
    const result = await page.evaluate(() => {
      const header = document.querySelector("header, .header, #shopify-section-header");
      const main = document.querySelector("main, #MainContent, [role='main']");
      const footer = document.querySelector("footer, .footer, #shopify-section-footer");

      if (!header || !footer) return { ok: false, reason: "Header veya footer DOM içinde bulunamadı." };

      const headerTop = header.getBoundingClientRect().top + window.scrollY;
      const mainTop = main ? main.getBoundingClientRect().top + window.scrollY : null;
      const footerTop = footer.getBoundingClientRect().top + window.scrollY;

      if (main && footerTop < mainTop) return { ok: false, reason: "Footer main içerikten önce render edilmiş görünüyor." };
      if (footerTop < headerTop) return { ok: false, reason: "Footer header’dan önce görünüyor." };

      return { ok: true, reason: "Footer sırası normal." };
    });

    if (!result.ok) {
      const evidence = await saveWebp(page, `${evidenceBase}_footer_order`);
      appendIssue({
        url: meta.url,
        domain: meta.domain,
        language: meta.language,
        viewport: meta.viewport,
        type: "footer-order",
        severity: "high",
        selector: "header/main/footer",
        description: result.reason,
        evidence,
        likelyFiles: LIKELY_FILES.footer,
        suggestion: "layout/theme.liquid içinde Header → Main Content → Footer render sırasını kontrol et."
      });
    }
  } catch (err) {
    appendIssue({
      url: meta.url,
      domain: meta.domain,
      language: meta.language,
      viewport: meta.viewport,
      type: "footer-order-check-failed",
      severity: "low",
      selector: "header/main/footer",
      description: `Footer sıra kontrolü tamamlanamadı: ${err.name}`,
      evidence: null,
      likelyFiles: LIKELY_FILES.footer,
      suggestion: "Footer DOM sırasını manuel kontrol et."
    });
  }
}

async function checkMobileOverflow(page, meta, evidenceBase) {
  if (meta.viewport !== "mobile") return;

  try {
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const width = Math.max(doc.scrollWidth, body.scrollWidth);
      const viewport = window.innerWidth;

      const offenders = Array.from(document.querySelectorAll("body *"))
        .map(el => {
          const r = el.getBoundingClientRect();
          if (r.width > viewport + 8 || r.right > viewport + 8) {
            return {
              tag: el.tagName,
              className: String(el.className || "").slice(0, 120),
              id: String(el.id || "").slice(0, 80),
              width: Math.round(r.width),
              right: Math.round(r.right)
            };
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, 12);

      return { ok: width <= viewport + 8 && offenders.length === 0, scrollWidth: width, viewport, offenders };
    });

    if (!overflow.ok) {
      const evidence = await saveWebp(page, `${evidenceBase}_mobile_overflow`);
      appendIssue({
        url: meta.url,
        domain: meta.domain,
        language: meta.language,
        viewport: meta.viewport,
        type: "mobile-overflow",
        severity: "high",
        selector: "document/body responsive layout",
        description: `Mobilde yatay taşma var. viewport=${overflow.viewport}, scrollWidth=${overflow.scrollWidth}, offenders=${JSON.stringify(overflow.offenders)}`,
        evidence,
        likelyFiles: LIKELY_FILES.mobile,
        suggestion: "CSS içinde width:100vw, sabit px genişlik, grid min-width, image/container overflow ve drawer stillerini kontrol et."
      });
    }
  } catch {
    // geç
  }
}

async function checkExpectedElements(page, meta, evidenceBase) {
  const checks = [
    {
      type: "header-missing",
      selectors: SELECTORS.header,
      severity: "high",
      description: "Header görünür değil.",
      likelyFiles: LIKELY_FILES.header,
      suggestion: "sections/header.liquid render ediliyor mu, layout/theme.liquid içinde header doğru yerde mi ve CSS ile gizleniyor mu kontrol et."
    },
    {
      type: "footer-missing",
      selectors: SELECTORS.footer,
      severity: "high",
      description: "Footer görünür değil.",
      likelyFiles: LIKELY_FILES.footer,
      suggestion: "sections/footer.liquid render ediliyor mu ve CSS ile gizleniyor mu kontrol et."
    },
    {
      type: "language-selector-missing",
      selectors: SELECTORS.language,
      severity: "medium",
      description: "Dil seçici görünür bulunamadı.",
      likelyFiles: LIKELY_FILES.language,
      suggestion: "Dil seçici snippet render ediliyor mu, header içinde doğru yerde mi ve domain/language linkleri üretiliyor mu kontrol et."
    }
  ];

  const type = pageType(meta.url);

  if (type === "collection") {
    checks.push({
      type: "collection-grid-missing",
      selectors: SELECTORS.collectionGrid,
      severity: "high",
      description: "Koleksiyon grid veya ürün kartları görünür değil.",
      likelyFiles: LIKELY_FILES.collection,
      suggestion: "sections/main-collection.liquid, product-card snippet ve collection CSS grid kurallarını kontrol et."
    });
  }

  if (type === "product") {
    checks.push({
      type: "product-media-missing",
      selectors: SELECTORS.productMedia,
      severity: "high",
      description: "Ürün medya/galeri/varyant alanı görünür değil.",
      likelyFiles: LIKELY_FILES.product,
      suggestion: "main-product.liquid, product-media snippet ve variant-picker bağlantılarını kontrol et."
    });
  }

  for (const check of checks) {
    const found = await visibleAny(page, check.selectors);
    if (!found.ok) {
      const evidence = await saveWebp(page, `${evidenceBase}_${check.type}`);
      appendIssue({
        url: meta.url,
        domain: meta.domain,
        language: meta.language,
        viewport: meta.viewport,
        type: check.type,
        severity: check.severity,
        selector: check.selectors.join(" | "),
        description: check.description,
        evidence,
        likelyFiles: check.likelyFiles,
        suggestion: check.suggestion
      });
    }
  }
}

async function clickSpecificGroups(page, meta, evidenceBase) {
  const groups = [
    { name: "language-selector", selectors: SELECTORS.language.concat([".localization-form button", "[data-a-g21-language-bar] button"]), likelyFiles: LIKELY_FILES.language },
    { name: "hamburger-menu", selectors: SELECTORS.hamburger, likelyFiles: LIKELY_FILES.header },
    { name: "filter-drawer", selectors: SELECTORS.filter, likelyFiles: LIKELY_FILES.collection },
    { name: "sort-options", selectors: SELECTORS.sort, likelyFiles: LIKELY_FILES.collection },
    { name: "grid-buttons", selectors: SELECTORS.gridButtons, likelyFiles: LIKELY_FILES.collection },
    { name: "accordion", selectors: SELECTORS.accordion, likelyFiles: likelyFilesFor(pageType(meta.url)) }
  ];

  for (const group of groups) {
    let clicked = false;

    for (const selector of group.selectors) {
      if (clicked) break;

      try {
        const loc = page.locator(selector).first();
        if (await loc.count() < 1) continue;
        if (!await loc.isVisible({ timeout: 700 })) continue;
        if (!await loc.isEnabled({ timeout: 700 })) continue;
        if (!await isSafeClickable(loc)) continue;

        const beforeUrl = page.url();

        if (selector.startsWith("select")) {
          const options = await loc.locator("option").evaluateAll(opts => opts.map(o => o.value).filter(Boolean).slice(0, 2));
          if (options.length > 0) await loc.selectOption(options[0], { timeout: 3000 });
        } else {
          await loc.click({ timeout: 3500 });
        }

        await page.waitForTimeout(650);

        const afterUrl = page.url();
        if (isDangerousUrl(afterUrl)) {
          await page.goto(beforeUrl, { waitUntil: "domcontentloaded", timeout: 12000 }).catch(() => {});
        }

        const evidence = await saveWebp(page, `${evidenceBase}_click_${group.name}`);
        state.pagesTested.push({ url: meta.url, viewport: meta.viewport, action: group.name, selector, evidence });

        clicked = true;
      } catch (err) {
        const evidence = await saveWebp(page, `${evidenceBase}_failed_click_${group.name}`);
        appendIssue({
          url: meta.url,
          domain: meta.domain,
          language: meta.language,
          viewport: meta.viewport,
          type: `${group.name}-click-failed`,
          severity: "medium",
          selector,
          description: `${group.name} tıklaması başarısız: ${err.name}`,
          evidence,
          likelyFiles: group.likelyFiles,
          suggestion: "Selector, z-index, display/visibility, disabled state ve JavaScript click handler bağlantılarını kontrol et."
        });
      }
    }
  }
}

async function testGenericClickables(page, meta, evidenceBase) {
  const seen = new Set();
  let tested = 0;

  for (const selector of SELECTORS.clickable) {
    if (tested >= MAX_CLICKS_PER_PAGE) break;

    let count = 0;
    try {
      count = await page.locator(selector).count();
    } catch {
      continue;
    }

    const limit = Math.min(count, 10);

    for (let i = 0; i < limit; i++) {
      if (tested >= MAX_CLICKS_PER_PAGE) break;

      const loc = page.locator(selector).nth(i);

      try {
        if (!await loc.isVisible({ timeout: 500 })) continue;
        if (!await loc.isEnabled({ timeout: 500 })) continue;
        if (!await isSafeClickable(loc)) continue;

        const text = await getTextSafe(loc);
        const href = await getAttrSafe(loc, "href");
        const key = `${selector}|${text}|${href || ""}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (href) {
          const n = normalizeUrl(href, meta.url);
          if (!n || !sameAllowedDomain(n) || isDangerousUrl(n)) continue;
        }

        const beforeUrl = page.url();

        if (selector === "select") {
          const options = await loc.locator("option").evaluateAll(opts => opts.map(o => o.value).filter(Boolean).slice(0, 1));
          if (options.length < 1) continue;
          await loc.selectOption(options[0], { timeout: 2500 });
        } else {
          await loc.click({ timeout: 2500 });
        }

        await page.waitForTimeout(400);

        const afterUrl = page.url();
        if (isDangerousUrl(afterUrl)) {
          await page.goto(beforeUrl, { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {});
        }

        tested++;
      } catch (err) {
        const evidence = await saveWebp(page, `${evidenceBase}_generic_click_failed_${tested}`);
        appendIssue({
          url: meta.url,
          domain: meta.domain,
          language: meta.language,
          viewport: meta.viewport,
          type: "clickable-element-failed",
          severity: "low",
          selector,
          description: `Genel tıklanabilir alan başarısız: ${err.name}`,
          evidence,
          likelyFiles: likelyFilesFor(pageType(meta.url)),
          suggestion: "Aynı selector birden fazla yerde geçiyorsa görünür/aktif/tıklanabilir state ve event handler bağlantılarını kontrol et."
        });
      }
    }
  }
}

async function checkBrokenImages(page, meta, evidenceBase) {
  try {
    const brokenImages = await page.evaluate(() => {
      return Array.from(document.images)
        .filter(img => img.complete && img.naturalWidth === 0)
        .map(img => img.currentSrc || img.src)
        .slice(0, 30);
    });

    if (brokenImages.length > 0) {
      const evidence = await saveWebp(page, `${evidenceBase}_broken_images`);
      appendIssue({
        url: meta.url,
        domain: meta.domain,
        language: meta.language,
        viewport: meta.viewport,
        type: "broken-image",
        severity: "medium",
        selector: "img",
        description: `Kırık görseller bulundu: ${JSON.stringify(brokenImages)}`,
        evidence,
        likelyFiles: ["snippets/product-card.liquid", "snippets/product-media.liquid", "assets/base.css"],
        suggestion: "Image src, image_url filter, responsive image width/height ve lazy loading kurallarını kontrol et."
      });
    }
  } catch {
    // geç
  }
}

async function runPageTask(browser, task) {
  const { url, viewport, retry } = task;
  const domain = new URL(url).origin;
  const language = getLanguageFromUrl(url);
  const type = pageType(url);

  const meta = { url, domain, language, viewport: viewport.name, type, retry };
  const evidenceBase = `${viewport.name}_${type}_${slug(url)}_retry${retry}`;

  let context;
  let page;

  const consoleErrors = [];
  const networkErrors = [];
  const failedRequests = [];
  let videoPath = null;

  const shouldRecordVideo = retry > 0;

  try {
    context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.isMobile,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: getWebBotAuthHeadersForUrl(url),
      locale: language === "ar" ? "ar" : "en",
      recordVideo: shouldRecordVideo
        ? { dir: VIDEO_DIR, size: { width: viewport.width, height: viewport.height } }
        : undefined
    });

    await context.route("**/*", routeHandler);

    page = await context.newPage();

    page.on("console", msg => {
      if (["error", "warning"].includes(msg.type())) {
        const item = {
          url,
          domain,
          language,
          viewport: viewport.name,
          type: msg.type(),
          text: String(msg.text()).slice(0, 900)
        };
        consoleErrors.push(item);
        state.consoleErrors.push(item);
      }
    });

    page.on("pageerror", err => {
      const item = {
        url,
        domain,
        language,
        viewport: viewport.name,
        type: "pageerror",
        text: String(err.message || err).slice(0, 900)
      };
      consoleErrors.push(item);
      state.consoleErrors.push(item);
    });

    page.on("requestfailed", req => {
      const item = {
        url,
        domain,
        language,
        viewport: viewport.name,
        requestUrl: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        errorText: req.failure()?.errorText || "request failed"
      };

      if (!BLOCKED_RESOURCE_HOST_PARTS.some(x => item.requestUrl.toLowerCase().includes(x))) {
        failedRequests.push(item);
        state.networkErrors.push(item);
      }
    });

    page.on("response", async res => {
      try {
        const status = res.status();
        const resUrl = res.url();

        if (status >= 400 && !BLOCKED_RESOURCE_HOST_PARTS.some(x => resUrl.toLowerCase().includes(x))) {
          const item = { url, domain, language, viewport: viewport.name, requestUrl: resUrl, status };
          networkErrors.push(item);
          state.networkErrors.push(item);

          if (status === 404) state.brokenLinks.push(item);
        }
      } catch {
        // geç
      }
    });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: retry > 0 ? 30000 : 18000
    });

    await page.waitForLoadState("networkidle", { timeout: 9000 }).catch(() => {});
    await page.waitForTimeout(500);

    const status = response ? response.status() : 0;

    state.pagesTested.push({ url, domain, language, viewport: viewport.name, type, status, retry });

    if (!response || status >= 400) {
      const evidence = await saveWebp(page, `${evidenceBase}_http_status`);
      appendIssue({
        url,
        domain,
        language,
        viewport: viewport.name,
        type: "http-status",
        severity: "high",
        selector: "page.goto",
        description: `Sayfa HTTP status problemi: ${status}`,
        evidence,
        likelyFiles: likelyFilesFor(type),
        suggestion: "URL, Shopify route, template JSON ve domain yönlendirme ayarlarını kontrol et."
      });

      if (retry < MAX_RETRIES) state.retryTasks.push({ ...task, retry: retry + 1 });
    }

    await checkExpectedElements(page, meta, evidenceBase);
    await checkFooterOrder(page, meta, evidenceBase);
    await checkMobileOverflow(page, meta, evidenceBase);
    await checkBrokenImages(page, meta, evidenceBase);

    await clickSpecificGroups(page, meta, evidenceBase);
    await testGenericClickables(page, meta, evidenceBase);

    const discovered = await discoverInternalLinks(page, url);
    for (const link of discovered) {
      if (!state.seenUrls.has(link) && state.discoveredUrls.length < MAX_PAGES) {
        state.discoveredUrls.push(link);
      }
    }

    if (consoleErrors.length > 0) {
      const evidence = await saveWebp(page, `${evidenceBase}_console_error`);
      appendIssue({
        url,
        domain,
        language,
        viewport: viewport.name,
        type: "console-error",
        severity: "medium",
        selector: "browser console",
        description: JSON.stringify(consoleErrors.slice(0, 8)),
        evidence,
        likelyFiles: LIKELY_FILES.js,
        suggestion: "Console error içindeki dosya/line bilgisini kontrol et. JS runtime hatası varsa ilgili assets/*.js dosyasını düzelt."
      });
    }

    if (networkErrors.length > 0 || failedRequests.length > 0) {
      const evidence = await saveWebp(page, `${evidenceBase}_network_error`);
      appendIssue({
        url,
        domain,
        language,
        viewport: viewport.name,
        type: "network-error",
        severity: "medium",
        selector: "network",
        description: JSON.stringify(networkErrors.concat(failedRequests).slice(0, 12)),
        evidence,
        likelyFiles: LIKELY_FILES.network,
        suggestion: "404/failed asset URL’lerini kontrol et. Eksik asset, hatalı snippet include veya yanlış CDN/path olabilir."
      });
    }

    if (shouldRecordVideo && page.video()) {
      try {
        const rawVideoPath = await page.video().path();
        videoPath = path.relative(ROOT, rawVideoPath);
      } catch {
        videoPath = null;
      }
    }

    return { ok: true, url, viewport: viewport.name, status, videoPath };
  } catch (err) {
    const errorName = err.name || "Error";
    const errorMessage = String(err.message || err).slice(0, 900);

    if (/timeout/i.test(errorMessage)) state.timeoutCount++;

    if (/crash|target closed|browser has been closed|out of memory/i.test(errorMessage)) {
      state.workerCrashes++;
      activeConcurrency = Math.max(4, Math.floor(activeConcurrency * 0.7));
      console.log(`UYARI: worker azaltıldı. Yeni aktif limit: ${activeConcurrency}`);
    }

    let evidence = null;
    try {
      if (page) evidence = await saveWebp(page, `${evidenceBase}_task_failed`);
    } catch {
      evidence = null;
    }

    appendIssue({
      url,
      domain,
      language,
      viewport: viewport.name,
      type: "task-failed",
      severity: "high",
      selector: "page/test task",
      description: `${errorName}: ${errorMessage}`,
      evidence,
      likelyFiles: likelyFilesFor(type),
      suggestion: "Timeout/crash varsa ağır JS, sonsuz loading, asset hatası veya responsive render kilitlenmesi olabilir."
    });

    if (retry < MAX_RETRIES) state.retryTasks.push({ ...task, retry: retry + 1 });

    return { ok: false, url, viewport: viewport.name, error: errorMessage };
  } finally {
    try {
      if (context) await context.close();
    } catch {
      // geç
    }
  }
}

async function workerLoop(workerId, browser, queue) {
  while (queue.length > 0) {
    if (workerId >= activeConcurrency) {
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }

    const task = queue.shift();
    if (!task) break;

    const mem = process.memoryUsage();
    const heapMb = Math.round(mem.heapUsed / 1024 / 1024);

    if (heapMb > 1300) {
      state.memoryPressureCount++;
      activeConcurrency = Math.max(4, Math.floor(activeConcurrency * 0.8));
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    process.stdout.write(`Worker ${workerId + 1}/${activeConcurrency} ${task.viewport.name} ${task.url}\n`);
    await runPageTask(browser, task);
  }
}

function buildSeedUrls(sitemapUrls) {
  const urls = new Set();

  for (const domain of DOMAINS) {
    for (const p of TEST_PATHS) {
      const n = normalizeUrl(p, domain);
      if (n && !isDangerousUrl(n)) urls.add(n);
    }
  }

  for (const url of sitemapUrls) {
    if (urls.size >= MAX_PAGES) break;
    const n = normalizeUrl(url, BASE_URL);
    if (n && sameAllowedDomain(n) && !isDangerousUrl(n)) urls.add(n);
  }

  return [...urls].slice(0, MAX_PAGES);
}

function buildTasks(urls, retry = 0) {
  const tasks = [];

  for (const url of urls) {
    const normalized = normalizeUrl(url, BASE_URL);
    if (!normalized) continue;

    for (const viewport of VIEWPORTS) {
      const key = `${normalized}|${viewport.name}|${retry}`;
      if (state.seenUrls.has(key)) continue;
      state.seenUrls.add(key);

      tasks.push({ url: normalized, viewport, retry });
    }
  }

  return tasks;
}

function writeReports() {
  const summary = {
    runId: RUN_ID,
    baseUrl: BASE_URL,
    domains: DOMAINS,
    cpuCount: CPU_COUNT,
    defaultConcurrency: DEFAULT_CONCURRENCY,
    finalActiveConcurrency: activeConcurrency,
    maxPages: MAX_PAGES,
    pagesTestedCount: state.pagesTested.length,
    issueCount: state.issues.length,
    highCount: state.issues.filter(x => x.severity === "high").length,
    mediumCount: state.issues.filter(x => x.severity === "medium").length,
    lowCount: state.issues.filter(x => x.severity === "low").length,
    brokenLinksCount: state.brokenLinks.length,
    consoleErrorsCount: state.consoleErrors.length,
    networkErrorsCount: state.networkErrors.length,
    workerCrashes: state.workerCrashes,
    timeoutCount: state.timeoutCount,
    memoryPressureCount: state.memoryPressureCount
  };

  safeWriteJSON("summary.json", summary);
  safeWriteJSON("pages-tested.json", state.pagesTested);
  safeWriteJSON("broken-links.json", state.brokenLinks);
  safeWriteJSON("console-errors.json", state.consoleErrors);
  safeWriteJSON("network-errors.json", state.networkErrors);

  const lines = [];

  lines.push("# Gelinlik21 Playwright Hata Raporu");
  lines.push("");
  lines.push(`- Run ID: \`${RUN_ID}\``);
  lines.push(`- Domain sayısı: \`${DOMAINS.length}\``);
  lines.push(`- CPU/vCPU: \`${CPU_COUNT}\``);
  lines.push(`- Varsayılan concurrency: \`${DEFAULT_CONCURRENCY}\``);
  lines.push(`- Son aktif concurrency: \`${activeConcurrency}\``);
  lines.push(`- Test kaydı: \`${state.pagesTested.length}\``);
  lines.push(`- Toplam hata: \`${state.issues.length}\``);
  lines.push(`- High: \`${summary.highCount}\``);
  lines.push(`- Medium: \`${summary.mediumCount}\``);
  lines.push(`- Low: \`${summary.lowCount}\``);
  lines.push("");

  if (state.issues.length === 0) {
    lines.push("Belirgin hata bulunamadı. Yine de `screenshots` klasörü Codex AI tarafından görsel olarak incelenmelidir.");
  } else {
    for (const issue of state.issues) {
      lines.push(`## ${issue.id}. ${issue.type}`);
      lines.push("");
      lines.push(`- URL: \`${issue.url}\``);
      lines.push(`- Domain/Subdomain: \`${issue.domain}\``);
      lines.push(`- Dil: \`${issue.language}\``);
      lines.push(`- Viewport: \`${issue.viewport}\``);
      lines.push(`- Hata tipi: \`${issue.type}\``);
      lines.push(`- Önem: \`${issue.severity}\``);
      lines.push(`- Selector: \`${issue.selector || ""}\``);
      lines.push(`- Açıklama: ${issue.description || ""}`);
      lines.push(`- Kanıt: \`${issue.evidence || ""}\``);
      lines.push(`- Muhtemel tema dosyaları: \`${(issue.likelyFiles || []).join(", ")}\``);
      lines.push(`- Çözüm önerisi: ${issue.suggestion || ""}`);
      lines.push("");
    }
  }

  fs.writeFileSync(path.join(REPORT_DIR, "hatalar.md"), lines.join("\n"), "utf8");
}

async function runQueue(browser, queue, label) {
  console.log(`${label}: ${queue.length} görev`);

  const workerCount = Math.min(DEFAULT_CONCURRENCY, queue.length || 1);
  const workers = [];

  for (let i = 0; i < workerCount; i++) {
    workers.push(workerLoop(i, browser, queue));
  }

  await Promise.allSettled(workers);
}

async function main() {
  console.log("G21 audit başladı.");
  console.log(`CPU/vCPU: ${CPU_COUNT}`);
  console.log(`Hedef concurrency: ${DEFAULT_CONCURRENCY}`);
  console.log(`Aktif concurrency: ${activeConcurrency}`);

  console.log("Sitemap keşfi yapılıyor...");
  const sitemapUrls = await discoverFromSitemaps();

  const seedUrls = buildSeedUrls(sitemapUrls);
  state.discoveredUrls.push(...seedUrls);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding"
    ]
  });

  try {
    const firstQueue = buildTasks(seedUrls, 0);
    await runQueue(browser, firstQueue, "İlk test kuyruğu");

    const newUrls = [...new Set(state.discoveredUrls)]
      .map(x => normalizeUrl(x, BASE_URL))
      .filter(Boolean)
      .filter(x => sameAllowedDomain(x))
      .filter(x => !isDangerousUrl(x))
      .slice(0, MAX_PAGES);

    const secondQueue = buildTasks(newUrls, 0);
    if (secondQueue.length > 0) {
      await runQueue(browser, secondQueue, "Internal link kuyruğu");
    }

    let retryRound = 1;
    while (state.retryTasks.length > 0 && retryRound <= MAX_RETRIES) {
      const retryQueue = state.retryTasks.splice(0, state.retryTasks.length);
      await runQueue(browser, retryQueue, `Failed-only retry ${retryRound}`);
      retryRound++;
    }
  } finally {
    await browser.close().catch(() => {});
  }

  writeReports();

  console.log("");
  console.log("AUDIT BİTTİ");
  console.log("Rapor: reports/hatalar.md");
  console.log("Özet: reports/summary.json");
  console.log("Test edilen sayfalar: reports/pages-tested.json");
  console.log("Broken links: reports/broken-links.json");
  console.log("Console errors: reports/console-errors.json");
  console.log("Network errors: reports/network-errors.json");
  console.log("WebP kanıtlar: screenshots/");
  console.log("Retry/failure videoları: videos/");
}

main().catch(err => {
  console.error("KRİTİK HATA:", err.name || "Error", String(err.message || err).slice(0, 500));
  writeReports();
  process.exit(1);
});
