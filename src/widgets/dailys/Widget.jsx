import { BaseWidget } from "../BaseWidget";
import { useWidgetSettings } from "../useWidgetSettings";
import { QUOTES } from "../../data/quotes";
import { FACTS } from "../../data/facts";
// data files kept as-is; widget type is now 'dailys'
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { LightbulbFill } from "react-bootstrap-icons";

const getDailyIndex = (len) => Math.floor(Date.now() / 86_400_000) % len;

const MODE_OPTIONS = [
  { label: "Quote", value: "quote" },
  { label: "Fact", value: "fact" },
];

// ── Quote display ──────────────────────────────────────────────────────────────

const QuoteDisplay = ({ text, author, category }) => (
  <>
    <div
      className="flex-1 flex items-start gap-3 min-h-0"
      style={{ paddingLeft: 12, borderLeft: "2.5px solid var(--w-accent)" }}
    >
      <p
        className="w-body"
        style={{ fontStyle: "italic", color: "var(--w-ink-2)", lineHeight: 1.7, fontSize: "0.9375rem" }}
      >
        {text}
      </p>
    </div>
    <div className="flex items-center justify-between shrink-0 gap-2">
      <p className="w-caption font-medium truncate" style={{ color: "var(--w-ink-5)" }}>
        — {author}
      </p>
      <span
        className="w-caption font-semibold px-2.5 py-0.5 rounded-full shrink-0"
        style={{ fontSize: "0.6875rem", backgroundColor: "var(--w-accent)", color: "var(--w-accent-fg)" }}
      >
        {category}
      </span>
    </div>
  </>
);

// ── Fact display ───────────────────────────────────────────────────────────────

const FactDisplay = ({ text, category }) => (
  <>
    <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0 px-1">
      <LightbulbFill
        size={18}
        aria-hidden="true"
        style={{ color: "var(--w-accent)", opacity: 0.7, flexShrink: 0 }}
      />
      <p
        className="w-body text-center"
        style={{ color: "var(--w-ink-2)", lineHeight: 1.65, fontSize: "0.9375rem" }}
      >
        {text}
      </p>
    </div>
    <div className="flex items-center shrink-0">
      <span
        className="w-caption font-semibold px-2 py-0.5 rounded-full text-xs"
        style={{ backgroundColor: "var(--w-accent)", color: "var(--w-accent-fg)", opacity: 0.9 }}
      >
        {category}
      </span>
    </div>
  </>
);

// ── Widget ─────────────────────────────────────────────────────────────────────

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { mode: "quote" });
  const mode = settings.mode ?? "quote";

  const quote = QUOTES[getDailyIndex(QUOTES.length)];
  const fact = FACTS[getDailyIndex(FACTS.length)];

  const settingsContent = (
    <SegmentedControl
      label="Mode"
      options={MODE_OPTIONS}
      value={mode}
      onChange={(v) => updateSetting("mode", v)}
    />
  );

  return (
    <BaseWidget
      className="p-5 flex flex-col justify-between gap-4"
      onRemove={onRemove}
      settingsContent={settingsContent}
      settingsTitle="Display Mode"
    >
      {mode === "quote" ? (
        <QuoteDisplay text={quote.text} author={quote.author} category={quote.category} />
      ) : (
        <FactDisplay text={fact.text} category={fact.category} />
      )}
    </BaseWidget>
  );
};

