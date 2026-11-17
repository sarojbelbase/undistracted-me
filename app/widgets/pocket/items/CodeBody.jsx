import { Button } from "../../../components/ui/Button";
import { detectLanguage } from "../utils";
import { isClamped } from "../previewLines";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace";
const LINE_HEIGHT = 18; // 0.75rem × 1.5

/**
 * CodeBody — the code entry design: an inset block with a 32px header
 * (language label + Copy button) and a mono body that clamps to whole lines
 * (no mid-line cuts). Horizontally scrolls when wrapCode is off; wraps when on.
 */
export function CodeBody({ item, clamp, expanded, variant = "list", wrapCode, copied, onCopy, onToggle }) {
  const language = detectLanguage(item.text);
  const lineCount = item.text.split("\n").length;
  const clamped = !expanded && isClamped(item.text, clamp);
  const whiteSpace = wrapCode ? "pre-wrap" : "pre";

  return (
    <div className="pocket-code-block flex-1 min-w-0">
      <div className="pocket-code-block__head">
        <span className="pocket-code-block__lang">{language}</span>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre
        className="pocket-code-block__body"
        style={{
          fontFamily: MONO,
          whiteSpace,
          ...(expanded ? {} : { maxHeight: clamp * LINE_HEIGHT, overflow: "hidden" }),
        }}
      >
        {item.text}
      </pre>
      {variant === "list" && clamped && !expanded && (
        <button
          type="button"
          className="pocket-text-btn"
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
