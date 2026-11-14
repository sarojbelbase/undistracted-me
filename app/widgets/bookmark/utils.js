// All favicon utilities live in app/utilities/favicon.js.
// Re-exported here for backward compatibility with any existing imports.
export {
  FAVICON_SERVICES,
  faviconCache,
  cacheFavicon,
  getHostname,
  getDefaultName,
  parentDomain,
  buildFaviconSources,
  nameToColor,
  extractColorFromUrl,
} from '../../utilities/favicon';

export const normalizeUrl = (url) => (url.startsWith("http") ? url : `https://${url}`);

