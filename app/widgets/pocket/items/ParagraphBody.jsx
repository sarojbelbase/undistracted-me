import { clampStyle, isClamped } from "../previewLines";

const fade = {
  WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
  maskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
};

const expandedStyle = { maxHeight: 240, overflowY: "auto", paddingRight: 2 };

/**
 * ParagraphBody — body text clamped to the preview length with a bottom fade,
 * plus an explicit "Show more" / "Show less" button (list view only; the tiny
 * widget card expands in place on row click instead).
 */
export function ParagraphBody({ item, clamp, expanded, variant = "list", onToggle }) {
  const clamped = !expanded && isClamped(item.text, clamp);
  return (
    <div className="flex-1 min-w-0">
      <div
        className="pocket-prose"
        style={{
          fontSize: "0.875rem",
          lineHeight: 1.55,
          ...(expanded ? expandedStyle : { ...clampStyle(clamp), ...fade }),
        }}
      >
        {item.text}
      </div>
      {variant === "list" && (clamped || expanded) && (
        <button
          type="button"
          className="pocket-text-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
