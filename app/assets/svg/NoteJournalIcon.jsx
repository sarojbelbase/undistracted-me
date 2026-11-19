/**
 * NoteJournalIcon — journal-with-bookmark note icon (16×16, Bootstrap Icons
 * geometry). Inverted from `bi-journal-bookmark-fill`: the notebook cover is
 * solid-filled and the bookmark ribbon is an outline (no fill).
 *
 * The cover fill knocks out the ribbon silhouette (evenodd), then a 1px ribbon
 * ring is drawn on top so the "empty" bookmark reads as an outline against the
 * solid cover. Spiral binding rings are kept from the original icon.
 */

export const NoteJournalIcon = ({ size = 14, color = 'currentColor', className }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color} aria-hidden="true" className={className}>
    {/* Solid cover with the bookmark ribbon knocked out */}
    <path
      fillRule="evenodd"
      d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zM6 1h6v7a.5.5 0 0 1-.757.429L9 7.083 6.757 8.43A.5.5 0 0 1 6 8z"
    />
    {/* Bookmark ribbon outline (no fill) */}
    <path
      fillRule="evenodd"
      d="M6 8V1h1v6.117L8.743 6.07a.5.5 0 0 1 .514 0L11 7.117V1h1v7a.5.5 0 0 1-.757.429L9 7.083 6.757 8.43A.5.5 0 0 1 6 8"
    />
    {/* Spiral binding rings */}
    <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1z" />
  </svg>
);
