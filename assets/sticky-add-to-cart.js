import { Component } from '@theme/component';
import { ThemeEvents, QuantitySelectorUpdateEvent } from '@theme/events';
import { morph } from '@theme/morph';
import { onAnimationEnd } from '@theme/utilities';

/**
 * @typedef {HTMLElement & {
 *   source: Element,
 *   destination: Element,
 *   useSourceSize: string | boolean
 * }} FlyToCart
 */

/**
 * Sticky Add To Cart
 * - Original add-to-cart trigger is preserved.
 * - Shows after the main buy button scrolls above the viewport.
 * - Hides when the main buy area is visible again.
 * - Hides after 5 seconds of no interaction.
 * - Does not depend on heavy libraries, images, fonts, or layout rebuilds.
 */
class StickyAddToCartComponent extends Component {
  requiredRefs = ['stickyBar', 'addToCartButton', 'quantityDisplay', 'quantityNumber'];

  /** @type {IntersectionObserver | null} */
  #buyButtonsIntersectionObserver = null;

  /** @type {IntersectionObserver | null} */
  #mainBottomObserver = null;

  /** @type {AbortController} */
  #abortController = new AbortController();

  /** @type {number | undefined} */
  #resetTimeout;

  /** @type {number | null} */
  #idleHideTimeout = null;

  /** @type {HTMLButtonElement | null} */
  #targetAddToCartButton = null;

  /** @type {HTMLElement | null} */
  #buyButtonsBlock = null;

  /** @type {HTMLElement | null} */
  #productPointerArea = null;

  /** @type {number} */
  #currentQuantity = 1;

  /** @type {number} */
  #idleHideDelay = 5000;

  /** @type {boolean} */
  #isStuck = false;

  /** @type {boolean} */
  #stickyEligibleByScroll = false;

  /** @type {boolean} */
  #hiddenByBottom = false;

  /** @type {boolean} */
  #isPointerInsideProductArea = false;

  /** @type {boolean} */
  #isPointerInsideStickyBar = false;

