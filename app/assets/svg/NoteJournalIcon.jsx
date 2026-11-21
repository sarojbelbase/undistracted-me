/**
 * NoteJournalIcon: journal-with-bookmark note icon (16×16, Bootstrap Icons
 * geometry). Inverted from `bi-journal-bookmark-fill`: the notebook cover is
 * solid-filled and the bookmark ribbon is an outline (no fill).
 *
 * The cover's evenodd fill knocks out three regions so they read as holes
 * against the solid cover:
 *   1. the bookmark ribbon silhouette (outlined back on top with a 1px ring),
 *   2. two spiral-binding rings along the left edge: punched through as
 *      transparent cutouts (previously filled black, which was invisible
 *      against the filled cover). Two rings, not three, so the binding reads
 *      as a deliberate spiral, not a stitched edge.
 */

export const NoteJournalIcon = ({ size = 14, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden="true" className={className}>
    {/* Solid cover with bookmark ribbon + two spiral-ring cutouts knocked out */}
    <path
      fillRule="evenodd"
      d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zM6 1h6v7a.5.5 0 0 1-.757.429L9 7.083 6.757 8.43A.5.5 0 0 1 6 8zM1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zM1 11v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z"
    />
    {/* Bookmark ribbon outline (no fill) */}
    <path
      fillRule="evenodd"
      d="M6 8V1h1v6.117L8.743 6.07a.5.5 0 0 1 .514 0L11 7.117V1h1v7a.5.5 0 0 1-.757.429L9 7.083 6.757 8.43A.5.5 0 0 1 6 8"
    />
  </svg>
);
