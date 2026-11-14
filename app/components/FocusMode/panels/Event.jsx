import { FOCUS_THEME } from '../theme';
import { getTimeUntilEvent, formatEventStartTime } from '../../../widgets/events/utils';

export const EventPanel = ({ eventInfo }) => {
  const t = FOCUS_THEME;
  const { event, isActive } = eventInfo;
  return (
    <div style={{ ...t.card, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--w-accent)', opacity: isActive ? 0.9 : 0.45, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.label, fontWeight: 700 }}>
          {isActive ? 'Now' : 'Upcoming'}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
        {event.title}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, marginTop: 3, color: t.sub }}>
        {isActive ? 'in progress' : getTimeUntilEvent(event)}
        {formatEventStartTime(event) ? ` · ${formatEventStartTime(event)}` : ''}
      </div>
    </div>
  );
};
