import { useState, useMemo, useCallback } from 'react';
import { getOrbRgbById } from '../components/ui/BackgroundPicker';
import { getPhotoLibrary, getThumbUrl } from '../utilities/unsplash';
import { extractColorFromImage } from '../utilities/favicon';
import { ACCENT_COLORS } from '../theme';
import bgImage from '../assets/img/bg.webp';

// ── Pure helpers ───────────────────────────────────────────────────────────────

function getBgImageUrl(bgType, canvasBg) {
  if (bgType === 'custom') return canvasBg?.url || null;
  if (bgType === 'curated') {
    const p = getPhotoLibrary()[0];
    return canvasBg?.url || p?.regular || p?.small || null;
  }
  if (bgType === 'default') return bgImage;
  return null;
}

function getSolidGradientBg(isDark, accent) {
  const accentHex = ACCENT_COLORS.find(a => a.name === accent)?.hex || '#3689E6';
  const base = isDark ? '#141414' : '#F0F0F2';
  const disc = isDark ? 32 : 26;
  const cone = isDark ? 20 : 16;
  const haze = isDark ? 10 : 8;
  return [
    `radial-gradient(ellipse 28% 20% at 55% 0%, color-mix(in srgb, ${accentHex} ${disc}%, ${base}) 0%, transparent 60%)`,
    `radial-gradient(ellipse 80% 110% at 55% -25%, color-mix(in srgb, ${accentHex} ${cone}%, ${base}) 0%, color-mix(in srgb, ${accentHex} ${Math.round(cone * 0.3)}%, ${base}) 55%, transparent 80%)`,
    `linear-gradient(to bottom, color-mix(in srgb, ${accentHex} ${haze}%, ${base}) 0%, ${base} 55%)`,
  ].join(', ');
}

function computePageBg(bgType, isDark, accent, canvasBg) {
  if (bgType === 'curated') return canvasBg?.color || '#0c0c10';
  if (bgType === 'custom' || bgType === 'default') return '#000000';
  if (bgType === 'orb') return isDark ? '#060608' : 'var(--w-page-bg)';
  return getSolidGradientBg(isDark, accent);
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * All canvas background computation: type, URLs, page background colour,
 * blur-up load tracking, and colour extraction from curated photos.
 */
export function useCanvasBg({ canvasBg, setCanvasBg, isDark, accent }) {
  const bgType = canvasBg?.type || 'orb';
  const bgOrbId = canvasBg?.orbId || 'accent';

  const bgOrbRgb = useMemo(
    () => (bgOrbId === 'accent' ? null : getOrbRgbById(bgOrbId)),
    [bgOrbId],
  );

  const bgImageUrl = useMemo(
    () => getBgImageUrl(bgType, canvasBg),
    [bgType, canvasBg],
  );

  // canvasBg?.url is listed as a dependency so a newly-selected curated photo
  // causes the thumb to recompute even though its value comes from the library.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bgThumbUrl = useMemo(() => {
    if (bgType !== 'curated') return null;
    return getThumbUrl(getPhotoLibrary()[0]);
  }, [bgType, canvasBg?.url]);

  // Only canvasBg?.color is read inside computePageBg — narrowing the
  // dependency avoids recomputing when other canvasBg fields change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pageBg = useMemo(
    () => computePageBg(bgType, isDark, accent, canvasBg),
    [bgType, isDark, accent, canvasBg?.color],
  );

  const [thumbLoadedUrl, setThumbLoadedUrl] = useState(null);
  const [fullLoadedUrl, setFullLoadedUrl] = useState(null);

  const onThumbLoad = useCallback((e) => {
    extractColorFromImage(e.currentTarget, color =>
      setCanvasBg(prev => ({ ...prev, color }))
    );
    setThumbLoadedUrl(bgThumbUrl);
  }, [bgThumbUrl, setCanvasBg]);

  const onFullLoad = useCallback(
    () => setFullLoadedUrl(bgImageUrl),
    [bgImageUrl],
  );

  return {
    bgType,
    bgOrbId,
    bgOrbRgb,
    bgImageUrl,
    bgThumbUrl,
    pageBg,
    thumbReady: !!bgThumbUrl && thumbLoadedUrl === bgThumbUrl,
    fullReady: !!bgImageUrl && fullLoadedUrl === bgImageUrl,
    onThumbLoad,
    onFullLoad,
  };
}
