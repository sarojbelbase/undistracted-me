// IndexNow key — lets search engines (Bing, Yandex, Seznam, Naver, Yep)
// recrawl pages as soon as they're published or updated.
//
// This key is intentionally NOT secret: IndexNow verifies site ownership by
// serving it publicly at the host root, e.g. https://undistracted.me/<key>.txt
// and https://app.undistracted.me/<key>.txt. The same key is shared by both
// hosts so a single key file covers the whole project.
//
// If you ever rotate the key, update it in all of these places, then redeploy
// both sites:
//   - here (landing/src/data/indexnow.js)
//   - public/<key>.txt  (the app's key file — filename AND content are the key)
//   - scripts/submit-indexnow.mjs
export const INDEXNOW_KEY = '0ed82e1a15ca0a0fc7ffbfab4a27276c';
