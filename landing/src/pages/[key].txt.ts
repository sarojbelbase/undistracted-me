import { createIndexNowKeyRoute } from '@jdevalk/astro-seo-graph';
import { INDEXNOW_KEY } from '../data/indexnow.js';

/**
 * Serves the IndexNow verification key at /<key>.txt so search engines can
 * confirm ownership of undistracted.me before accepting submissions.
 *
 * The file name (minus .txt.ts) must equal the key, so this dynamic route
 * builds exactly one page whose path is /<INDEXNOW_KEY>.txt.
 */
export function getStaticPaths() {
  return [{ params: { key: INDEXNOW_KEY } }];
}

export const GET = createIndexNowKeyRoute({ key: INDEXNOW_KEY });
