import { FOCUS_THEME } from '../theme';
import { formatTime } from '../../../widgets/pomodoro/utils';

export const PomodoroPanel = ({ pomodoro }) => {
  const t = FOCUS_THEME;
  const pct = pomodoro.total > 0 ? (pomodoro.remaining / pomodoro.total) * 100 : 0;
  return (
    <div style={{ ...t.card, padding: '14px 16px' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.label, fontWeight: 700 }}>
        Focus{pomodoro.preset ? ` · ${pomodoro.preset}` : ''}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: t.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em', marginTop: 5 }}>
        {formatTime(pomodoro.remaining)}
      </div>
      <div style={{ marginTop: 10, height: 2, borderRadius: 2, background: t.track }}>
        <div style={{ height: '100%', borderRadius: 2, background: 'var(--w-accent)', width: `${pct.toFixed(1)}%`, transition: 'width 1s linear', opacity: 0.6 }} />
      </div>
    </div>
  );
};
