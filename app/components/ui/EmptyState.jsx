/**
 * EmptyState — a minimal, icon-free empty state: one title, one sentence, and
 * at most one optional action button. No numbered steps, no emoji.
 *
 * Props:
 *   title    – string; short heading
 *   text     – string; one sentence of what to do
 *   action   – ReactNode (optional); a single button
 *   size     – "default" | "sm"; "sm" is a quieter, muted variant for cramped
 *              widget faces (smaller type, softer ink, more air per word)
 */
export const EmptyState = ({ title, text, action, size = "default" }) => {
  const sm = size === "sm";
  return (
    <output className={sm ? "um-empty um-empty--sm" : "um-empty"}>
      <div
        className={sm ? "um-empty__title" : "w-heading"}
        style={sm ? undefined : { color: "var(--w-ink-1)" }}
      >
        {title}
      </div>
      {text ? (
        <p
          className={sm ? "um-empty__text" : "w-body"}
          style={sm ? undefined : { color: "var(--w-ink-4)", maxWidth: 260, margin: 0 }}
        >
          {text}
        </p>
      ) : null}
      {action}
    </output>
  );
};