  connectedCallback() {
    super.connectedCallback();

    this.#setupIntersectionObserver();

    const { signal } = this.#abortController;
    const section = this.closest('.shopify-section');

    section?.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate, { signal });
    section?.addEventListener(ThemeEvents.variantSelected, this.#handleVariantSelected, { signal });

    document.addEventListener(ThemeEvents.cartUpdate, this.#handleCartAddComplete, { signal });
    document.addEventListener(ThemeEvents.cartError, this.#handleCartAddComplete, { signal });
    document.addEventListener(ThemeEvents.quantitySelectorUpdate, this.#handleQuantityUpdate, { signal });

    document.addEventListener('pointermove', this.#handlePointerMove, { signal, passive: true });
    window.addEventListener('scroll', this.#handleScroll, { signal, passive: true });
    window.addEventListener('resize', this.#updateSafeBottomOffset, { signal, passive: true });

    this.refs.stickyBar?.addEventListener('pointerenter', this.#handleStickyPointerEnter, { signal });
    this.refs.stickyBar?.addEventListener('pointerleave', this.#handleStickyPointerLeave, { signal });

    this.#getInitialQuantity();
    this.#enhanceLuxuryLayout();
    this.#updateSafeBottomOffset();

    window.setTimeout(this.#refreshVisibilityFromPosition, 150);
    window.setTimeout(this.#updateSafeBottomOffset, 350);
    window.setTimeout(this.#updateSafeBottomOffset, 1200);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#buyButtonsIntersectionObserver?.disconnect();
    this.#mainBottomObserver?.disconnect();
    this.#abortController.abort();
    this.#clearIdleHideTimeout();

    if (this.#resetTimeout) {
      clearTimeout(this.#resetTimeout);
    }
  }

  /**
   * Finds the original product form and observes the original buy button area.
   * The footer observer is optional. If footer is not found, sticky still works.
   */
  #setupIntersectionObserver() {
    const productForm = this.#getProductForm();
    if (!productForm) return;

    const addToCartButton =
      productForm.querySelector('[ref="addToCartButton"]') ||
      productForm.querySelector('.add-to-cart-button') ||
      productForm.querySelector('button[type="submit"]');

    const buyButtonsBlock =
      productForm.closest('.buy-buttons-block') ||
      addToCartButton?.closest('.buy-buttons-block') ||
      addToCartButton?.closest('.product-form-buttons') ||
      productForm;

    if (!(buyButtonsBlock instanceof HTMLElement)) return;

    this.#buyButtonsBlock = buyButtonsBlock;
    this.#targetAddToCartButton = addToCartButton instanceof HTMLButtonElement ? addToCartButton : null;
    this.#productPointerArea = this.#getProductPointerArea(productForm, buyButtonsBlock);

    this.#buyButtonsIntersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;

        const rect = entry.target.getBoundingClientRect();

        if (!entry.isIntersecting && rect.bottom < 0) {
          this.#stickyEligibleByScroll = true;
        } else if (entry.isIntersecting || rect.top >= 0) {
          this.#stickyEligibleByScroll = false;
          this.#hiddenByBottom = false;
        }

        this.#syncVisibility();
      },
      {
        threshold: [0, 0.01, 0.5, 1],
      }
    );

    this.#buyButtonsIntersectionObserver.observe(buyButtonsBlock);

    const footer = document.querySelector('footer') ?? document.querySelector('[class*="footer-group"]');

    if (footer) {
      this.#mainBottomObserver = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (!entry) return;

          if (entry.isIntersecting) {
            this.#hiddenByBottom = true;
          } else {
            this.#hiddenByBottom = false;
          }

          this.#refreshVisibilityFromPosition();
        },
        {
          rootMargin: '220px 0px 0px 0px',
        }
      );

      this.#mainBottomObserver.observe(footer);
    }

    this.#refreshVisibilityFromPosition();
  }

  /**
   * Product area must be narrow enough to avoid hiding the popup on the whole product page.
   * Previous broad section targeting can make the popup never appear.
   *
   * @param {HTMLElement} productForm
   * @param {HTMLElement} buyButtonsBlock
   * @returns {HTMLElement}
   */
  #getProductPointerArea(productForm, buyButtonsBlock) {
    return (
      productForm.closest(
        '.product__info-wrapper, .product__info-container, .product-information, .product-details, .product__details, [data-product-info]'
      ) ||
      buyButtonsBlock ||
      productForm
    );
  }

  #handleScroll = () => {
    this.#refreshVisibilityFromPosition();
    this.#updateSafeBottomOffset();
  };

  #refreshVisibilityFromPosition = () => {
    if (!this.#buyButtonsBlock) return;

    const rect = this.#buyButtonsBlock.getBoundingClientRect();

    this.#stickyEligibleByScroll = rect.bottom < 0;

    if (rect.top >= 0) {
      this.#stickyEligibleByScroll = false;
      this.#hiddenByBottom = false;
    }

    this.#syncVisibility();
  };

  /**
   * Mouse-sensitive behavior:
   * - If user comes back to the product info/buy area, hide.
   * - If user leaves that area and original buy buttons are above viewport, show again.
   *
   * @param {PointerEvent} event
   */
  #handlePointerMove = (event) => {
    const target = event.target;

    if (target instanceof Node && this.refs.stickyBar?.contains(target)) {
      this.#isPointerInsideStickyBar = true;
      this.#clearIdleHideTimeout();
      return;
    }

    this.#isPointerInsideStickyBar = false;

    this.#isPointerInsideProductArea = Boolean(
      target instanceof Node && this.#productPointerArea && this.#productPointerArea.contains(target)
    );

    this.#syncVisibility();
  };

  #handleStickyPointerEnter = () => {
    this.#isPointerInsideStickyBar = true;
    this.#clearIdleHideTimeout();
  };

  #handleStickyPointerLeave = () => {
    this.#isPointerInsideStickyBar = false;
    this.#armIdleHide();
  };

  #syncVisibility() {
    if (this.#canShowStickyBar()) {
      this.#showStickyBar();
      return;
    }

    if (!this.#stickyEligibleByScroll || this.#hiddenByBottom || this.#isPointerInsideProductArea) {
      this.#hideStickyBar();
    }
  }

