/**
 * EmptyState — a minimal, icon-free empty state: one title, one sentence, and
 * at most one optional action button. No numbered steps, no emoji.
 *
 * Props:
 *   title    – string; short heading
 *   text     – string; one sentence of what to do
 *   action   – ReactNode (optional); a single button
 */
export const EmptyState = ({ title, text, action }) => (
  <div className="um-empty" role="status">
    <div className="w-heading" style={{ color: "var(--w-ink-1)" }}>{title}</div>
    {text ? (
      <p className="w-body" style={{ color: "var(--w-ink-4)", maxWidth: 260, margin: 0 }}>{text}</p>
    ) : null}
    {action}
  </div>
);
