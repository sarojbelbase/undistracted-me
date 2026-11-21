// Notify IndexNow that app.undistracted.me has changed, so participating
// search engines (Bing, Yandex, Seznam, Naver, Yep) recrawl it promptly.
//
// Runs as a post-deploy step in .github/workflows/deploy-app.yml, AFTER
// `pages deploy` has shipped the key file at
// https://app.undistracted.me/<key>.txt (see public/<key>.txt). IndexNow
// rejects submissions sent before the key is reachable with HTTP 403, so this
// must never run before the deploy step.
//
// The landing site (undistracted.me) submits via the seoGraph `indexNow`
// integration in landing/astro.config.mjs instead — it already runs at build
// time and auto-discovers every built URL.

const KEY = '0ed82e1a15ca0a0fc7ffbfab4a27276c';
const HOST = 'app.undistracted.me';
const URLS = ['https://app.undistracted.me/'];

// Canonical global endpoint (lowercase per indexnow.org documentation).
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: URLS,
});

try {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    },
    body,
  });

  const text = (await res.text().catch(() => '')).trim();

  if (res.status === 200 || res.status === 202) {
    // 200 = accepted; 202 = accepted, key validation still pending (first time).
    console.log(
      `IndexNow: submitted ${URLS.length} URL(s) to ${HOST} (status ${res.status}).`,
    );
  } else {
    // Log but don't fail the deploy: IndexNow is a best-effort "please
    // recrawl" signal, and a transient 429/network blip shouldn't block a
    // release that already deployed successfully.
    console.warn(
      `IndexNow: submission failed (status ${res.status}): ${text || '(empty body)'}`,
    );
  }
} catch (err) {
  console.warn(`IndexNow: submission error: ${err?.message ?? err}`);
}
