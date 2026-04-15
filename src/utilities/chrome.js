/**
 * Send a message to the extension service worker.
 * Safe no-op in web/dev mode where the chrome APIs are not available.
 *
 * @param {object} message - Payload forwarded to the service worker.
 */
export function sendToServiceWorker(message) {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) { // eslint-disable-line no-undef
    chrome.runtime.sendMessage(message).catch(() => { }); // eslint-disable-line no-undef
  }
}

/**
 * Trigger a user-facing notification.
 * In extension context: delegates to the service worker so notifications fire
 * even when the tab isn't focused.
 * In plain web (dev) context: falls back to the Notification API when permitted.
 *
 * @param {string} title
 * @param {string} body
 * @param {string} [type] - Message type sent to the SW (default 'NOTIFY')
 */
export function notifyUser(title, body, type = 'NOTIFY') {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) { // eslint-disable-line no-undef
    chrome.runtime.sendMessage({ type, title, body }).catch(() => { }); // eslint-disable-line no-undef
    return;
  }
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon/lotus32.png' });
  }
}
