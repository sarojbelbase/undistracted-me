import React from 'react';
import { XLg } from 'react-bootstrap-icons';
import { ConfirmButton } from './ConfirmButton';

/**
 * ListPanel — a rounded-2xl bordered container listing items with automatic dividers.
 *
 * Used by: Countdown (calendar + custom), Occasions (manual entries), Events (upcoming).
 *
 * Props:
 *   items          — array of items to render
 *   emptyState     — ReactNode shown when items is empty
 *   maxItems       — cap at N items (default: Infinity)
 *   renderItem     — (item, index, isLast) => ReactNode
 *   className      — optional extra classes on the container
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
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ border: '1px solid var(--card-border)' }}
    >
      {sliced.map((item, i) => {
        const isLast = i === sliced.length - 1;
        const row = renderItem(item, i, isLast);

        // Inject divider if row is a plain div without borderBottom
        if (React.isValidElement(row) && !isLast) {
          return React.cloneElement(row, {
            key: row.key ?? i,
            style: {
              ...(row.props.style || {}),
              borderBottom: row.props.style?.borderBottom ?? '1px solid var(--card-border)',
            },
          });
        }

        return row;
      })}
    </div>
  );
};

// ─── Pre-built sub-components for common patterns ────────────────────────────

/**
 * Standard row layout: [avatar?] [title+meta] [label?] [delete?]
 * Used directly or composed by consumers.
 */
export const ListPanelRow = ({
  avatar,
  title,
  meta,
  label,
  onDelete,
  deleteLabel = 'Remove',
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

      {onDelete && (
        <ConfirmButton
          onConfirm={onDelete}
          label={deleteLabel}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer"
          style={{ color: 'var(--w-ink-4)', background: 'none' }}
        >
          <XLg size={11} />
        </ConfirmButton>
      )}
    </>
  );

  const rowStyle = {
    background: 'var(--panel-bg)',
    ...style,
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 w-full text-left border-none ${className}`}
        style={{ ...rowStyle, cursor: 'pointer' }}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${className}`} style={rowStyle}>
      {content}
    </div>
  );
};

export default ListPanel;
