import { Component } from '@theme/component';
import { ThemeEvents, VariantUpdateEvent, ZoomMediaSelectedEvent } from '@theme/events';

const G21_STYLE_ID = 'g21-video-first-media-gallery-style';
const VIDEO_EVENT_TIMEOUT = 9000;
const NORMAL_RATE = 1;
const SLOW_RATE = 0.5;

/**
A custom element that renders a media gallery.

@typedef {object} Refs
@property {import('./zoom-dialog').ZoomDialog} [zoomDialogComponent]
@property {import('./slideshow').Slideshow} [slideshow]
@property {HTMLElement[]} [media]

@extends Component<Refs>
*/
export class MediaGallery extends Component {
#controller = new AbortController();
#observer;
#setupScheduled = false;
#primaryVideo = null;
#motionRampVideo = null;

connectedCallback() {
super.connectedCallback();

```
if (this.#controller.signal.aborted) {
  this.#controller = new AbortController();
}

this.#injectStyles();

const { signal } = this.#controller;
const target = this.closest('.shopify-section, dialog');

target?.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate, { signal });

this.refs.zoomDialogComponent?.addEventListener(
  ThemeEvents.zoomMediaSelected,
  this.#handleZoomMediaSelected,
  { signal }
);

this.addEventListener('click', this.#handleGalleryClick, { signal, capture: true });

this.#scheduleVideoFirstSetup();
this.#observeGalleryChanges();
```

}

disconnectedCallback() {
super.disconnectedCallback();
this.#observer?.disconnect();
this.#observer = undefined;

```
this.#stopMotionRamp();
this.#controller.abort();
```

}

#handleVariantUpdate = (event) => {
const source = event.detail.data.html;
if (!source) return;

```
const newMediaGallery = source.querySelector('media-gallery');
if (!newMediaGallery) return;

this.replaceWith(newMediaGallery);
```

};

#handleZoomMediaSelected = async (event) => {
this.slideshow?.select(event.detail.index, undefined, { animate: false });
};

#handleGalleryClick = (event) => {
const target = event.target;
if (!(target instanceof Element)) return;

```
const videoTrigger = target.closest('[data-g21-video-trigger]');
if (videoTrigger) {
  const video = this.#primaryVideo || this.#findPrimaryVideo();
  if (video) {
    event.preventDefault();
    event.stopPropagation();
    this.#selectAndPlayVideoFromStart(video, { animate: true });
  }
}
```

};

#observeGalleryChanges() {
this.#observer?.disconnect();
this.#observer = new MutationObserver(() => {
this.#scheduleVideoFirstSetup();
});

```
this.#observer.observe(this, {
  childList: true,
  subtree: true,
});
```

}

#scheduleVideoFirstSetup() {
if (this.#setupScheduled) return;
this.#setupScheduled = true;

```
requestAnimationFrame(() => {
  this.#setupScheduled = false;
  this.#setupVideoFirstGallery();
});
```

}

/**

* Core system:
* * Video-first
* * Poster fallback (Shopify preview_image)
* * Safe autoplay attempt
* * No canvas frame generation (CORS-safe)
    */
    async #setupVideoFirstGallery() {
    const primaryVideo = this.#findPrimaryVideo();
    if (!primaryVideo) return;

```
const primaryChanged = this.#primaryVideo !== primaryVideo;
```

```
this.#primaryVideo = primaryVideo;

this.#prepareVideoElement(primaryVideo);
this.#moveVideoMediaFirst(primaryVideo);

const fallbackImage = this.#getFallbackImageUrl(primaryVideo);

if (fallbackImage) {
  this.#applyPosterToMatchingVideos(primaryVideo, fallbackImage);
}

this.#selectAndPlayVideoFromStart(primaryVideo, { animate: false });

if (primaryChanged) {
  this.#stopMotionRamp();
}

this.#startMotionRamp(primaryVideo);
```

}

