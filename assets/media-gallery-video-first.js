class NilVideoFirstGallery extends HTMLElement {
  constructor() {
    super();

    this.abortController = null;
    this.generatedUrls = [];
    this.rampFrame = null;
    this.isReady = false;

    this.onThumbClick = this.onThumbClick.bind(this);
    this.onVariantEvent = this.onVariantEvent.bind(this);
    this.onFormChange = this.onFormChange.bind(this);
  }

  connectedCallback() {
    this.abortController = new AbortController();

    this.refresh();
    this.bindEvents();
    this.selectInitialMedia();

    if (this.dataset.generateVideoThumbnails === 'true') {
      this.generateVideoThumbnailsSafely();
    }

    this.isReady = true;
  }

  disconnectedCallback() {
    this.cleanup();
  }

  cleanup() {
    if (this.abortController) {
      this.abortController.abort();
    }

    this.stopRamp();

    this.generatedUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        // Safe cleanup only.
      }
    });

    this.generatedUrls = [];
  }

  refresh() {
    this.slides = Array.from(this.querySelectorAll('[data-nil-slide]'));
    this.thumbs = Array.from(this.querySelectorAll('[data-nil-thumb]'));
    this.videos = Array.from(this.querySelectorAll('[data-nil-video]'));

    this.setupVideos();
  }

  bindEvents() {
    const signal = this.abortController.signal;

    this.addEventListener('click', this.onThumbClick, { signal });

    const section = this.closest('[id^="shopify-section-"]') || this.closest('section') || this;

    [
      'variant:change',
      'variant:changed',
      'product:variant-change',
      'shopify:section:load'
    ].forEach((eventName) => {
      section.addEventListener(eventName, this.onVariantEvent, { signal });
    });

    const productForm = section.querySelector('form[action*="/cart/add"]');

    if (productForm) {
      productForm.addEventListener('change', this.onFormChange, { signal });
    }
  }

  setupVideos() {
    this.videos.forEach((video) => {
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('loop', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('preload', 'metadata');

      const shell = video.closest('.nil-vfg__video-shell');
      const playButton = shell ? shell.querySelector('[data-nil-manual-play]') : null;

      const markCanPlay = () => {
        if (shell) {
          shell.classList.add('is-can-play');
        }
      };

      const revealVideo = () => {
        if (!shell) return;

        if (video.currentTime > 0.03 || video.readyState >= 3) {
          shell.classList.add('is-playing');
          shell.classList.remove('is-blocked');
        }
      };

      const markBlocked = () => {
        if (shell) {
          shell.classList.remove('is-playing');
          shell.classList.add('is-blocked');
        }
      };

      video.addEventListener('loadedmetadata', markCanPlay, {
        signal: this.abortController.signal
      });

      video.addEventListener('canplay', markCanPlay, {
        signal: this.abortController.signal
      });

      video.addEventListener('playing', revealVideo, {
        signal: this.abortController.signal
      });

      video.addEventListener('timeupdate', revealVideo, {
        signal: this.abortController.signal
      });

      video.addEventListener('waiting', () => {
        if (shell) shell.classList.remove('is-playing');
      }, {
        signal: this.abortController.signal
      });

      video.addEventListener('pause', () => {
        if (!this.isActiveVideo(video)) return;
        if (shell && video.currentTime === 0) {
          shell.classList.remove('is-playing');
        }
      }, {
        signal: this.abortController.signal
      });

      if (playButton) {
        playButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.playVideoFromStart(video);
        }, {
          signal: this.abortController.signal
        });
      }

      video.play().catch(markBlocked);
    });
  }

  onThumbClick(event) {
    const thumb = event.target.closest('[data-nil-thumb]');

    if (!thumb || !this.contains(thumb)) {
      return;
    }

    event.preventDefault();

    const mediaId = thumb.dataset.mediaId;
    const mediaType = thumb.dataset.mediaType;

    this.selectMedia(mediaId, {
      resetVideo: mediaType === 'video',
      userInitiated: true
    });
  }

  onVariantEvent(event) {
    window.requestAnimationFrame(() => {
      this.refresh();

      const variant =
        event.detail?.variant ||
        event.detail?.selectedVariant ||
        event.detail?.productVariant ||
        null;

      const mediaId =
        variant?.featured_media?.id ||
        variant?.featured_media_id ||
        null;

      if (mediaId) {
        this.selectMedia(String(mediaId), {
          resetVideo: true,
          userInitiated: false
        });
        return;
      }

      this.selectFirstVideoOrFirstMedia();
    });
  }

  onFormChange() {
    window.requestAnimationFrame(() => {
      this.refresh();
      this.selectFirstVideoOrFirstMedia();
    });
  }

  selectInitialMedia() {
    const activeSlide = this.querySelector('[data-nil-slide].is-active');

    if (activeSlide) {
      this.selectMedia(activeSlide.dataset.mediaId, {
        resetVideo: true,
        userInitiated: false
      });
      return;
    }

    this.selectFirstVideoOrFirstMedia();
  }

  selectFirstVideoOrFirstMedia() {
    const firstVideoSlide = this.slides.find((slide) => {
      return slide.dataset.mediaType === 'video';
    });

    const targetSlide = firstVideoSlide || this.slides[0];

    if (!targetSlide) {
      return;
    }

    this.selectMedia(targetSlide.dataset.mediaId, {
      resetVideo: true,
      userInitiated: false
    });
  }

  selectMedia(mediaId, options = {}) {
    if (!mediaId) {
      return;
    }

    const mediaIdString = String(mediaId);

    this.pauseAllVideosExcept(mediaIdString);

    this.slides.forEach((slide) => {
      slide.classList.toggle('is-active', slide.dataset.mediaId === mediaIdString);
    });

    this.thumbs.forEach((thumb) => {
      thumb.classList.toggle('is-active', thumb.dataset.mediaId === mediaIdString);
    });

    const activeSlide = this.slides.find((slide) => {
      return slide.dataset.mediaId === mediaIdString;
    });

    if (!activeSlide) {
      return;
    }

    if (activeSlide.dataset.mediaType === 'video') {
      const video = activeSlide.querySelector('[data-nil-video]');

      if (video) {
        this.playVideoFromStart(video);
      }
    } else {
      this.stopRamp();
    }
  }

  pauseAllVideosExcept(activeMediaId) {
    this.videos.forEach((video) => {
      const mediaId = String(video.dataset.mediaId);

      if (mediaId === String(activeMediaId)) {
        return;
      }

      this.pauseAndResetVideo(video);
    });
  }

  pauseAndResetVideo(video) {
    if (!video) {
      return;
    }

    try {
      video.pause();
      video.playbackRate = 1;

      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = 0;
      }
    } catch (error) {
      // Do not break gallery.
    }

    const shell = video.closest('.nil-vfg__video-shell');

    if (shell) {
      shell.classList.remove('is-playing');
    }
  }

  playVideoFromStart(video) {
    if (!video) {
      return;
    }

    const shell = video.closest('.nil-vfg__video-shell');

    try {
      video.pause();
      video.playbackRate = 1;

      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = 0;
      }

      if (shell) {
        shell.classList.remove('is-playing');
        shell.classList.remove('is-blocked');
      }

      const playPromise = video.play();

      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise
          .then(() => {
            this.startRampIfAllowed(video);
          })
          .catch(() => {
            if (shell) {
              shell.classList.add('is-blocked');
            }
          });
      } else {
        this.startRampIfAllowed(video);
      }
    } catch (error) {
      if (shell) {
        shell.classList.add('is-blocked');
      }
    }
  }

  isActiveVideo(video) {
    const slide = video.closest('[data-nil-slide]');
    return Boolean(slide && slide.classList.contains('is-active'));
  }

  startRampIfAllowed(video) {
    if (this.dataset.slowMotion !== 'true') {
      return;
    }

    if (!video || !Number.isFinite(video.duration)) {
      return;
    }

    if (video.duration <= 0 || video.duration > 12) {
      return;
    }

    this.stopRamp();

    const step = () => {
      if (!this.isActiveVideo(video) || video.paused || video.ended) {
        video.playbackRate = 1;
        this.stopRamp();
        return;
      }

      video.playbackRate = this.getSmartPlaybackRate(video.currentTime, video.duration);
      this.rampFrame = window.requestAnimationFrame(step);
    };

    this.rampFrame = window.requestAnimationFrame(step);
  }

  stopRamp() {
    if (this.rampFrame) {
      window.cancelAnimationFrame(this.rampFrame);
      this.rampFrame = null;
    }

    this.videos?.forEach((video) => {
      try {
        video.playbackRate = 1;
      } catch (error) {
        // Safe fallback.
      }
    });
  }

  getSmartPlaybackRate(currentTime, duration) {
    const zones = this.getSlowMotionZones(duration);
    const normalRate = 1;
    const slowRate = 0.5;
    const fade = Math.min(0.45, duration * 0.08);

    for (const zone of zones) {
      const start = zone.start;
      const end = zone.end;

      if (currentTime >= start && currentTime <= end) {
        const distanceToStart = currentTime - start;
        const distanceToEnd = end - currentTime;

        if (distanceToStart < fade) {
          const progress = distanceToStart / fade;
          return this.lerp(normalRate, slowRate, progress);
        }

        if (distanceToEnd < fade) {
          const progress = distanceToEnd / fade;
          return this.lerp(normalRate, slowRate, progress);
        }

        return slowRate;
      }
    }

    return normalRate;
  }

  getSlowMotionZones(duration) {
    if (duration <= 4) {
      return [
        {
          start: duration * 0.35,
          end: duration * 0.72
        }
      ];
    }

    if (duration <= 8) {
      return [
        {
          start: duration * 0.22,
          end: duration * 0.43
        },
        {
          start: duration * 0.58,
          end: duration * 0.78
        }
      ];
    }

    return [
      {
        start: duration * 0.20,
        end: duration * 0.36
      },
      {
        start: duration * 0.45,
        end: duration * 0.60
      },
      {
        start: duration * 0.68,
        end: duration * 0.82
      }
    ];
  }

  lerp(from, to, progress) {
    return from + (to - from) * Math.max(0, Math.min(1, progress));
  }

  async generateVideoThumbnailsSafely() {
    const roots = Array.from(this.querySelectorAll('[data-nil-video-thumb-root]'));

    for (const root of roots) {
      const mediaId = root.dataset.mediaId;
      const slide = this.querySelector(`[data-nil-slide][data-media-id="${CSS.escape(mediaId)}"]`);
      const video = slide ? slide.querySelector('[data-nil-video]') : null;

      if (!video) {
        continue;
      }

      try {
        const urls = await this.captureVideoFrames(video);

        if (urls.length < 1) {
          continue;
        }

        this.replaceVideoThumbWithFrames(root, urls, mediaId);
      } catch (error) {
        // If canvas/CORS/security fails, keep Shopify preview_image thumbnail.
      }
    }

    this.refresh();
  }

  async captureVideoFrames(sourceVideo) {
    const sources = Array.from(sourceVideo.querySelectorAll('source'));

    if (!sources.length) {
      return [];
    }

    const tempVideo = document.createElement('video');

    tempVideo.muted = true;
    tempVideo.playsInline = true;
    tempVideo.preload = 'metadata';
    tempVideo.crossOrigin = 'anonymous';

    sources.forEach((source) => {
      const newSource = document.createElement('source');
      newSource.src = source.src;
      newSource.type = source.type;
      tempVideo.appendChild(newSource);
    });

    await this.waitForMetadata(tempVideo);

    const duration = tempVideo.duration;

    if (!Number.isFinite(duration) || duration <= 0) {
      tempVideo.remove();
      return [];
    }

    const times = this.getThumbnailTimes(duration);
    const urls = [];

    for (const time of times) {
      try {
        const url = await this.captureFrameAt(tempVideo, time);

        if (url) {
          urls.push(url);
          this.generatedUrls.push(url);
        }
      } catch (error) {
        // Try next frame.
      }
    }

    tempVideo.remove();

    return urls;
  }

  waitForMetadata(video) {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error('Video metadata timeout'));
      }, 6000);

      video.addEventListener('loadedmetadata', () => {
        window.clearTimeout(timeout);
        resolve();
      }, { once: true });

      video.addEventListener('error', () => {
        window.clearTimeout(timeout);
        reject(new Error('Video metadata error'));
      }, { once: true });

      video.load();
    });
  }

  getThumbnailTimes(duration) {
    const ratios = [0.2, 0.45, 0.7];
    const safeStart = Math.min(0.25, duration * 0.1);
    const safeEnd = Math.max(safeStart, duration - Math.min(0.25, duration * 0.1));

    return ratios.map((ratio) => {
      const rawTime = duration * ratio;
      return Math.max(safeStart, Math.min(safeEnd, rawTime));
    });
  }

  captureFrameAt(video, time) {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error('Seek timeout'));
      }, 5000);

      const onSeeked = () => {
        window.clearTimeout(timeout);

        try {
          const maxWidth = 320;
          const ratio = video.videoHeight / video.videoWidth || 1.333;
          const width = maxWidth;
          const height = Math.round(maxWidth * ratio);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext('2d', {
            alpha: false,
            willReadFrequently: false
          });

          context.drawImage(video, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas blob failed'));
              return;
            }

            const url = URL.createObjectURL(blob);
            resolve(url);
          }, 'image/jpeg', 0.78);
        } catch (error) {
          reject(error);
        }
      };

      video.addEventListener('seeked', onSeeked, { once: true });

      try {
        video.currentTime = time;
      } catch (error) {
        window.clearTimeout(timeout);
        reject(error);
      }
    });
  }

  replaceVideoThumbWithFrames(root, urls, mediaId) {
    if (!root || !urls.length) {
      return;
    }

    const fragment = document.createDocumentFragment();

    urls.slice(0, 3).forEach((url, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `nil-vfg__thumb nil-vfg__thumb--video nil-vfg__thumb--generated ${index === 0 && root.classList.contains('is-active') ? 'is-active' : ''}`;
      button.dataset.nilThumb = '';
      button.dataset.mediaId = mediaId;
      button.dataset.mediaType = 'video';
      button.setAttribute('aria-label', `Play product video thumbnail ${index + 1}`);

      const mediaSpan = document.createElement('span');
      mediaSpan.className = 'nil-vfg__thumb-media';

      const image = document.createElement('img');
      image.src = url;
      image.alt = 'Product video preview';
      image.width = 120;
      image.height = 160;
      image.loading = 'lazy';

      const badge = document.createElement('span');
      badge.className = 'nil-vfg__play-badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = '▶';

      mediaSpan.appendChild(image);
      mediaSpan.appendChild(badge);
      button.appendChild(mediaSpan);
      fragment.appendChild(button);
    });

    root.replaceWith(fragment);
  }
}

if (!customElements.get('nil-video-first-gallery')) {
  customElements.define('nil-video-first-gallery', NilVideoFirstGallery);
}