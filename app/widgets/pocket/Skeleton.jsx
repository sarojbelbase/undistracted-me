/**
 * SkeletonRows: the loading state for Pocket's save lists (widget card and
 * expanded view). Shimmering placeholder rows that mirror the real row height.
 */
export function SkeletonRows({ count = 5, widget = false }) {
  return (
    <div className="pocket-skeleton-list" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="pocket-skeleton-row">
          {widget && <div className="pocket-bone pocket-skeleton-row__tile" />}
          <div className="pocket-skeleton-row__lines">
            <div className="pocket-bone" style={{ width: "72%", height: 10 }} />
            <div className="pocket-bone" style={{ width: "42%", height: 7 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
