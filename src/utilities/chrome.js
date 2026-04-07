import { FEATURE_EXTENSION_BADGE, FEATURE_WEBSITE_FAVICON } from '../constants/env';

/**
 * Stamps the supplied text (a short Nepali date string) into the most
 * appropriate place depending on the deployment mode:
 *
 * Extension mode  → chrome.action badge (the yellow dot on the toolbar icon)
 * Website mode    → browser-tab favicon, rendered via <canvas> so the date
 *                   is visible in pinned/open tabs without any extension APIs
 */
export async function stampThisIntoExtensionIcon(text) {
  if (FEATURE_EXTENSION_BADGE) {
    // ── Extension: update the toolbar icon badge ──────────────────────────
    if (typeof chrome !== 'undefined' && chrome.action) { // eslint-disable-line
      try {
        await chrome.action.setBadgeBackgroundColor({ color: '#ffc107' }); // eslint-disable-line
        await chrome.action.setBadgeText({ text }); // eslint-disable-line
      } catch (error) {
        console.error('Error setting badge text:', error);
      }
    } else {
      console.warn('Chrome API is not available');
    }
    return;
  }

  if (FEATURE_WEBSITE_FAVICON) {
    // ── Website: render date into a canvas favicon ────────────────────────
    _updateFaviconWithText(text);
  }
}

/**
 * Generates a 32×32 favicon with the supplied text and swaps it into
 * the page's <link rel="icon"> element.
 * @param {string} text — short date label, e.g. "२३" or "23"
 */
function _updateFaviconWithText(text) {
  try {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background circle
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc107';
    ctx.fill();

    // Date text
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Scale font size to fit: short strings (≤2 chars) get bigger text
    ctx.font = `bold ${text.length <= 2 ? 16 : 11}px "Google Sans", ui-sans-serif, sans-serif`;
    ctx.fillText(text, size / 2, size / 2 + 1);

    const dataUrl = canvas.toDataURL('image/png');

    // Replace (or create) the <link rel="icon">
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = dataUrl;
  } catch {
    // Canvas or DOM unavailable (e.g. SSR / test env) — silently skip
  }
}

