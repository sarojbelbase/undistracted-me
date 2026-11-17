import { FaviconIcon } from "../../../components/ui/FaviconIcon";
import { LetterTile } from "../LetterTile";
import { isIpOrLocalHost } from "../utils";

/**
 * SiteTile — the site glyph shown at the start of a link row and in a source
 * line. When `showFavicon` and the host is a real domain, it fetches the
 * favicon; otherwise (or for IP / localhost / empty hosts) it falls back to the
 * LetterTile, which renders a globe for those cases.
 */
export function SiteTile({ url = "", host = "", size = 28, showFavicon = true }) {
  if (showFavicon && url && !isIpOrLocalHost(host)) {
    return <FaviconIcon url={url} size={size} />;
  }
  return <LetterTile text={host || ""} size={size} />;
}
