(() => {
  'use strict';

  const VERSION = 'nil-collection-premium-controls-v100';
  const GLOBAL_KEY = '__NIL_COLLECTION_PREMIUM_CONTROLS_V100__';

  if (window[GLOBAL_KEY]) return;
  window[GLOBAL_KEY] = true;

  const SECTION_SELECTOR = '[data-nil-main-collection="true"]';
  const GRID_SELECTOR = '[data-nil-product-grid]';
  const CARD_SELECTOR = '.product-grid__item[data-product-id], .product-grid__item';
  const STORAGE_PREFIX = 'nilCollectionGridColumns:';
  const STYLE_ID = 'nil-collection-premium-controls-v100-style';
  const LIVE_ID = 'nil-collection-live-region';

  const COLLECTION_UI_SELECTORS = [
    '.nil-main-modern-collection',
    '.nil-collection-header',
    '.nil-premium-controls',
    '.nil-quick-filter-strip',
    '.nil-premium-results-sort',
    '.nil-collection-benefits',
    '.product-grid-container',
    '.main-collection-grid',
    '.collection-wrapper',
    '.nil-collection-layout-v9',
    '.nil-products-area-v9',
    '.nil-google-filter-sidebar',
    '.nil-visual-smart-search'
  ].join(',');

  const EXCLUDED_AFTER_FOOTER_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'LINK',
    'META',
    'TEMPLATE',
    'NOSCRIPT'
  ]);

  const state = {
    observer: null,
    observerTimer: null,
    resizeTimer: null,
    filterTimer: null,
    isHydrating: false
  };

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[ıİ]/g, 'i')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[üÜ]/g, 'u')
      .replace(/[şŞ]/g, 's')
      .replace(/[öÖ]/g, 'o')
      .replace(/[çÇ]/g, 'c')
      .replace(/[âÂ]/g, 'a')
      .replace(/[îÎ]/g, 'i')
      .replace(/[ûÛ]/g, 'u')
      .replace(/&/g, ' and ')
      .replace(/[–—]/g, '-')
      .replace(/[_/|]+/g, ' ')
      .replace(/[^a-z0-9$€£.,\-\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeKey(value) {
    return normalize(value)
      .replace(/[$€£.,]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function isCollectionLikePage() {
    const body = document.body;

    if (!body) return false;

    return (
      body.classList.contains('nil-template-collection') ||
      body.classList.contains('nil-template-search') ||
      body.dataset.nilPage === 'collection' ||
      body.dataset.nilPage === 'search' ||
      body.dataset.nilTemplate === 'collection' ||
      body.dataset.nilTemplate === 'search' ||
      (window.Theme && window.Theme.template && ['collection', 'search'].includes(window.Theme.template.name))
    );
  }

  function getSections(root = document) {
    return qsa(SECTION_SELECTOR, root);
  }

  function getPrimarySection() {
    return qs(SECTION_SELECTOR);
  }

  function getSectionKey(section) {
    const pathKey = window.location.pathname.replace(/[^a-zA-Z0-9_-]/g, '_');
    const sectionKey = section?.dataset?.sectionId || section?.id || 'default';
    return STORAGE_PREFIX + pathKey + ':' + sectionKey;
  }

  function getGrid(section) {
    return qs(GRID_SELECTOR, section) || qs('.product-grid', section);
  }

  function getCards(section) {
    const grid = getGrid(section);
    if (!grid) return [];
    return qsa(CARD_SELECTOR, grid).filter((card) => card instanceof HTMLElement);
  }

  function getViewportMaxColumns() {
    const width = window.innerWidth || document.documentElement.clientWidth || 1440;

    if (width < 750) return 2;
    if (width < 990) return 3;
    if (width < 1180) return 4;

    return 5;
  }

  function clampColumns(value, section) {
    const parsed = Number.parseInt(value, 10);
    const min = window.innerWidth < 520 ? 1 : 2;
    const max = getViewportMaxColumns();

    let fallback =
      Number.parseInt(section?.style?.getPropertyValue('--nil-active-grid-columns'), 10) ||
      Number.parseInt(document.body?.dataset?.nilDefaultGridColumns, 10) ||
      4;

    fallback = Math.min(Math.max(fallback, min), max);

    if (!Number.isFinite(parsed)) return fallback;

    return Math.min(Math.max(parsed, min), max);
  }

  function setGridColumns(section, columns, persist = true) {
    if (!section) return;

    const nextColumns = clampColumns(columns, section);
    const grid = getGrid(section);

    section.style.setProperty('--nil-active-grid-columns', String(nextColumns));
    document.documentElement.style.setProperty('--nil-active-grid-columns', String(nextColumns));
    document.body.style.setProperty('--nil-active-grid-columns', String(nextColumns));
    document.body.dataset.nilGridColumns = String(nextColumns);

    if (grid) {
      grid.style.setProperty('--nil-active-grid-columns', String(nextColumns));
      grid.dataset.nilGridColumns = String(nextColumns);
    }

    qsa('[data-nil-grid-btn]', section).forEach((button) => {
      const isActive = Number.parseInt(button.dataset.cols, 10) === nextColumns;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.setAttribute('type', 'button');
    });

    if (persist) {
      try {
        window.localStorage.setItem(getSectionKey(section), String(nextColumns));
      } catch (error) {}
    }

    announce(`Grid set to ${nextColumns} columns.`);
  }

  function restoreGridColumns(section) {
    if (!section) return;

    let storedValue = null;

    try {
      storedValue = window.localStorage.getItem(getSectionKey(section));
    } catch (error) {
      storedValue = null;
    }

    const fallback =
      storedValue ||
      document.body?.dataset?.nilGridColumns ||
      document.body?.dataset?.nilDefaultGridColumns ||
      section.style.getPropertyValue('--nil-active-grid-columns') ||
      4;

    setGridColumns(section, fallback, false);
  }

  function updateSortLink(event, link) {
    if (!link || !link.dataset.sortValue) return;

    event.preventDefault();

    const currentUrl = new URL(window.location.href);
    const sortValue = link.dataset.sortValue;

    currentUrl.searchParams.set('sort_by', sortValue);
    currentUrl.searchParams.delete('page');

    window.location.href = currentUrl.toString();
  }

  function syncActiveSort(section) {
    if (!section) return;

    const currentUrl = new URL(window.location.href);
    const sortBy = currentUrl.searchParams.get('sort_by') || 'manual';

    qsa('[data-nil-sort-link]', section).forEach((link) => {
      const isActive = link.dataset.sortValue === sortBy;
      link.classList.toggle('is-active', isActive);
      link.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  function getSearchInputs(section) {
    return [
      ...qsa('[data-nil-collection-search]', section),
      ...qsa('[data-nil-search-input]', section),
      ...qsa('input[name="nil_collection_search"]', section),
      ...qsa('.nil-visual-smart-search input[type="search"]', section),
      ...qsa('.nil-visual-smart-search input[type="text"]', section)
    ].filter((input, index, list) => input && list.indexOf(input) === index);
  }

  function getPriceMinInput(section) {
    return (
      qs('[data-nil-min-price]', section) ||
      qs('[data-nil-price-min]', section) ||
      qs('input[name="nil_min_price"]', section)
    );
  }

  function getPriceMaxInput(section) {
    return (
      qs('[data-nil-max-price]', section) ||
      qs('[data-nil-price-max]', section) ||
      qs('input[name="nil_max_price"]', section)
    );
  }

  function parseMoney(value) {
    const raw = String(value || '')
      .replace(/,/g, '')
      .match(/(\d+(\.\d+)?)/);

    return raw ? Number.parseFloat(raw[1]) : 0;
  }

  function getCardPrice(card) {
    if (!card) return 0;

    const direct =
      card.dataset.productPrice ||
      card.dataset.price ||
      card.getAttribute('data-product-price') ||
      card.getAttribute('data-price');

    if (direct) return parseMoney(direct);

    const text = card.textContent || '';
    return parseMoney(text);
  }

  function buildCardSearchText(card) {
    if (!card) return '';

    if (card.dataset.nilSearchText) return card.dataset.nilSearchText;

    const parts = [
      card.dataset.productTitle,
      card.dataset.productHandle,
      card.dataset.productTags,
      card.dataset.productType,
      card.dataset.productVendor,
      card.dataset.productOptions,
      card.dataset.productColorOptions,
      card.dataset.productSizeOptions,
      card.dataset.productMetafields,
      card.textContent
    ];

    const text = normalize(parts.filter(Boolean).join(' '));
    card.dataset.nilSearchText = text;

    return text;
  }

  function getSearchQuery(section) {
    const input = getSearchInputs(section)[0];
    return normalize(input?.value || '');
  }

  function getPriceState(section) {
    const minInput = getPriceMinInput(section);
    const maxInput = getPriceMaxInput(section);

    const min = parseMoney(minInput?.value || minInput?.dataset?.value || '');
    const maxRaw = maxInput?.value || maxInput?.dataset?.value || '';
    const max = maxRaw ? parseMoney(maxRaw) : 0;

    return {
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) && max > 0 ? max : 999999999
    };
  }

  function getActiveFilterKeys(section) {
    const keys = [];

    qsa('[data-nil-filter-chip].is-active, [data-nil-filter-chip][aria-pressed="true"]', section).forEach((chip) => {
      const key = chip.dataset.filterKey || chip.dataset.filterLabel || chip.textContent;
      const normalized = normalizeKey(key);

      if (normalized && normalized !== 'all') keys.push(normalized);
    });

    return keys;
  }

  function cardMatchesFilters(card, section) {
    const text = buildCardSearchText(card);
    const query = getSearchQuery(section);
    const price = getCardPrice(card);
    const priceState = getPriceState(section);
    const activeKeys = getActiveFilterKeys(section);

    const matchesSearch = !query || text.includes(query);
    const matchesPrice = price >= priceState.min && price <= priceState.max;
    const matchesChips = !activeKeys.length || activeKeys.some((key) => text.includes(key.replace(/-/g, ' ')) || text.includes(key));

    return matchesSearch && matchesPrice && matchesChips;
  }

  function setCardVisible(card, visible) {
    if (!card) return;

    card.classList.toggle('nil-filter-hidden', !visible);
    card.toggleAttribute('hidden', !visible);

    if (visible) {
      card.style.removeProperty('display');
      card.setAttribute('aria-hidden', 'false');
    } else {
      card.style.setProperty('display', 'none', 'important');
      card.setAttribute('aria-hidden', 'true');
    }
  }

  function getCountTargets(section) {
    return [
      ...qsa('[data-nil-results-count]', section),
      ...qsa('[data-nil-visible-count]', section),
      ...qsa('.nil-results-count', section)
    ].filter((item, index, list) => item && list.indexOf(item) === index);
  }

  function ensureEmptyState(section) {
    let empty = qs('[data-nil-filter-empty]', section);

    if (!empty) {
      const grid = getGrid(section);

      if (!grid || !grid.parentElement) return null;

      empty = document.createElement('div');
      empty.className = 'nil-filter-empty';
      empty.dataset.nilFilterEmpty = 'true';
      empty.textContent = 'No products found. Try fewer filters.';
      grid.parentElement.appendChild(empty);
    }

    return empty;
  }

  function applyFilters(section) {
    if (!section) return;

    section.classList.add('nil-is-filtering');

    const cards = getCards(section);
    let visibleCount = 0;

    cards.forEach((card) => {
      const visible = cardMatchesFilters(card, section);
      setCardVisible(card, visible);

      if (visible) visibleCount += 1;
    });

    getCountTargets(section).forEach((target) => {
      target.textContent = String(visibleCount || cards.length);
    });

    const empty = ensureEmptyState(section);

    if (empty) {
      empty.classList.toggle('is-visible', cards.length > 0 && visibleCount === 0);
    }

    window.clearTimeout(state.filterTimer);

    state.filterTimer = window.setTimeout(() => {
      section.classList.remove('nil-is-filtering');
    }, 180);

    announce(`${visibleCount || cards.length} products visible.`);
  }

  function resetFilters(section) {
    if (!section) return;

    getSearchInputs(section).forEach((input) => {
      input.value = '';
    });

    const minInput = getPriceMinInput(section);
    const maxInput = getPriceMaxInput(section);

    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';

    qsa('[data-nil-filter-chip]', section).forEach((chip) => {
      chip.classList.remove('is-active');
      chip.setAttribute('aria-pressed', 'false');
    });

    applyFilters(section);
  }

  function bindSearch(section) {
    getSearchInputs(section).forEach((input) => {
      if (input.dataset.nilBoundSearch === 'true') return;

      input.dataset.nilBoundSearch = 'true';
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('spellcheck', 'false');

      input.addEventListener('input', () => {
        window.clearTimeout(input.nilSearchTimer);

        input.nilSearchTimer = window.setTimeout(() => {
          applyFilters(section);
        }, 120);
      });
    });
  }

  function bindPrice(section) {
    [getPriceMinInput(section), getPriceMaxInput(section)].filter(Boolean).forEach((input) => {
      if (input.dataset.nilBoundPrice === 'true') return;

      input.dataset.nilBoundPrice = 'true';

      input.addEventListener('input', () => {
        window.clearTimeout(input.nilPriceTimer);

        input.nilPriceTimer = window.setTimeout(() => {
          applyFilters(section);
        }, 180);
      });
    });
  }

  function bindFilterChips(section) {
    qsa('[data-nil-filter-chip]', section).forEach((chip) => {
      if (chip.dataset.nilBoundChip === 'true') return;

      chip.dataset.nilBoundChip = 'true';
      chip.setAttribute('type', 'button');

      if (!chip.hasAttribute('aria-pressed')) {
        chip.setAttribute('aria-pressed', 'false');
      }

      chip.addEventListener('click', () => {
        const key = normalizeKey(chip.dataset.filterKey || chip.dataset.filterLabel || chip.textContent);

        if (key === 'all') {
          resetFilters(section);
          return;
        }

        const nextState = chip.getAttribute('aria-pressed') !== 'true';

        chip.classList.toggle('is-active', nextState);
        chip.setAttribute('aria-pressed', nextState ? 'true' : 'false');

        applyFilters(section);
      });
    });
  }

  function bindResetButtons(section) {
    qsa('[data-nil-clear-all], [data-nil-reset-filters], .nil-filter-reset', section).forEach((button) => {
      if (button.dataset.nilBoundReset === 'true') return;

      button.dataset.nilBoundReset = 'true';
      button.setAttribute('type', 'button');

      button.addEventListener('click', () => {
        resetFilters(section);
      });
    });
  }

  function bindGridButtons(section) {
    qsa('[data-nil-grid-btn]', section).forEach((button) => {
      if (button.dataset.nilBoundGrid === 'true') return;

      button.dataset.nilBoundGrid = 'true';
      button.setAttribute('type', 'button');

      button.addEventListener('click', () => {
        setGridColumns(section, button.dataset.cols, true);
      });
    });
  }

  function bindSortLinks(section) {
    qsa('[data-nil-sort-link]', section).forEach((link) => {
      if (link.dataset.nilBoundSort === 'true') return;

      link.dataset.nilBoundSort = 'true';

      link.addEventListener('click', (event) => {
        updateSortLink(event, link);
      });
    });

    syncActiveSort(section);
  }

  function prepareCards(section) {
    getCards(section).forEach((card, index) => {
      card.dataset.nilCardIndex = String(index + 1);

      if (!card.dataset.productPrice) {
        const parsedPrice = getCardPrice(card);

        if (parsedPrice) {
          card.dataset.productPrice = String(parsedPrice);
        }
      }

      buildCardSearchText(card);
    });
  }

  function ensureLiveRegion() {
    let live = document.getElementById(LIVE_ID);

    if (!live) {
      live = document.createElement('div');
      live.id = LIVE_ID;
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      live.className = 'nil-visually-hidden';
      document.body.appendChild(live);
    }

    return live;
  }

  function announce(message) {
    const live = ensureLiveRegion();

    if (!live) return;

    live.textContent = '';

    window.setTimeout(() => {
      live.textContent = message;
    }, 20);
  }

  function textLooksLikeDuplicateCollection(text) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();

    if (!normalized) return false;

    const hasLuxuryText =
      normalized.includes('Luxury Bridal Collection') ||
      normalized.includes('Search all dresses') ||
      normalized.includes('Search all products');

    const hasControlText =
      normalized.includes('SORT BY:') ||
      normalized.includes('MIN PRICE') ||
      normalized.includes('MAX PRICE') ||
      normalized.includes('COLUMNS:');

    const hasProductText =
      normalized.includes('View Dress') &&
      (
        normalized.includes('Wedding Dress') ||
        normalized.includes('G21-') ||
        normalized.includes('NIL-')
      );

    return hasLuxuryText && (hasControlText || hasProductText);
  }

  function nodeLooksLikeDuplicateCollection(node) {
    if (!node) return false;

    if (node.nodeType === Node.TEXT_NODE) {
      return textLooksLikeDuplicateCollection(node.textContent);
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    const element = node;

    if (EXCLUDED_AFTER_FOOTER_TAGS.has(element.tagName)) return false;
    if (element.id === 'nil-main-footer') return false;
    if (element.id === 'MainContent') return false;
    if (element.id === 'header-group') return false;
    if (element.closest && element.closest('#MainContent')) return false;

    if (element.matches && element.matches(COLLECTION_UI_SELECTORS)) return true;
    if (element.querySelector && element.querySelector(COLLECTION_UI_SELECTORS)) return true;

    return textLooksLikeDuplicateCollection(element.textContent);
  }

  function removeCollectionFragmentsInsideFooter() {
    const footer = document.getElementById('nil-main-footer');

    if (!footer) return;

    qsa(COLLECTION_UI_SELECTORS, footer).forEach((fragment) => {
      const realFooter = fragment.closest('.nil-lux-footer');

      if (realFooter && realFooter.id && realFooter.id.startsWith('NilLuxFooter-')) return;

      fragment.remove();
    });
  }

  function removeDuplicateMainSections() {
    const main = document.getElementById('MainContent');

    if (!main) return;

    const sections = qsa(':scope > .shopify-section', main);
    let keptCollectionSection = false;

    sections.forEach((section) => {
      const hasCollectionUi = section.querySelector && section.querySelector(COLLECTION_UI_SELECTORS);

      if (!hasCollectionUi) return;

      if (!keptCollectionSection) {
        keptCollectionSection = true;
        return;
      }

      section.remove();
    });
  }

  function removeNodesAfterFooter() {
    const footer = document.getElementById('nil-main-footer');

    if (!footer) return;

    let node = footer.nextSibling;

    while (node) {
      const next = node.nextSibling;

      if (nodeLooksLikeDuplicateCollection(node)) {
        node.remove();
      }

      node = next;
    }
  }

  function guardDuplicateCollectionRender() {
    if (!isCollectionLikePage()) return;

    removeCollectionFragmentsInsideFooter();
    removeDuplicateMainSections();
    removeNodesAfterFooter();

    document.body.classList.add('nil-duplicate-collection-guard-ready');
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent = `
      .nil-visually-hidden {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      body.nil-template-collection .nil-main-modern-collection,
      body.nil-template-search .nil-main-modern-collection {
        width: 100% !important;
        background:
          radial-gradient(circle at 8% 0%, rgba(189, 139, 68, .10), transparent 32%),
          linear-gradient(180deg, #fffaf2 0%, #fffdf8 48%, #fffaf2 100%) !important;
        padding-top: clamp(12px, 1.5vw, 22px) !important;
        padding-bottom: clamp(44px, 4vw, 74px) !important;
        overflow: visible !important;
      }

      body.nil-template-collection .nil-main-modern-collection__inner,
      body.nil-template-search .nil-main-modern-collection__inner {
        width: min(100%, 1640px) !important;
        margin-inline: auto !important;
      }

      body.nil-template-collection .nil-premium-controls,
      body.nil-template-search .nil-premium-controls {
        position: relative !important;
        z-index: 12 !important;
        width: 100% !important;
        margin: 0 auto 16px !important;
        padding: clamp(10px, 1.2vw, 16px) !important;
        border: 1px solid rgba(217, 184, 120, .34) !important;
        border-radius: 20px !important;
        background:
          radial-gradient(circle at 94% 10%, rgba(217, 184, 120, .22), transparent 28%),
          linear-gradient(135deg, #16110d, #2b1c10 52%, #12100e) !important;
        color: #fff !important;
        box-shadow: 0 18px 46px rgba(55, 32, 12, .14) !important;
        overflow: visible !important;
      }

      body.nil-template-collection .nil-premium-controls__scroll,
      body.nil-template-search .nil-premium-controls__scroll {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px 14px !important;
        overflow-x: auto !important;
        scrollbar-width: thin !important;
      }

      body.nil-template-collection .nil-premium-sort,
      body.nil-template-search .nil-premium-sort,
      body.nil-template-collection .nil-grid-selector,
      body.nil-template-search .nil-grid-selector {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 8px !important;
      }

      body.nil-template-collection .nil-premium-sort span,
      body.nil-template-search .nil-premium-sort span,
      body.nil-template-collection .nil-grid-selector span,
      body.nil-template-search .nil-grid-selector span {
        color: rgba(255, 255, 255, .72) !important;
        font-size: 11px !important;
        font-weight: 900 !important;
        letter-spacing: .12em !important;
        text-transform: uppercase !important;
      }

      body.nil-template-collection [data-nil-sort-link],
      body.nil-template-search [data-nil-sort-link],
      body.nil-template-collection [data-nil-grid-btn],
      body.nil-template-search [data-nil-grid-btn] {
        min-height: 34px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 8px 12px !important;
        border: 1px solid rgba(217, 184, 120, .22) !important;
        border-radius: 999px !important;
        background: rgba(255, 255, 255, .06) !important;
        color: rgba(255, 255, 255, .88) !important;
        font-size: 12px !important;
        font-weight: 750 !important;
        line-height: 1 !important;
        text-decoration: none !important;
        cursor: pointer !important;
        transition: transform .18s ease, background .18s ease, border-color .18s ease, color .18s ease !important;
      }

      body.nil-template-collection [data-nil-sort-link]:hover,
      body.nil-template-search [data-nil-sort-link]:hover,
      body.nil-template-collection [data-nil-grid-btn]:hover,
      body.nil-template-search [data-nil-grid-btn]:hover {
        transform: translateY(-1px) !important;
        border-color: rgba(217, 184, 120, .56) !important;
        background: rgba(255, 255, 255, .12) !important;
        color: #fff !important;
      }

      body.nil-template-collection [data-nil-sort-link].is-active,
      body.nil-template-search [data-nil-sort-link].is-active,
      body.nil-template-collection [data-nil-grid-btn].is-active,
      body.nil-template-search [data-nil-grid-btn].is-active {
        border-color: rgba(240, 207, 145, .92) !important;
        background: linear-gradient(135deg, #c4944d, #e5c27e) !important;
        color: #17110c !important;
        box-shadow: 0 8px 20px rgba(217, 184, 120, .22) !important;
      }

      body.nil-template-collection .nil-products-area-v9,
      body.nil-template-search .nil-products-area-v9 {
        background: rgba(255, 253, 248, .96) !important;
        border: 1px solid rgba(217, 184, 120, .22) !important;
        border-radius: 24px !important;
        padding: clamp(10px, 1.4vw, 18px) !important;
        box-shadow: 0 14px 42px rgba(79, 47, 14, .055) !important;
      }

      body.nil-template-collection [data-nil-product-grid],
      body.nil-template-search [data-nil-product-grid] {
        display: grid !important;
        grid-template-columns: repeat(var(--nil-active-grid-columns, 4), minmax(0, 1fr)) !important;
        gap: clamp(12px, 1.6vw, 24px) !important;
        align-items: stretch !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        list-style: none !important;
      }

      body.nil-template-collection .product-grid__item,
      body.nil-template-search .product-grid__item {
        min-width: 0 !important;
        animation: nilCollectionCardIn .26s ease both;
      }

      body.nil-template-collection .nil-main-modern-card,
      body.nil-template-search .nil-main-modern-card,
      body.nil-template-collection .product-card,
      body.nil-template-search .product-card {
        height: 100% !important;
        border: 1px solid rgba(217, 184, 120, .28) !important;
        border-radius: 20px !important;
        background: #fff !important;
        box-shadow: 0 12px 34px rgba(72, 43, 14, .08) !important;
        overflow: hidden !important;
        transition: transform .24s ease, box-shadow .24s ease, border-color .24s ease !important;
      }

      body.nil-template-collection .nil-main-modern-card:hover,
      body.nil-template-search .nil-main-modern-card:hover,
      body.nil-template-collection .product-card:hover,
      body.nil-template-search .product-card:hover {
        transform: translateY(-4px) !important;
        border-color: rgba(196, 148, 77, .72) !important;
        box-shadow: 0 22px 54px rgba(72, 43, 14, .16) !important;
      }

      body.nil-template-collection .nil-main-modern-card__media,
      body.nil-template-search .nil-main-modern-card__media {
        display: block !important;
        aspect-ratio: 3 / 4 !important;
        background: #fff8ee !important;
        overflow: hidden !important;
      }

      body.nil-template-collection .nil-main-modern-card__media img,
      body.nil-template-search .nil-main-modern-card__media img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        transition: transform .42s ease, filter .42s ease !important;
      }

      body.nil-template-collection .nil-main-modern-card:hover .nil-main-modern-card__media img,
      body.nil-template-search .nil-main-modern-card:hover .nil-main-modern-card__media img {
        transform: scale(1.035) !important;
        filter: contrast(1.04) saturate(1.05) !important;
      }

      body.nil-template-collection .nil-main-modern-card__body,
      body.nil-template-search .nil-main-modern-card__body {
        padding: 14px !important;
        background: linear-gradient(180deg, #fff, #fffaf3) !important;
      }

      body.nil-template-collection .nil-main-modern-card__title,
      body.nil-template-search .nil-main-modern-card__title {
        color: #1f1812 !important;
        font-size: 13px !important;
        font-weight: 850 !important;
        line-height: 1.35 !important;
        text-decoration: none !important;
      }

      body.nil-template-collection .nil-main-modern-card__price,
      body.nil-template-search .nil-main-modern-card__price {
        display: block !important;
        margin-top: 8px !important;
        color: #8a5d1c !important;
        font-size: 14px !important;
        font-weight: 950 !important;
      }

      body.nil-template-collection .nil-main-modern-card__button,
      body.nil-template-search .nil-main-modern-card__button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin-top: 10px !important;
        min-height: 34px !important;
        padding: 8px 14px !important;
        border-radius: 999px !important;
        background: #111 !important;
        color: #fff !important;
        font-size: 12px !important;
        font-weight: 850 !important;
        text-decoration: none !important;
      }

      body.nil-template-collection .nil-filter-empty,
      body.nil-template-search .nil-filter-empty {
        display: none !important;
        margin: 22px auto !important;
        padding: 18px !important;
        border: 1px solid rgba(196, 148, 77, .28) !important;
        border-radius: 18px !important;
        background: #fffaf3 !important;
        color: #3a2d1d !important;
        font-weight: 800 !important;
        text-align: center !important;
      }

      body.nil-template-collection .nil-filter-empty.is-visible,
      body.nil-template-search .nil-filter-empty.is-visible {
        display: block !important;
      }

      body.nil-template-collection .nil-is-filtering [data-nil-product-grid],
      body.nil-template-search .nil-is-filtering [data-nil-product-grid] {
        opacity: .72 !important;
        transition: opacity .18s ease !important;
      }

      body.nil-template-collection #nil-main-footer ~ .nil-main-modern-collection,
      body.nil-template-collection #nil-main-footer ~ .nil-collection-header,
      body.nil-template-collection #nil-main-footer ~ .nil-premium-controls,
      body.nil-template-collection #nil-main-footer ~ .product-grid-container,
      body.nil-template-collection #nil-main-footer ~ .main-collection-grid,
      body.nil-template-collection #nil-main-footer ~ .collection-wrapper,
      body.nil-template-collection #nil-main-footer ~ .nil-collection-layout-v9,
      body.nil-template-collection #nil-main-footer ~ .nil-products-area-v9,
      body.nil-template-collection #nil-main-footer ~ .nil-google-filter-sidebar,
      body.nil-template-collection #nil-main-footer ~ .nil-visual-smart-search,
      body.nil-template-collection #nil-main-footer ~ *:has(.nil-main-modern-collection),
      body.nil-template-collection #nil-main-footer ~ *:has(.nil-premium-controls),
      body.nil-template-collection #nil-main-footer ~ *:has(.product-grid-container),
      body.nil-template-collection #nil-main-footer ~ *:has(.main-collection-grid),
      body.nil-template-collection #nil-main-footer ~ *:has(.nil-products-area-v9) {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        pointer-events: none !important;
      }

      @keyframes nilCollectionCardIn {
        from {
          opacity: .001;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 1180px) {
        body.nil-template-collection [data-nil-product-grid],
        body.nil-template-search [data-nil-product-grid] {
          grid-template-columns: repeat(min(var(--nil-active-grid-columns, 3), 4), minmax(0, 1fr)) !important;
        }
      }

      @media (max-width: 989px) {
        body.nil-template-collection [data-nil-product-grid],
        body.nil-template-search [data-nil-product-grid] {
          grid-template-columns: repeat(min(var(--nil-active-grid-columns, 3), 3), minmax(0, 1fr)) !important;
        }
      }

      @media (max-width: 749px) {
        body.nil-template-collection .nil-premium-controls,
        body.nil-template-search .nil-premium-controls {
          border-radius: 16px !important;
        }

        body.nil-template-collection [data-nil-product-grid],
        body.nil-template-search [data-nil-product-grid] {
          grid-template-columns: repeat(min(var(--nil-active-grid-columns, 2), 2), minmax(0, 1fr)) !important;
          gap: 12px !important;
        }

        body.nil-template-collection .nil-main-modern-card__body,
        body.nil-template-search .nil-main-modern-card__body {
          padding: 10px !important;
        }

        body.nil-template-collection .nil-main-modern-card__title,
        body.nil-template-search .nil-main-modern-card__title {
          font-size: 11px !important;
        }
      }

      @media (max-width: 420px) {
        body.nil-template-collection [data-nil-product-grid],
        body.nil-template-search [data-nil-product-grid] {
          grid-template-columns: repeat(1, minmax(0, 1fr)) !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        body.nil-template-collection *,
        body.nil-template-search * {
          animation: none !important;
          transition: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function bindSection(section) {
    if (!section) return;

    if (section.dataset.nilCollectionBound === 'true') {
      restoreGridColumns(section);
      syncActiveSort(section);
      applyFilters(section);
      return;
    }

    section.dataset.nilCollectionBound = 'true';

    prepareCards(section);
    bindGridButtons(section);
    bindSortLinks(section);
    bindSearch(section);
    bindPrice(section);
    bindFilterChips(section);
    bindResetButtons(section);
    restoreGridColumns(section);
    syncActiveSort(section);
    applyFilters(section);
  }

  function hydrate(root = document) {
    if (state.isHydrating) return;

    state.isHydrating = true;

    try {
      injectStyles();
      guardDuplicateCollectionRender();

      getSections(root).forEach((section) => {
        bindSection(section);
      });

      guardDuplicateCollectionRender();
    } finally {
      state.isHydrating = false;
    }
  }

  function scheduleHydrate(root = document, delay = 80) {
    window.clearTimeout(state.observerTimer);

    state.observerTimer = window.setTimeout(() => {
      hydrate(root);
    }, delay);
  }

  function bindGlobalResize() {
    window.addEventListener(
      'resize',
      () => {
        window.clearTimeout(state.resizeTimer);

        state.resizeTimer = window.setTimeout(() => {
          getSections().forEach((section) => restoreGridColumns(section));
          guardDuplicateCollectionRender();
        }, 150);
      },
      { passive: true }
    );
  }

  function bindShopifyEvents() {
    document.addEventListener('shopify:section:load', (event) => {
      hydrate(event.target || document);
    });

    document.addEventListener('shopify:section:select', (event) => {
      hydrate(event.target || document);
    });

    document.addEventListener('shopify:section:reorder', (event) => {
      hydrate(event.target || document);
    });

    document.addEventListener('shopify:block:select', (event) => {
      hydrate(event.target || document);
    });
  }

  function startObserver() {
    if (!window.MutationObserver || state.observer) return;

    state.observer = new MutationObserver((mutations) => {
      let shouldRun = false;

      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;

        for (const node of mutation.addedNodes) {
          if (!node) continue;

          if (
            node.nodeType === Node.ELEMENT_NODE &&
            (
              node.matches?.(SECTION_SELECTOR) ||
              node.matches?.(COLLECTION_UI_SELECTORS) ||
              node.querySelector?.(SECTION_SELECTOR) ||
              node.querySelector?.(COLLECTION_UI_SELECTORS) ||
              nodeLooksLikeDuplicateCollection(node)
            )
          ) {
            shouldRun = true;
            break;
          }

          if (node.nodeType === Node.TEXT_NODE && nodeLooksLikeDuplicateCollection(node)) {
            shouldRun = true;
            break;
          }
        }

        if (shouldRun) break;
      }

      if (shouldRun) {
        scheduleHydrate(document, 60);
      }
    });

    state.observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function boot() {
    if (!isCollectionLikePage()) return;

    hydrate();
    bindGlobalResize();
    bindShopifyEvents();
    startObserver();

    window.NILCollectionPremiumControls = {
      hydrate,
      applyFilters: () => getSections().forEach(applyFilters),
      guardDuplicateCollectionRender,
      setGridColumns: (columns) => getSections().forEach((section) => setGridColumns(section, columns, true)),
      resetFilters: () => getSections().forEach(resetFilters)
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', () => {
    guardDuplicateCollectionRender();
    scheduleHydrate(document, 40);
  });
})();