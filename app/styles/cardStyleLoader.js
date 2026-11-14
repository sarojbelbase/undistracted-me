/**
 * Card-style CSS loader.
 *
 * The three card visual systems (`comic`, `paper`, `glass`) are mutually
 * exclusive — only one ever applies, selected by `data-card-style`. `paper`
 * (the default) stays in main.scss so the default look has no flash. `comic`
 * and `glass` are split into their own CSS chunks and loaded on demand here,
 * so a new-tab page never downloads CSS for a card style it isn't using.
 */

const LOADERS = {
  comic: () => import('./_comic.scss'),
  glass: () => import('./_glass.scss'),
};

const loaded = new Set();

/**
 * Ensure the CSS for `cardStyle` is loaded. Safe to call repeatedly — each
 * style's stylesheet is fetched at most once per session.
 */
export function loadCardStyle(cardStyle) {
  const load = LOADERS[cardStyle];
  if (load && !loaded.has(cardStyle)) {
    loaded.add(cardStyle);
    load();
  }
}
