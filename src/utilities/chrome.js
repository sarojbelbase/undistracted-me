export async function stampThisIntoExtensionIcon(text) {
  if (typeof chrome !== 'undefined' && chrome.action) { // eslint-disable-line
    try {
      await chrome.action.setBadgeBackgroundColor({ color: '#ffc107' }); // eslint-disable-line
      await chrome.action.setBadgeText({ text: text }); // eslint-disable-line
    } catch (error) {
      console.error('Error setting badge text:', error);
    }
  } else {
    console.warn('Chrome API is not available');
  }
}
