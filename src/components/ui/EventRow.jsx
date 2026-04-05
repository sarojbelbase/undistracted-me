import { Trash3 } from 'react-bootstrap-icons';
import { TintedChip } from './TintedChip';
import { fmt12, calcDuration, datePrefixFor, isLiveNow } from '../../widgets/events/utils';

/**
 * EventRow — reusable event row shared across Events widget, AllEventsModal, and Calendar tooltip.
 *
 * Props:
 *  event       – { id, title, htmlLink?, startTime?, endTime?, startDate?, endDate?, meetLink?, _source? }
 *  onRemove    – optional handler; shows a hover-delete button for local (non-gcal) events
 *  showMeet    – show "Go to Meet" chip (default true)
 *  showPrefix  – prepend Today/Tomorrow/date prefix to meta row (default true)
 *  compact     – compact variant for calendar tooltip — thinner bar, smaller text, no chips/delete
 */
export const EventRow = ({
  event,
  onRemove,
  showMeet = true,
  showPrefix = true,
  compact = false,
}) => {
  const live = !compact && isLiveNow(event);
  const startLabel = fmt12(event.startTime);
  const endLabel = fmt12(event.endTime);
  const duration = calcDuration(event.startTime, event.endTime, event.startDate, event.endDate);
  const prefix = showPrefix ? datePrefixFor(event.startDate) : null;
  const meetLink = showMeet ? (event.meetLink || null) : null;

  const metaParts = [];
  if (!live) {
    if (prefix) metaParts.push({ text: prefix, accent: true });
    if (startLabel) metaParts.push({ text: startLabel });
    if (duration) metaParts.push({ text: duration });
  }

  const barW = compact ? 'w-[3.5px]' : 'w-[6px]';
  const minH = compact ? '24px' : '38px';
  const titleSz = compact ? 'text-[12px]' : 'text-[13px]';
  const metaSz = compact ? 'text-[10px]' : 'text-[11px]';

  return (
    <div className="flex items-stretch gap-3 group">

      {/* Accent bar — pulses when live */}
      <div
        className={`${barW} rounded-[2px] shrink-0 self-stretch${live ? ' animate-pulse' : ''}`}
        style={{ backgroundColor: live ? '#22c55e' : 'var(--w-accent)', minHeight: minH }}
      />

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">

        {/* Title + action chips */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            {event.htmlLink
              ? <a
                href={event.htmlLink}
                target="_blank"
                rel="noreferrer"
                className={`${titleSz} font-semibold leading-snug hover:opacity-80 block transition-opacity`}
                style={{ color: live ? '#22c55e' : 'var(--w-accent)' }}
              >{event.title}</a>
              : <p
                className={`${titleSz} font-semibold leading-snug`}
                style={{ color: live ? '#22c55e' : 'var(--w-ink-1)' }}
              >{event.title}</p>
            }
          </div>

          {!compact && (
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              {meetLink && (
                <TintedChip href={meetLink}>Go to Meet</TintedChip>
              )}
              {event._source !== 'gcal' && onRemove && (
                <button
                  onClick={() => onRemove(event.id)}
                  className="w-5 h-5 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 shrink-0 cursor-pointer"
                  style={{ color: 'var(--w-ink-5)' }}
                  aria-label={`Remove ${event.title}`}
                >
                  <Trash3 size={10} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Meta: prefix · time · duration  OR  in progress · ends HH:MM */}
        {live ? (
          <div className="flex items-center gap-1">
            <span className={`${metaSz} font-semibold`} style={{ color: 'rgba(34,197,94,0.75)' }}>
              in progress{endLabel ? ` · ends ${endLabel}` : ''}
            </span>
          </div>
        ) : metaParts.length > 0 ? (
          <div className="flex items-center gap-1">
            {metaParts.flatMap((part, i) => [
              i > 0
                ? <span
                  key={`d${i}`}
                  className={`${metaSz} font-semibold select-none`}
                  style={{ color: 'var(--w-ink-6)' }}
                >·</span>
                : null,
              <span
                key={`p${i}`}
                className={`${metaSz} font-semibold`}
                style={{
                  color: part.accent
                    ? 'color-mix(in srgb, var(--w-accent) 65%, var(--w-ink-3))'
                    : 'var(--w-ink-5)',
                }}
              >{part.text}</span>,
            ]).filter(Boolean)}
          </div>
        ) : null}
      </div>
    </div>
  );
};