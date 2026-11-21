import { isCodeClamped } from "../previewLines";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace";

/**
 * CodeBody: the code entry: a quiet inset block (no border, no header bar -
 * Copy is the row's primary action) with a mono body that clamps to WHOLE
 * lines. The clamp height is computed in CSS from the line count and the line
 * height, so a line is never cut in half. Horizontally scrolls when wrapCode is
 * off; wraps when on. "Show all N lines" sits under the block, never over it.
 */
export function CodeBody({ item, clamp, expanded, variant = "list", wrapCode, onToggle }) {
  const lineCount = item.text.split("\n").length;
  const clamped = !expanded && isCodeClamped(item.text, clamp);

  return (
    <div className="flex-1 min-w-0">
      <div className="pocket-code">
        <pre
          className={`pocket-code__body ${clamped ? "pocket-code__body--clamped" : ""}`}
          style={{
            fontFamily: MONO,
            whiteSpace: wrapCode ? "pre-wrap" : "pre",
            "--pocket-code-lines": clamp,
          }}
        >
          {item.text}
        </pre>
      </div>
      {variant === "list" && clamped && (
        <button
          type="button"
          className="pocket-text-btn pocket-code__more"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          Show all {lineCount} lines
        </button>
      )}
    </div>
  );
}
