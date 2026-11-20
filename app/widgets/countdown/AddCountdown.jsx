import { useState, useEffect, useRef } from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SegmentedDateTime } from '../../components/ui/SegmentedDateTime';
import { REPEAT_OPTIONS, MODE_OPTIONS } from './utils';
import { makeUid } from '../../utilities';
import { trackWidgetEvent } from '../../utilities/telemetry';

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
    if (!initial) trackWidgetEvent('created', 'countdown');
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
          <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />
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
            <SegmentedControl options={REPEAT_OPTIONS} value={repeat} onChange={setRepeat} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ height: 1, background: 'var(--card-border)' }} />
      <div style={{ display: 'flex', gap: 8, padding: '14px 20px' }}>
        <Button variant="secondary" size="md" onClick={onCancel} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button variant="primary" size="md" onClick={handleSave} disabled={!valid} style={{ flex: 2 }}>
          {initial ? 'Save Changes' : 'Save Countdown'}
        </Button>
      </div>
    </>
  );
};
