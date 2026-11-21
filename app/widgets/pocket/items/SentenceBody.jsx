import { clampStyle } from "../previewLines";

const expandedStyle = { maxHeight: 240, overflowY: "auto", paddingRight: 2 };

/**
 * SentenceBody: a 2px accent-soft bar on the left with the sentence text,
 * clamped to the preview length (or shown in full when expanded).
 */
export function SentenceBody({ item, clamp, expanded }) {
  return (
    <div className="flex gap-2.5 flex-1 min-w-0 items-stretch">
      <span
        aria-hidden="true"
        className="pocket-sentence-bar"
        style={{ width: 2, borderRadius: 2, flexShrink: 0, background: "color-mix(in srgb, var(--w-accent) 28%, transparent)" }}
      />
      <div
        className="pocket-prose min-w-0 flex-1"
        style={expanded ? expandedStyle : clampStyle(clamp)}
      >
        {item.text}
      </div>
    </div>
  );
}
