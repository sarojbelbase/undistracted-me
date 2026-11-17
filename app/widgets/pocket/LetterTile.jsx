import { hostHueColor } from "./utils";
import { TILE_TEXT_COLOR } from "./constants";

/**
 * LetterTile — the muted-hue letter tile used for link favicon fallbacks and
 * the Sites accordion header. The hue is derived from a hash of the host
 * (spec §6); a fixed white glyph keeps AA contrast on the muted hue in both
 * light and dark mode.
 */
export function LetterTile({ text = "", size = 28, radius = 8 }) {
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
      {letter}
    </span>
  );
}
