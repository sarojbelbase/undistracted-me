import { BaseWidget } from "../BaseWidget";
import { QUOTES } from "../../data/quotes";

const getDailyIndex = () => {
  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
  return daysSinceEpoch % QUOTES.length;
};

export const Widget = ({ onRemove }) => {
  const { text, author, category } = QUOTES[getDailyIndex()];

  return (
    <BaseWidget
      className="p-5 flex flex-col justify-between gap-4"
      onRemove={onRemove}
    >
      {/* Quote block — left accent bar, generous leading */}
      <div
        className="flex-1 flex items-start gap-3 min-h-0"
        style={{
          paddingLeft: 12,
          borderLeft: "2.5px solid var(--w-accent)",
        }}
      >
        <p
          className="w-body"
          style={{
            fontStyle: "italic",
            color: "var(--w-ink-2)",
            lineHeight: 1.7,
            fontSize: "0.9375rem",
          }}
        >
          {text}
        </p>
      </div>

      {/* Footer: author left, category right */}
      <div className="flex items-center justify-between shrink-0 gap-2">
        <p
          className="w-caption font-medium truncate"
          style={{ color: "var(--w-ink-5)" }}
        >
          — {author}
        </p>
        <span
          className="w-caption font-semibold px-2.5 py-0.5 rounded-full shrink-0"
          style={{
            fontSize: "0.6875rem",
            backgroundColor: "var(--w-accent)",
            color: "var(--w-accent-fg)",
          }}
        >
          {category}
        </span>
      </div>
    </BaseWidget>
  );
};
