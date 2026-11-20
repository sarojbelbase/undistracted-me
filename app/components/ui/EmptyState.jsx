/**
 * EmptyState — a minimal empty state: an optional icon, one title, one sentence,
 * and at most one optional action button. No numbered steps, no emoji.
 *
 * Props:
 *   icon     – ReactNode (optional); leading icon, rendered muted above the title
 *   title    – string; short heading
 *   text     – string; one sentence of what to do
 *   action   – ReactNode (optional); a single button
 *   size     – "default" | "sm"; "sm" is a quieter, muted variant for cramped
 *              widget faces (smaller type, softer ink, more air per word)
 */
export const EmptyState = ({ icon, title, text, action, size = "default" }) => {
  const sm = size === "sm";
  return (
    <div className={sm ? "um-empty um-empty--sm" : "um-empty"}>
      {icon ? (
        <div className="um-empty__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
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
    </div>
  );
};