#findPrimaryVideo() {
const videos = Array.from(this.querySelectorAll('video')).filter((video) => {
return video instanceof HTMLVideoElement && video.dataset.g21HiddenVideo !== 'true';
});

```
return videos[0] || null;
```

}

#prepareVideoElement(video) {
video.muted = true;
video.defaultMuted = true;
video.loop = true;
video.autoplay = true;
video.playsInline = true;
video.preload = 'auto';

```
video.setAttribute('muted', '');
video.setAttribute('loop', '');
video.setAttribute('autoplay', '');
video.setAttribute('playsinline', '');
video.setAttribute('webkit-playsinline', '');

const { signal } = this.#controller;

if (video.dataset.g21VideoListenersReady === 'true') return;
video.dataset.g21VideoListenersReady = 'true';

video.addEventListener(
  'play',
  () => {
    this.#startMotionRamp(video);
  },
  { signal }
);

video.addEventListener(
  'pause',
  () => {
    if (this.#motionRampVideo === video) {
      this.#stopMotionRamp();
    }
  },
  { signal }
);

video.addEventListener(
  'ended',
  () => {
    this.#playVideoFromStart(video);
  },
  { signal }
);
```

}

#moveVideoMediaFirst(video) {
const mediaItem = video.closest('[data-media-id]');
if (!mediaItem || !mediaItem.parentElement) return;

```
const parent = mediaItem.parentElement;
const first = parent.firstElementChild;

if (first && first !== mediaItem) {
  parent.insertBefore(mediaItem, first);
}
```

}

#selectAndPlayVideoFromStart(video, options = {}) {
const index = this.#getVideoMediaIndex(video);

```
if (index > -1) {
  this.slideshow?.select(index, undefined, { animate: Boolean(options.animate) });
}

this.#stopInactiveVideos(video);

setTimeout(() => {
  this.#playVideoFromStart(video);
}, 30);
```

}

async #playVideoFromStart(video) {
if (!video || !video.isConnected) return;

```
try {
  video.pause();
  video.currentTime = 0;
} catch {}

try {
  const playPromise = video.play();
  if (playPromise instanceof Promise) {
    await playPromise;
  }
} catch {
  // Autoplay blocked → poster remains visible
}
```

}

#stopInactiveVideos(activeVideo) {
Array.from(this.querySelectorAll('video')).forEach((video) => {
if (video === activeVideo) return;
try {
video.pause();
video.currentTime = 0;
} catch {}
});
}

#applyPosterToMatchingVideos(originalVideo, posterUrl) {
if (!posterUrl) return;

```
Array.from(this.querySelectorAll('video')).forEach((video) => {
  this.#applyPoster(video, posterUrl);
});
```

}

#applyPoster(video, posterUrl) {
video.setAttribute('poster', posterUrl);
video.style.backgroundImage = `url("${posterUrl}")`;
video.style.backgroundSize = 'cover';
video.style.backgroundPosition = 'center';
video.style.backgroundColor = '#f8f3ea';
}

#getFallbackImageUrl(video) {
return video.getAttribute('poster') || video.dataset.previewImage || null;
}

#getVideoMediaIndex(video) {
const mediaItems = Array.from(this.querySelectorAll('[data-media-id]'));
const mediaItem = video.closest('[data-media-id]');
return mediaItems.indexOf(mediaItem);
}

#startMotionRamp(video) {
if (!video) return;

```
this.#motionRampVideo = video;

// Optional slow motion (safe)
video.playbackRate = NORMAL_RATE;
```

}

#stopMotionRamp() {
if (this.#motionRampVideo) {
this.#motionRampVideo.playbackRate = NORMAL_RATE;
}
this.#motionRampVideo = null;
}

#injectStyles() {
if (document.getElementById(G21_STYLE_ID)) return;

```
const style = document.createElement('style');
style.id = G21_STYLE_ID;
style.textContent = `
  video {
    background-color: #f8f3ea;
  }
`;

document.head.appendChild(style);
```

}
}
