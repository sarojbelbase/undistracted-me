import { useState, useEffect, useRef } from 'react';
import { XLg, HourglassSplit, ArrowRepeat } from 'react-bootstrap-icons';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { SegmentedDateTime } from '../../components/ui/SegmentedDateTime';
import { Modal } from '../../components/ui/Modal';
import { CANVAS_BORDER_SOFT } from '../../theme/canvas';
import { REPEAT_OPTIONS } from './utils';
import { makeUid } from '../../utilities';

const makeId = () => makeUid('cd');

export const AddCountdown = ({ onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [repeat, setRepeat] = useState('none');
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const titleValid = title.trim().length > 0;
  const valid = titleValid && date;

  const handleSave = () => {
    if (!valid) return;
    onSave({ id: makeId(), title: title.trim(), targetDate: date, targetTime: time, repeat });
    onClose();
  };

  const headerIconStyle = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    background: 'var(--w-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <Modal onClose={onClose} style={{ width: 340 }} ariaLabel="New Countdown">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={headerIconStyle}>
            <HourglassSplit size={14} style={{ color: 'var(--w-accent-fg)' }} />
          </div>
          <div>
            <div className="w-heading" style={{ fontSize: '15px' }}>New Countdown</div>
            <div className="w-caption" style={{ marginTop: 1 }}>What are you counting down to?</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-colors btn-close cursor-pointer focus:outline-none"
          style={{ color: 'var(--w-ink-3)' }}
        >
          <XLg size={11} />
        </button>
      </div>

      <div style={{ height: 1, background: 'var(--card-border)' }} />

      {/* Body */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Title */}
        <SettingsInput
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

        {/* When */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <span className="w-label" style={{ color: 'var(--w-ink-3)' }}>When</span>
          </div>
          <SegmentedDateTime mode="datetime" date={date} onDateChange={setDate} time={time} onTimeChange={setTime} />
        </div>

        {/* Repeat */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <ArrowRepeat size={10} style={{ color: 'var(--w-ink-3)' }} />
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
      </div>

      {/* Footer */}
      <div style={{ height: 1, background: 'var(--card-border)' }} />
      <div style={{ display: 'flex', gap: 8, padding: '14px 20px' }}>
        <button
          type="button"
          onClick={onClose}
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
        >Save Countdown</button>
      </div>
    </Modal>
  );
};
