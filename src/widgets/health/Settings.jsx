import { PillButton } from '../../components/ui/PillButton';
import { useWidgetSettings } from '../useWidgetSettings';
import { DEFAULT_HEALTH_SETTINGS, METRICS, SHOW_KEYS } from './constants';

export const Settings = ({ id }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULT_HEALTH_SETTINGS);

  return (
    <div className="flex flex-col gap-5">

      {/* Metrics toggles */}
      <div className="flex flex-col gap-2">
        <span className="w-label">Show metrics</span>
        <div className="flex flex-col gap-1.5">
          {METRICS.map(({ key, label, color }) => {
            const field = SHOW_KEYS[key];
            const on = settings[field] ?? true;
            return (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Metric colour dot */}
                  <div
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: color, flexShrink: 0,
                    }}
                  />
                  <span className="w-body" style={{ color: 'var(--w-ink-2)' }}>
                    {label}
                  </span>
                </div>
                <PillButton
                  active={on}
                  onClick={() => updateSetting(field, !on)}
                >
                  {on ? 'On' : 'Off'}
                </PillButton>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info note */}
      <p className="text-[11px] leading-snug" style={{ color: 'var(--w-ink-4)' }}>
        Data is pulled from Google Fit and cached for 30 minutes.
        Connect Google in{' '}
        <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>
          Settings → Accounts
        </span>
        .
      </p>

    </div>
  );
};
