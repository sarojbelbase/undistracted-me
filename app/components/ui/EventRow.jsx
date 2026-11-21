import { useRef, useState } from 'react';
import {
  Trash3Fill, Pin, PinFill, PencilFill, ThreeDots,
  CameraVideoFill, Calendar3,
} from 'react-bootstrap-icons';
import { IconButton } from './IconButton';
import { ActionMenu } from './ActionMenu';
import { fmt12, calcDuration, datePrefixFor, isLiveNow } from '../../widgets/events/utils';

function openExternal(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function EventTitle({ event, live, titleSz, clickable }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        {event.htmlLink && !clickable
          ? <a
            href={event.htmlLink}
            target="_blank"
            rel="noreferrer"
            className={`${titleSz} font-semibold leading-snug hover:opacity-80 block transition-opacity`}
            style={{ color: live ? 'var(--w-success)' : 'var(--w-accent)' }}
          >{event.title}</a>
          : <p
            className={`${titleSz} font-semibold leading-snug ${clickable ? 'hover:opacity-80 transition-opacity' : ''}`}
            style={{ color: live ? 'var(--w-success)' : clickable ? 'var(--w-accent)' : 'var(--w-ink-1)' }}
          >{event.title}</p>
        }
      </div>
    </div>
  );
}

function EventMeta({ live, metaParts, endLabel, metaSz }) {
  if (live) {
    return (
      <div className="flex items-center gap-1">
        <span className={`${metaSz} font-semibold`} style={{ color: 'color-mix(in srgb, var(--w-success) 75%, transparent)' }}>
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
 * EventActions: pocket-style primary action + "More actions" menu for an event
 * row. Primary is "Go to Meet" (join now) > "Go to Calendar" (view) > "Edit"
 * (local). The menu holds the rest: Go to Calendar, Go to Meet, Pin/Unpin and
 * Remove (local only). Revealed on hover / keyboard focus via `.row-actions`,
 * kept visible while the menu is open via `--active`.
 */
function EventActions({ event, onOpen, onPin, pinned, pinLabel, onRemove, meetLink, calLink }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const moreRef = useRef(null);
  const isGcal = event._source === 'gcal';
  const canRemove = !!onRemove && !isGcal;

  const primaryKind = meetLink ? 'meet' : calLink ? 'calendar' : (typeof onOpen === 'function' ? 'edit' : null);

  const openMenu = (e) => {
    e.stopPropagation();
    moreRef.current = e.currentTarget;
    const r = e.currentTarget.getBoundingClientRect();
    setMenuAnchor({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
  };

  const menuItems = [];
  if (calLink && primaryKind !== 'calendar') {
    menuItems.push({ label: 'Go to Calendar', icon: <Calendar3 size={13} />, onSelect: () => openExternal(calLink) });
  }
  if (meetLink && primaryKind !== 'meet') {
    menuItems.push({ label: 'Go to Meet', icon: <CameraVideoFill size={13} />, onSelect: () => openExternal(meetLink) });
  }
  if (onPin) {
    if (menuItems.length) menuItems.push({ divider: true });
    menuItems.push({ label: pinned ? 'Unpin' : pinLabel, icon: pinned ? <PinFill size={13} /> : <Pin size={13} />, onSelect: onPin });
  }
  if (canRemove) {
    if (menuItems.length) menuItems.push({ divider: true });
    menuItems.push({ label: 'Remove', icon: <Trash3Fill size={13} />, danger: true, onSelect: () => onRemove(event.id) });
  }

  const primary = primaryKind === 'meet' ? (
    <IconButton label="Go to Meet" size="sm" onClick={(e) => { e.stopPropagation(); openExternal(meetLink); }}><CameraVideoFill size={13} /></IconButton>
  ) : primaryKind === 'calendar' ? (
    <IconButton label="Go to Calendar" size="sm" onClick={(e) => { e.stopPropagation(); openExternal(calLink); }}><Calendar3 size={13} /></IconButton>
  ) : primaryKind === 'edit' ? (
    <IconButton label="Edit" size="sm" onClick={(e) => { e.stopPropagation(); onOpen(event); }}><PencilFill size={13} /></IconButton>
  ) : null;

  return (
    <div
      className={`row-actions flex items-center gap-0.5 shrink-0 self-center ${menuAnchor ? 'row-actions--active' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {primary}
      {menuItems.length > 0 && (
        <IconButton label="More actions" size="sm" onMouseDown={(e) => e.stopPropagation()} onClick={openMenu}>
          <ThreeDots size={14} />
        </IconButton>
      )}
      {menuAnchor && (
        <ActionMenu anchor={menuAnchor} triggerRef={moreRef} items={menuItems} onClose={() => setMenuAnchor(null)} />
      )}
    </div>
  );
}

/**
 * EventRow - reusable event row shared across Events widget, expanded view and Calendar tooltip.
 *
 * Props:
 *  event       - { id, title, htmlLink?, startTime?, endTime?, startDate?, endDate?, meetLink?, _source? }
 *  onRemove    - optional handler; exposes a "Remove" action for local (non-gcal) events
 *  onPin       - optional handler; exposes a pin/unpin action (countdown face)
 *  pinned      - whether the event is currently pinned (default false)
 *  pinLabel    - label for the pin action (default 'Count down to this')
 *  showMeet    - show Meet/Calendar link actions (default true)
 *  showPrefix  - prepend Today/Tomorrow/date prefix to meta row (default true)
 *  showBar     - render the left accent bar (default true); disable in the
 *                expanded list for a cleaner, bar-less pocket look
 *  compact     - compact variant for calendar tooltip - thinner bar, smaller text, no actions
 *  onOpen      - optional handler; makes the row clickable (goes to the event)
 *                and renders the title as accent text instead of a link
 */
export const EventRow = ({
  event,
  onRemove,
  onPin,
  pinned = false,
  pinLabel = 'Count down to this',
  showMeet = true,
  showPrefix = true,
  showBar = true,
  compact = false,
  onOpen,
}) => {
  const live = !compact && isLiveNow(event);
  const endLabel = fmt12(event.endTime);
  const startLabel = fmt12(event.startTime);
  const duration = calcDuration(event.startTime, event.endTime, event.startDate, event.endDate);
  const prefix = showPrefix ? datePrefixFor(event.startDate) : null;
  const meetLink = showMeet ? (event.meetLink || null) : null;
  const calLink = event.htmlLink || null;

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

  const clickable = typeof onOpen === 'function';
  const hasActions = !compact && !!(meetLink || calLink || onPin || (onRemove && event._source !== 'gcal'));

  const handleKeyDown = (e) => {
    if (!clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(event);
    }
  };

  return (
    <div
      className={`relative flex ${showBar ? 'items-stretch gap-3' : 'items-center'} group${clickable ? ' cursor-pointer' : ''}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onOpen(event) : undefined}
      onKeyDown={handleKeyDown}
    >

      {/* Accent bar - pulses when live */}
      {showBar && (
        <div
          className={`${barW} rounded-xs shrink-0 self-stretch${live ? ' animate-pulse' : ''}`}
          style={{ backgroundColor: live ? 'var(--w-success)' : 'var(--w-accent)', minHeight: minH }}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">

        {/* Title row */}
        <EventTitle event={event} live={live} titleSz={titleSz} clickable={clickable} />

        {/* Meta: prefix / time / duration  OR  in progress / ends HH:MM */}
        <EventMeta live={live} metaParts={metaParts} endLabel={endLabel} metaSz={metaSz} />
      </div>

      {/* Actions: pocket-style primary + "More actions", revealed on hover */}
      {hasActions && (
        <EventActions
          event={event}
          onOpen={onOpen}
          onPin={onPin}
          pinned={pinned}
          pinLabel={pinLabel}
          onRemove={onRemove}
          meetLink={meetLink}
          calLink={calLink}
        />
      )}
    </div>
  );
};
