import { Globe } from "react-bootstrap-icons";
import { hostHueColor, isIpOrLocalHost } from "./utils";
import { TILE_TEXT_COLOR } from "./constants";

/**
 * LetterTile — the muted-hue site tile used for link favicon fallbacks and the
 * Website group header. The hue is derived from a hash of the host; a fixed
 * white glyph keeps AA contrast on the muted hue in both light and dark mode.
 *
 * For IP hosts, localhost and empty hosts a globe glyph renders instead of a
 * letter (§2 P2: an IP host must not show its first digit as a "letter").
 */
export function LetterTile({ text = "", size = 28, radius = 8 }) {
  const useGlobe = isIpOrLocalHost(text);
  const letter = (text || "?").charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: hostHueColor(text || ""),
        color: TILE_TEXT_COLOR,
        fontSize: size * 0.52,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {useGlobe ? <Globe size={size * 0.6} /> : letter}
    </span>
  );
}