  #canShowStickyBar() {
    return this.#stickyEligibleByScroll && !this.#hiddenByBottom && !this.#isPointerInsideProductArea;
  }

  /**
   * Uses the real product page add-to-cart button.
   * This preserves the existing Shopify cart behavior.
   */
  handleAddToCartClick = async () => {
    if (!this.#targetAddToCartButton) return;

    this.#targetAddToCartButton.dataset.puppet = 'true';
    this.#targetAddToCartButton.click();

    const cartIcon = document.querySelector('.header-actions__cart-icon');

    if (this.refs.addToCartButton.dataset.added !== 'true') {
      this.refs.addToCartButton.dataset.added = 'true';
    }

    if (!cartIcon || !this.refs.addToCartButton || !this.refs.productImage) return;

    if (this.#resetTimeout) clearTimeout(this.#resetTimeout);

    const flyToCartElement = /** @type {FlyToCart} */ (document.createElement('fly-to-cart'));

    flyToCartElement.classList.add('fly-to-cart--sticky');
    flyToCartElement.style.setProperty('background-image', `url(${this.refs.productImage.src})`);
    flyToCartElement.useSourceSize = 'true';
    flyToCartElement.source = this.refs.productImage;
    flyToCartElement.destination = cartIcon;

    document.body.appendChild(flyToCartElement);

    await onAnimationEnd([this.refs.addToCartButton, flyToCartElement]);

    this.#resetTimeout = setTimeout(() => {
      this.refs.addToCartButton.removeAttribute('data-added');
    }, 800);
  };

  /**
   * @param {CustomEvent} event
   */
  #handleVariantUpdate = (event) => {
    if (event.detail.data.productId !== this.dataset.productId) return;

    const variant = event.detail.resource;
    const newStickyAddToCart = event.detail.data.html.querySelector('sticky-add-to-cart');
    if (!newStickyAddToCart) return;

    const newStickyBar = newStickyAddToCart.querySelector('[ref="stickyBar"]');
    if (!newStickyBar) return;

    const currentStuck = this.refs.stickyBar.getAttribute('data-stuck') || 'false';
    const variantAvailable = newStickyAddToCart.dataset.variantAvailable;

    morph(this.refs.stickyBar, newStickyBar, { childrenOnly: true });

    this.refs.stickyBar.setAttribute('data-stuck', currentStuck);
    this.dataset.variantAvailable = variantAvailable;

    if (variant && variant.id) {
      this.dataset.currentVariantId = variant.id;
    }

    const productForm = this.#getProductForm();

    if (productForm) {
      const button =
        productForm.querySelector('[ref="addToCartButton"]') ||
        productForm.querySelector('.add-to-cart-button') ||
        productForm.querySelector('button[type="submit"]');

      this.#targetAddToCartButton = button instanceof HTMLButtonElement ? button : null;
      this.#productPointerArea = this.#getProductPointerArea(productForm, this.#buyButtonsBlock || productForm);
    }

    if (variant == null) {
      this.#handleVariantUnavailable();
    }

    this.#updateButtonText();
    this.#enhanceLuxuryLayout();
    this.#updateSafeBottomOffset();
    this.#syncVisibility();
  };

  /**
   * @param {CustomEvent} event
   */
  #handleVariantSelected = (event) => {
    const variantId = event.detail.resource?.id;
    if (!variantId) return;

    this.dataset.currentVariantId = variantId;
  };

  #handleVariantUnavailable = () => {
    this.dataset.currentVariantId = '';
    this.#hideVariantLine();
  };

  #handleCartAddComplete = () => {
    if (this.#targetAddToCartButton) {
      this.#targetAddToCartButton.dataset.puppet = 'false';
    }
  };

  /**
   * @param {QuantitySelectorUpdateEvent} event
   */
  #handleQuantityUpdate = (event) => {
    if (event.detail.cartLine) return;

    this.#currentQuantity = event.detail.quantity;
    this.#updateButtonText();
  };

  #showStickyBar() {
    if (this.#isStuck && this.refs.stickyBar.dataset.stuck === 'true') {
      this.#armIdleHide();
      return;
    }

    this.#enhanceLuxuryLayout();

    this.#isStuck = true;
    this.refs.stickyBar.dataset.stuck = 'true';
    this.refs.stickyBar.classList.add('nil-sticky-ready');

    this.#armIdleHide();
  }

  #hideStickyBar() {
    if (!this.refs.stickyBar) return;

    this.#isStuck = false;
    this.refs.stickyBar.dataset.stuck = 'false';

    this.#clearIdleHideTimeout();
  }

  #armIdleHide() {
    this.#clearIdleHideTimeout();

    if (!this.#isStuck || this.#isPointerInsideStickyBar) return;

    this.#idleHideTimeout = window.setTimeout(() => {
      if (!this.#isPointerInsideStickyBar) {
        this.#hideStickyBar();
      }
    }, this.#idleHideDelay);
  }

  #clearIdleHideTimeout() {
    if (this.#idleHideTimeout) {
      clearTimeout(this.#idleHideTimeout);
      this.#idleHideTimeout = null;
    }
  }

  #getProductForm() {
    const productId = this.dataset.productId;
    if (!productId) return null;

    const sectionElement = this.closest('.shopify-section');
    if (!sectionElement) return null;

    const sectionId = sectionElement.id.replace('shopify-section-', '');

    return document.querySelector(
      `#shopify-section-${sectionId} product-form-component[data-product-id="${productId}"]`
    );
  }

  #getInitialQuantity() {
    this.#currentQuantity = parseInt(this.dataset.initialQuantity || '1') || 1;
    this.#updateButtonText();
  }

  #updateButtonText() {
    const { addToCartButton, quantityDisplay, quantityNumber } = this.refs;
    const available = !addToCartButton.disabled;

    quantityNumber.textContent = this.#currentQuantity.toString();

    if (available && this.#currentQuantity > 1) {
      quantityDisplay.style.display = 'inline';
    } else {
      quantityDisplay.style.display = 'none';
    }
  }

  #enhanceLuxuryLayout() {
    this.#hideVariantLine();
    this.#formatProductTitle();
    this.#decorateProductImage();
    this.#markPriceAndButton();
  }

  #hideVariantLine() {
    const variantElements = this.querySelectorAll(
      '.sticky-add-to-cart__variant, .sticky-add-to-cart__variant-title, .sticky-add-to-cart__options, .sticky-add-to-cart__variant-options, [data-sticky-variant], [ref="variantTitle"]'
    );

    variantElements.forEach((element) => {
      element.setAttribute('hidden', '');
      element.setAttribute('aria-hidden', 'true');
      element.classList.add('nil-sticky-hidden-variant');
    });
  }

  #formatProductTitle() {
    const titleElement = this.#findTitleElement();
    if (!titleElement) return;

    if (titleElement.querySelector('.nil-sticky-code')) return;

    const rawTitle = titleElement.textContent?.replace(/\s+/g, ' ').trim();
    if (!rawTitle) return;

    const codeMatch = rawTitle.match(/\bNIL[-\s]?\d{1,4}\b/i);
    if (!codeMatch) return;

    const productCode = codeMatch[0].replace(/\s+/, '-').toUpperCase();

    let cleanTitle = rawTitle
      .replace(codeMatch[0], '')
      .replace(/^[-–—|:/\s]+/, '')
      .trim();

    cleanTitle = this.#removeVariantLikeText(cleanTitle);
    cleanTitle = this.#truncateText(cleanTitle, 44);

    const codeSpan = document.createElement('span');
    codeSpan.className = 'nil-sticky-code';
    codeSpan.textContent = productCode;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'nil-sticky-name';
    nameSpan.textContent = cleanTitle || 'Luxury Bridal Dress';

    titleElement.classList.add('nil-sticky-title');
    titleElement.replaceChildren(codeSpan, nameSpan);
  }

  #findTitleElement() {
    const direct =
      this.querySelector('.sticky-add-to-cart__title') ||
      this.querySelector('.sticky-add-to-cart__product-title') ||
      this.querySelector('[ref="productTitle"]') ||
      this.querySelector('[data-product-title]');

    if (direct instanceof HTMLElement) return direct;

    const candidates = Array.from(this.querySelectorAll('a, p, span, div, h1, h2, h3'));

    return (
      candidates.find((element) => {
        const text = element.textContent || '';

        if (!/\bNIL[-\s]?\d{1,4}\b/i.test(text)) return false;
        if (element.closest('button')) return false;
        if (element.querySelector('img')) return false;
        if (element.closest('[class*="price"]')) return false;

        return true;
      }) || null
    );
  }

  #removeVariantLikeText(text) {
    return text
      .replace(/\b(Ivory|Soft Ivory|Champagne|Soft Champagne|White|Blush|Black|Gold|Silver|Nude|Emerald|Green|Navy|Blue|Crimson|Red|Teal|Turquoise|Dusty|Rose|Purple)\b/gi, '')
      .replace(/\b(34|36|38|40|42|44|46|48|50|52|54|56|58|60)\b/g, '')
      .replace(/\b(Plain Veil|Complimentary|Fingertip|Chapel|Cathedral|Included|Edge|Veil|cm)\b/gi, '')
      .replace(/\s*\/\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  #truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;

    const shortened = text.slice(0, maxLength).replace(/\s+\S*$/, '').trim();

    return `${shortened || text.slice(0, maxLength).trim()}...`;
  }

  #decorateProductImage() {
    const image =
      this.refs.productImage ||
      this.querySelector('[ref="productImage"]') ||
      this.querySelector('.sticky-add-to-cart__image img') ||
      this.querySelector('img');

    if (!(image instanceof HTMLImageElement)) return;

    image.classList.add('nil-sticky-product-image');

    const frameTarget = image.parentElement;

    if (frameTarget) {
      frameTarget.classList.add('nil-sticky-product-frame');
    }
  }

  #markPriceAndButton() {
    const priceCandidates = this.querySelectorAll(
      'product-price, .price, [class*="price"], [data-price], s, compare-at-price'
    );

    priceCandidates.forEach((element) => {
      if (element instanceof HTMLElement && !element.closest('button')) {
        element.classList.add('nil-sticky-price-zone');
      }
    });

    this.refs.addToCartButton?.classList.add('nil-sticky-atc-button');
  }

  #updateSafeBottomOffset = () => {
    const stickyBar = this.refs.stickyBar;
    if (!stickyBar) return;

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    let offset = 24;

    const selectors = [
      'body > *',
      '[class*="localization"]',
      '[class*="language"]',
      '[class*="country"]',
      '[class*="currency"]',
      '[id*="preview"]',
      '[class*="preview"]',
      '[class*="admin"]',
      '[class*="toolbar"]',
      '[class*="bottom-bar"]',
      '[class*="bottom_bar"]'
    ].join(',');

    const candidates = Array.from(document.querySelectorAll(selectors));

    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      if (element === stickyBar || element.contains(stickyBar) || stickyBar.contains(element)) return;

      const style = window.getComputedStyle(element);
      const position = style.position;

      if (position !== 'fixed' && position !== 'sticky') return;
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;

      const rect = element.getBoundingClientRect();

      if (rect.height < 20 || rect.height > 180) return;
      if (rect.width < 160) return;
      if (rect.bottom < viewportHeight - 12) return;

      offset = Math.max(offset, Math.ceil(rect.height + 18));
    });

    if (window.Shopify?.designMode) {
      offset = Math.max(offset, 92);
    }

    stickyBar.style.setProperty('--nil-sticky-bottom-offset-local', `${offset}px`);
    document.documentElement.style.setProperty('--nil-sticky-bottom-offset', `${offset}px`);
  };
}

if (!customElements.get('sticky-add-to-cart')) {
  customElements.define('sticky-add-to-cart', StickyAddToCartComponent);
}
