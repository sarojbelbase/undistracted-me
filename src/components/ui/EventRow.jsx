import { Trash } from 'react-bootstrap-icons';
import { TintedChip } from './TintedChip';
import { fmt12, calcDuration, datePrefixFor, isLiveNow } from '../../widgets/events/utils';

function EventTitle({ event, live, titleSz, compact, meetLink }) {
  return (
    <div className="flex items-start gap-2">
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
      {!compact && meetLink && (
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <TintedChip href={meetLink}>Go to Meet</TintedChip>
        </div>
      )}
    </div>
  );
}

function EventMeta({ live, metaParts, endLabel, metaSz }) {
  if (live) {
    return (
      <div className="flex items-center gap-1">
        <span className={`${metaSz} font-semibold`} style={{ color: 'rgba(34,197,94,0.75)' }}>
          in progress{endLabel ? ` \u00B7 ends ${endLabel}` : ''}
        </span>
      </div>
    );
  }
  if (metaParts.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {metaParts.flatMap((part, i) => [
        i > 0
          ? <span
            key={`sep-${part.text}`}
            className={`${metaSz} font-semibold select-none`}
            style={{ color: 'var(--w-ink-6)' }}
          >{'\u00B7'}</span>
          : null,
        <span
          key={`part-${part.text}`}
          className={`${metaSz} font-semibold`}
          style={{
            color: part.accent ? 'var(--w-accent)' : 'var(--w-ink-5)',
          }}
        >{part.text}</span>,
      ]).filter(Boolean)}
    </div>
  );
}

/**
 * EventRow - reusable event row shared across Events widget, AllEventsModal, and Calendar tooltip.
 *
 * Props:
 *  event       - { id, title, htmlLink?, startTime?, endTime?, startDate?, endDate?, meetLink?, _source? }
 *  onRemove    - optional handler; shows a hover-delete button for local (non-gcal) events
 *  showMeet    - show "Go to Meet" chip (default true)
 *  showPrefix  - prepend Today/Tomorrow/date prefix to meta row (default true)
 *  compact     - compact variant for calendar tooltip - thinner bar, smaller text, no chips/delete
 */
export const EventRow = ({
  event,
  onRemove,
  showMeet = true,
  showPrefix = true,
  compact = false,
}) => {
  const live = !compact && isLiveNow(event);
  const endLabel = fmt12(event.endTime);
  const startLabel = fmt12(event.startTime);
  const duration = calcDuration(event.startTime, event.endTime, event.startDate, event.endDate);
  const prefix = showPrefix ? datePrefixFor(event.startDate) : null;
  const meetLink = showMeet ? (event.meetLink || null) : null;

  const metaParts = [];
  if (!live) {
    if (prefix) metaParts.push({ text: prefix, accent: true });
    if (startLabel) metaParts.push({ text: startLabel });
    if (duration) metaParts.push({ text: duration });
  }

  const SIZE = compact
    ? { bar: 'w-[3.5px]', minH: '24px', title: 'text-[12px]', meta: 'text-[10px]' }
    : { bar: 'w-[6px]', minH: '38px', title: 'text-[13px]', meta: 'text-[11px]' };
  const { bar: barW, minH, title: titleSz, meta: metaSz } = SIZE;

  return (
    <div className="relative flex items-stretch gap-3 group">

      {/* Accent bar - pulses when live */}
      <div
        className={`${barW} rounded-xs shrink-0 self-stretch${live ? ' animate-pulse' : ''}`}
        style={{ backgroundColor: live ? '#22c55e' : 'var(--w-accent)', minHeight: minH }}
      />

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">

        {/* Title row */}
        <EventTitle event={event} live={live} titleSz={titleSz} compact={compact} meetLink={meetLink} />

        {/* Trash - absolutely positioned top-right, never affects row width */}
        {!compact && event._source !== 'gcal' && onRemove && (
          <button
            onClick={() => onRemove(event.id)}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 cursor-pointer"
            style={{ color: 'var(--w-ink-4)' }}
            aria-label={`Remove ${event.title}`}
          >
            <Trash size={14} />
          </button>
        )}

        {/* Meta: prefix / time / duration  OR  in progress / ends HH:MM */}
        <EventMeta live={live} metaParts={metaParts} endLabel={endLabel} metaSz={metaSz} />
      </div>
    </div>
  );
};