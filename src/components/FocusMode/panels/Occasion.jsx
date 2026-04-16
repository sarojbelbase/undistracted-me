import { FOCUS_THEME } from '../theme';
import { daysLabel, typeLabel } from '../../../widgets/occasions/utils';

const OCCASION_ICONS = { birthday: '🎂', anniversary: '💑', other: '⭐' };

export const OccasionPanel = ({ occasions }) => {
  const t = FOCUS_THEME;
  const first = occasions[0];
  if (!first) return null;

  const isToday = first.daysAway === 0;
  const dotOpacity = isToday ? 0.9 : 0.45;

  return (
    <div style={{ ...t.card, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--w-accent)', opacity: dotOpacity, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.label, fontWeight: 700 }}>
          {isToday ? 'Today' : 'Occasion'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {occasions.map((o) => (
          <div key={`${o.name}-${o.month}-${o.day}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 13, flexShrink: 0 }} aria-hidden="true">
                {OCCASION_ICONS[o.type] ?? '⭐'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                {o.name}
              </span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: o.daysAway === 0 ? 'var(--w-accent)' : t.sub, flexShrink: 0 }}>
              {daysLabel(o.daysAway)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
