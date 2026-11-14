// ─── Orb background palette definitions ──────────────────────────────────────
// Single source of truth — used by both useCanvasBg (canvas mode) and
// FocusMode (index.jsx). Add new palettes here and both consumers update.

export const ORB_PALETTES = [
  { id: 'blueberry', rgb: '54,133,230' },
  { id: 'strawberry', rgb: '198,38,46' },
  { id: 'bubblegum', rgb: '222,62,128' },
  { id: 'grape', rgb: '165,109,226' },
  { id: 'orange', rgb: '243,115,41' },
  { id: 'mint', rgb: '40,188,163' },
  { id: 'latte', rgb: '207,162,94' },
];

/** Returns the rgb string for a given palette id, or null for the 'accent' id. */
export const getOrbRgbById = (id) =>
  id === 'accent' ? null : (ORB_PALETTES.find(p => p.id === id)?.rgb ?? null);
