import { Trash3Fill, PencilFill, Pin, PinFill } from 'react-bootstrap-icons';
import { RowActions } from './RowActions';

/**
 * ListPanel: a plain, chrome-less list of soft-rounded rows (the Pocket
 * expanded-list look: no card border, no dividers, quiet hover on each row).
 *
 * Used by: Countdown (calendar + custom), Occasions (manual entries).
 *
 * Props:
 *   items         : array of items to render
 *   emptyState    : ReactNode shown when items is empty
 *   maxItems      : cap at N items (default: Infinity)
 *   renderItem    : (item, index, isLast) => ReactNode
 *   className     : optional extra classes on the container
 */

export const ListPanel = ({
  items = [],
  emptyState = null,
  maxItems = Infinity,
  renderItem,
  className = '',
}) => {
  if (!items || items.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  const sliced = items.slice(0, maxItems);

  return (
    <div className={className}>
      {sliced.map((item, i) => renderItem(item, i, i === sliced.length - 1))}
    </div>
  );
};

// ─── Pre-built sub-components for common patterns ────────────────────────────

/**
 * Standard row layout: [avatar?] [title+meta] [label?] [actions]
 * Used directly or composed by consumers.
 */
export const ListPanelRow = ({
  avatar,
  title,
  meta,
  label,
  onDelete,
  deleteLabel = 'Remove',
  onEdit,
  editLabel = 'Edit',
  onPin,
  pinned = false,
  pinLabel = 'Pin as countdown face',
  onClick,
  className = '',
  style = {},
}) => {
  const content = (
    <>
      {avatar && <div className="shrink-0">{avatar}</div>}

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {typeof title === 'string' ? (
          <p
            className="text-[13px] font-semibold leading-snug truncate"
            style={{ color: 'var(--w-ink-1)' }}
          >
            {title}
          </p>
        ) : (
          title
        )}

        {meta && (
          <div className="flex items-center gap-1 flex-wrap">
            {meta.flatMap((part, i) => {
              if (part === null || part === undefined) return [];
              if (typeof part === 'string') {
                const el = (
                  <span
                    key={i}
                    className="text-[11px] font-semibold"
                    style={{ color: 'var(--w-ink-5)' }}
                  >
                    {part}
                  </span>
                );
                return [el];
              }
              const { text, accent, key } = part;
              const el = (
                <span
                  key={key ?? i}
                  className="text-[11px] font-semibold"
                  style={{ color: accent ? 'var(--w-ink-4)' : 'var(--w-ink-5)' }}
                >
                  {text}
                </span>
              );
              // Insert · separator between parts
              if (i > 0) {
                const sep = (
                  <span
                    key={`sep-${key ?? i}`}
                    className="text-[11px] font-semibold select-none"
                    style={{ color: 'var(--w-ink-6)' }}
                  >
                    ·
                  </span>
                );
                return [sep, el];
              }
              return [el];
            })}
          </div>
        )}
      </div>

      {label && (
        <span
          className="text-[13px] font-bold shrink-0 tabular-nums"
          style={{ color: 'var(--w-accent)' }}
        >
          {label}
        </span>
      )}
    </>
  );

  // Actions render as siblings of the clickable content so they're never nested
  // inside the row <button> when `onClick` is set. Pocket-style: a primary
  // "Edit" action plus a "More actions" menu (pin / remove). `.row-actions`
  // hides them until hover/keyboard-focus (and keeps them visible on touch):
  // see _utilities.scss.
  const actionItems = [];
  if (onPin) {
    actionItems.push({ label: pinned ? 'Unpin' : pinLabel, icon: pinned ? <PinFill size={13} /> : <Pin size={13} />, onSelect: onPin });
  }
  if (onDelete) {
    if (actionItems.length) actionItems.push({ divider: true });
    actionItems.push({ label: deleteLabel, icon: <Trash3Fill size={13} />, danger: true, onSelect: onDelete });
  }

  const actions = (
    <RowActions
      primary={onEdit ? { label: editLabel, icon: <PencilFill size={13} />, onClick: onEdit } : null}
      items={actionItems}
    />
  );

  const body = onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 flex-1 min-w-0 text-left border-none"
      style={{ background: 'transparent', padding: 0, cursor: 'pointer' }}
    >
      {content}
    </button>
  ) : (
    <div className="flex items-center gap-3 flex-1 min-w-0">{content}</div>
  );

  return (
    <div
      className={`um-list-row group flex items-center gap-3 px-3 py-2.5 ${className}`}
      style={style}
    >
      {body}
      {actions}
    </div>
  );
};

export default ListPanel;
