import { useState, useEffect, useRef } from 'react';
import { Input } from '../../components/ui/Input';
import { SegmentedDateTime } from '../../components/ui/SegmentedDateTime';
import { CANVAS_BORDER_SOFT } from '../../theme/canvas';
import { REPEAT_OPTIONS, MODE_OPTIONS } from './utils';
import { makeUid } from '../../utilities';

const makeId = () => makeUid('cd');

/**
 * AddCountdown — countdown form body + footer only (no modal chrome). Rendered
 * inside UnifiedAddDialog, which supplies the header, type selector, and Modal.
 */
export const AddCountdown = ({ onSave, onCancel, initial }) => {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(initial?.targetDate ?? '');
  const [time, setTime] = useState(initial?.targetTime ?? '');
  const [repeat, setRepeat] = useState(initial?.repeat ?? 'none');
  const [mode, setMode] = useState(initial?.mode ?? 'countdown');
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const titleValid = title.trim().length > 0;
  const valid = titleValid && date;
  const isSince = mode === 'since';

  const handleSave = () => {
    if (!valid) return;
    onSave({
      id: initial?.id ?? makeId(),
      title: title.trim(),
      targetDate: date,
      targetTime: time,
      repeat,
      mode,
    });
  };

  return (
    <>
      {/* Body */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Title */}
        <Input pill
          ref={titleRef}
          id="countdown-title"
          name="countdown-title"
          autoFocus
          type="text"
          placeholder="Trip to Japan, Launch day…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && valid) handleSave(); }}
          wrapperStyle={{ height: 44 }}
          style={{ fontSize: '14px', fontWeight: 500 }}
        />

        {/* Mode — Countdown or Since */}
        <div>
          <div style={{ marginBottom: 8 }}>
            <span className="w-label" style={{ color: 'var(--w-ink-3)' }}>Mode</span>
          </div>
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}>
            {MODE_OPTIONS.map(opt => {
              const active = mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  style={{
                    flex: 1, borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                    padding: '6px 0', cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                    background: active ? 'var(--w-accent)' : 'transparent',
                    color: active ? 'var(--w-accent-fg)' : 'var(--w-ink-3)',
                  }}
                >{opt.label}</button>
              );
            })}
          </div>
        </div>

        {/* When */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <span className="w-label" style={{ color: 'var(--w-ink-3)' }}>{isSince ? 'Date' : 'When'}</span>
          </div>
          <SegmentedDateTime mode="datetime" date={date} onDateChange={setDate} time={time} onTimeChange={setTime} />
        </div>

        {/* Repeat — only for countdown mode */}
        {!isSince && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <span className="w-label" style={{ color: 'var(--w-ink-3)' }}>Repeat</span>
            </div>
            <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}>
              {REPEAT_OPTIONS.map(r => {
                const active = repeat === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRepeat(r.value)}
                    style={{
                      flex: 1, borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                      padding: '6px 0', cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                      background: active ? 'var(--w-accent)' : 'transparent',
                      color: active ? 'var(--w-accent-fg)' : 'var(--w-ink-3)',
                    }}
                  >{r.label}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ height: 1, background: 'var(--card-border)' }} />
      <div style={{ display: 'flex', gap: 8, padding: '14px 20px' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 10,
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${CANVAS_BORDER_SOFT}`, background: 'transparent',
            color: 'var(--w-ink-2)', transition: 'all 0.15s',
          }}
        >Cancel</button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!valid}
          style={{
            flex: 2, padding: '9px 0', borderRadius: 10,
            fontSize: '13px', fontWeight: 600,
            border: 'none', background: 'var(--w-accent)', color: 'var(--w-accent-fg)',
            opacity: valid ? 1 : 0.4, cursor: valid ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >{initial ? 'Save Changes' : 'Save Countdown'}</button>
      </div>
    </>
  );
};
