// Generates the 1200x630 share card from scripts/og-image.html using a
// headless Chromium screenshot.
//
// Usage:
//   bun scripts/make-og-image.mjs [domain] [outputPath]
//
// Defaults: domain "app.undistracted.me", output "public/og.png".
// The domain is printed in the card footer. Output format is inferred from the
// extension (.jpg/.jpeg -> JPEG, otherwise PNG).
//
// Examples:
//   bun scripts/make-og-image.mjs app.undistracted.me public/og.png
//   bun scripts/make-og-image.mjs undistracted.me landing/public/og.jpg
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const htmlUrl = pathToFileURL(join(here, 'og-image.html')).href;

const domain = process.argv[2] || 'app.undistracted.me';
const outRel = process.argv[3] || 'public/og.png';
const outPath = join(here, '..', outRel);
const ext = extname(outPath).toLowerCase();
const type = ext === '.jpg' || ext === '.jpeg' ? 'jpeg' : 'png';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto(htmlUrl, { waitUntil: 'load' });
  await page.locator('.foot').evaluate((el, d) => {
    el.textContent = d;
  }, domain);
  // Wait for webfonts to settle (fallback to system-ui if offline).
  await page.evaluate(async () => {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 3500)),
    ]);
  });
  await page.screenshot({
    path: outPath,
    type,
    ...(type === 'jpeg' ? { quality: 92 } : {}),
  });
  console.log(`Wrote ${outPath} (${type}, footer "${domain}")`);
} finally {
  await browser.close();
}
