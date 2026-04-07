// Generates a consistent vivid HSL color from a string (site name).
// Used for the "Letter" icon mode background.
export const nameToColor = (str) => {
  if (!str) return 'hsl(220, 60%, 50%)';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (str.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 62%, 48%)`;
};

// WCAG 2.1 relative luminance (IEC 61966-2-1 linearisation).
// Perceptually correct: yellow at L=0.5 in HSL has Y≈0.93 (near-white),
// while Facebook blue at L=0.52 has Y≈0.20 (genuinely mid-dark).
const linearize = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const wcagY = (r, g, b) =>
  0.2126 * linearize(r / 255) +
  0.7152 * linearize(g / 255) +
  0.0722 * linearize(b / 255);

export const extractColorFromUrl = (src, onColor) => {
  if (!src) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { runExtraction(img, onColor); };
  img.src = src;
};

function buildBuckets(data) {
  const buckets = {};
  let totalOpaque = 0, transparentCount = 0, darkCount = 0, lumSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 64) { transparentCount++; continue; }
    totalOpaque++;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const lum = (max + min) / 2;
    const sat = max === 0 ? 0 : (max - min) / max;
    lumSum += lum;
    if (lum < 0.2) darkCount++;
    const key = `${Math.round(r / 16)},${Math.round(g / 16)},${Math.round(b / 16)}`;
    if (!buckets[key]) buckets[key] = { r, g, b, count: 0, sat, lum };
    buckets[key].count += a / 255;
  }
  return { buckets, totalOpaque, transparentCount, darkCount, lumSum };
}

function pickBestColor(entries, pool) {
  const score = (e) => e.count * (e.sat + 0.05);
  return pool.reduce((a, b) => (score(b) > score(a) ? b : a), entries[0]);
}

function runExtraction(img, onColor) {
  try {
    const SIZE = 64;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
    const totalPixels = SIZE * SIZE;

    const { buckets, totalOpaque, transparentCount, darkCount, lumSum } = buildBuckets(data);
    if (totalOpaque === 0) return;
    const entries = Object.values(buckets);

    // 1. Mostly-transparent icon: infer a contrasting solid background
    if (transparentCount / totalPixels > 0.45) {
      onColor(lumSum / totalOpaque > 0.45 ? '#111111' : '#f5f5f5');
      return;
    }

    // 2. Dark-dominant icon (e.g. X.com black square): full pool, count wins
    if (darkCount / totalOpaque > 0.5) {
      const best = pickBestColor(entries, entries);
      if (best) onColor(`rgb(${best.r},${best.g},${best.b})`);
      return;
    }

    // 3. Vibrant-zone: WCAG Y ≤ 0.5 excludes perceptually over-bright colours
    //    (yellow Y≈0.93, Instagram bright orange-yellow Y≈0.53) so richer hues
    //    (pink, purple, orange-red) win first. If nothing passes, fall back to
    //    any non-dark pixel — bright fills like saroj amber win by pixel count.
    const vibrantPool = entries.filter(
      (e) => e.lum >= 0.2 && e.sat > 0.3 && wcagY(e.r, e.g, e.b) <= 0.5,
    );
    let pool = vibrantPool.length > 0 ? vibrantPool : entries.filter((e) => e.lum >= 0.2);
    if (pool.length === 0) pool = entries;
    const best = pickBestColor(entries, pool);
    if (best) onColor(`rgb(${best.r},${best.g},${best.b})`);
  } catch { /* CORS blocked — no background colour */ }
}

