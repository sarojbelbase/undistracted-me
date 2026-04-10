import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CalendarEvent, Clock, ChevronLeft, ChevronRight } from 'react-bootstrap-icons';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

const makeSegColor = (isActive, hasValue) => {
  if (isActive) return 'var(--w-accent)';
  return hasValue ? 'var(--w-ink-1)' : 'var(--w-ink-5)';
};

const makeSegStyle = (isActive, hasValue, minW) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: '6px', padding: '2px 5px', minWidth: minW,
  background: isActive ? 'color-mix(in srgb, var(--w-accent) 13%, transparent)' : 'transparent',
  color: makeSegColor(isActive, hasValue),
  fontWeight: 600, fontSize: '12px', cursor: 'pointer',
  outline: 'none', border: 'none',
  transition: 'background 0.1s, color 0.1s', userSelect: 'none', WebkitUserSelect: 'none',
  flexShrink: 0,
});

const VSep = () => (
  <div style={{ width: '1px', background: 'var(--w-border)', alignSelf: 'stretch', margin: '8px 5px', flexShrink: 0 }} />
);

const Slash = () => (
  <span style={{ color: 'var(--w-ink-6)', fontSize: '11px', userSelect: 'none', padding: '0 1px', lineHeight: 1, flexShrink: 0 }}>/</span>
);
const Colon = () => (
  <span style={{ color: 'var(--w-ink-5)', fontSize: '13px', fontWeight: 700, lineHeight: 1, userSelect: 'none', padding: '0 1px', flexShrink: 0 }}>:</span>
);

const makeDayStyle = (isSel, isTod, isEmpty) => {
  const base = {
    width: '28px', height: '28px', borderRadius: '7px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: isSel || isTod ? 700 : 400,
    border: 'none', margin: '0 auto', outline: 'none',
    transition: 'background 0.1s, color 0.1s',
    cursor: isEmpty ? 'default' : 'pointer',
  };
  if (isEmpty) return { ...base, background: 'transparent', color: 'transparent', pointerEvents: 'none' };
  if (isSel) return { ...base, background: 'var(--w-accent)', color: 'var(--w-accent-fg)' };
  if (isTod) return { ...base, background: 'transparent', color: 'var(--w-accent)', boxShadow: 'inset 0 0 0 1.5px var(--w-accent)' };
  return { ...base, background: 'transparent', color: 'var(--w-ink-2)' };
};

const NAV_BTN = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--w-ink-4)', borderRadius: '6px', padding: '3px 6px',
  display: 'flex', alignItems: 'center', transition: 'color 0.1s',
};

const makePickerItemStyle = (isSel) => ({
  width: '100%', padding: '5px 0', borderRadius: '7px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '11px', fontWeight: isSel ? 700 : 400,
  border: 'none', outline: 'none', cursor: 'pointer',
  background: isSel ? 'var(--w-accent)' : 'transparent',
  color: isSel ? 'var(--w-accent-fg)' : 'var(--w-ink-2)',
  transition: 'background 0.1s, color 0.1s',
});

const makeAmPmStyle = (isSel) => ({
  flex: 1, padding: '5px 0', borderRadius: '7px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '11px', fontWeight: 700, border: 'none', outline: 'none', cursor: 'pointer',
  background: isSel ? 'var(--w-accent)' : 'transparent',
  color: isSel ? 'var(--w-accent-fg)' : 'var(--w-ink-4)',
  transition: 'background 0.1s, color 0.1s',
});

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_COARSE = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const TimePopover = ({ anchorEl, hour12, minute, ampm, tab, onSetHour, onSetMinute, onSetAmPm, onTabChange, onClose }) => {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const update = () => {
      if (!anchorEl) return;
      const r = anchorEl.getBoundingClientRect();
      const calW = 188;
      const clampedLeft = Math.max(8, Math.min(r.left, window.innerWidth - calW - 8));
      setPos({ top: r.bottom + 6, left: clampedLeft });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [anchorEl]);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const TAB_BTN = (active) => ({
    flex: 1, padding: '4px 0', fontSize: '11px', fontWeight: 600,
    border: 'none', borderRadius: '7px', cursor: 'pointer',
    background: active ? 'color-mix(in srgb, var(--w-accent) 15%, transparent)' : 'transparent',
    color: active ? 'var(--w-accent)' : 'var(--w-ink-4)',
    transition: 'background 0.1s, color 0.1s',
  });

  const items = tab === 'hour' ? HOURS : MINUTES_COARSE;
  const curSelMinute = MINUTES_COARSE.includes(minute) ? minute : null;
  const curSel = tab === 'hour' ? hour12 : curSelMinute;

  if (!pos) return null;

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={onClose} aria-hidden="true" />
      <div style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 300,
        background: 'var(--w-surface)', border: '1px solid var(--w-border)',
        borderRadius: '14px', padding: '10px', width: '188px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <button type="button" style={TAB_BTN(tab === 'hour')} onClick={() => onTabChange('hour')}>Hour</button>
          <button type="button" style={TAB_BTN(tab === 'minute')} onClick={() => onTabChange('minute')}>Minute</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2px', marginBottom: '8px' }}>
          {items.map(v => (
            <button key={v} type="button"
              onClick={() => { if (tab === 'hour') onSetHour(v); else onSetMinute(v); }}
              style={makePickerItemStyle(curSel === v)}
            >{tab === 'hour' ? v : String(v).padStart(2, '0')}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px', padding: '2px', background: 'var(--w-surface-2)', borderRadius: '8px' }}>
          <button type="button" style={makeAmPmStyle(ampm === 'AM')} onClick={() => onSetAmPm('AM')}>AM</button>
          <button type="button" style={makeAmPmStyle(ampm === 'PM')} onClick={() => onSetAmPm('PM')}>PM</button>
        </div>
      </div>
    </>,
    document.body
  );
};

const CalendarPopover = ({ anchorEl, navYear, navMonth, selYear, selMonth, selDay, onSelectDay, onNavMonth, onClose }) => {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const update = () => {
      if (!anchorEl) return;
      const r = anchorEl.getBoundingClientRect();
      const calW = 228;
      const clampedLeft = Math.max(8, Math.min(r.left, window.innerWidth - calW - 8));
      setPos({ top: r.bottom + 6, left: clampedLeft });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [anchorEl]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const firstDow = new Date(navYear, navMonth - 1, 1).getDay();
  const totalDays = daysInMonth(navYear, navMonth);
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(0);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(0);

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth() + 1;
  const todayD = today.getDate();

  if (!pos) return null;

  return createPortal(
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={onClose} aria-hidden="true" />
      <div style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 300,
        background: 'var(--w-surface)', border: '1px solid var(--w-border)',
        borderRadius: '14px', padding: '12px', width: '228px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <button type="button" style={NAV_BTN} onClick={() => onNavMonth(-1)} aria-label="Previous month"><ChevronLeft size={11} /></button>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--w-ink-1)' }}>{MONTH_ABBR[navMonth - 1]} {navYear}</span>
          <button type="button" style={NAV_BTN} onClick={() => onNavMonth(1)} aria-label="Next month"><ChevronRight size={11} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
          {DAY_ABBR.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '9px', color: 'var(--w-ink-5)', fontWeight: 700, letterSpacing: '0.05em', padding: '2px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
          {cells.map((d, i) => {
            const isEmpty = d === 0;
            const isSel = !isEmpty && selYear === navYear && selMonth === navMonth && selDay === d;
            const isTod = !isEmpty && todayY === navYear && todayM === navMonth && todayD === d;
            return (
              <button key={isEmpty ? `empty-${i}` : `day-${d}`} type="button" disabled={isEmpty}
                onClick={() => { if (!isEmpty) onSelectDay(navYear, navMonth, d); }}
                style={makeDayStyle(isSel, isTod, isEmpty)}
                aria-label={isEmpty ? undefined : String(d)}
                aria-pressed={isSel || undefined}
              >{isEmpty ? null : d}</button>
            );
          })}
        </div>
      </div>
    </>,
    document.body
  );
};

export const SegmentedDateTime = ({
  mode = 'datetime',
  date = '',
  onDateChange,
  time = '',
  onTimeChange,
}) => {
  const wrapRef = useRef(null);
  const [active, setActive] = useState(null);
  const [buf, setBuf] = useState('');
  const [showCal, setShowCal] = useState(false);
  const [navYear, setNavYear] = useState(null);
  const [navMonth, setNavMonth] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeTab, setTimeTab] = useState('hour');

  const showDate = mode === 'date' || mode === 'datetime';
  const showTime = mode === 'time' || mode === 'datetime';

  // ── Parsed parts ────────────────────────────────────────────────────────────
  const dateParts = useMemo(() => {
    if (!date) return null;
    const [y, m, d] = date.split('-').map(Number);
    return { year: y, month: m, day: d };
  }, [date]);

  const timeParts = useMemo(() => {
    if (!time) return null;
    const [h, m] = time.split(':').map(Number);
    let hour12;
    if (h === 0) hour12 = 12;
    else if (h > 12) hour12 = h - 12;
    else hour12 = h;
    return { minute: m, hour12, ampm: h >= 12 ? 'PM' : 'AM' };
  }, [time]);

  const now = new Date();
  const dp = dateParts ?? { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  const tp = timeParts ?? { hour12: 12, minute: 0, ampm: 'AM' };
  const calNavYear = navYear ?? dp.year;
  const calNavMonth = navMonth ?? dp.month;

  const stepTo = (seg) => { setActive(seg); setBuf(''); };
  const closeCal = useCallback(() => setShowCal(false), []);
  const closeTimePicker = useCallback(() => setShowTimePicker(false), []);

  const openTimePicker = (seg) => {
    setActive(seg); setBuf('');
    setTimeTab(seg === 'minute' ? 'minute' : 'hour');
    setShowCal(false);
    setShowTimePicker(true);
  };

  const openCal = (seg) => {
    setActive(seg); setBuf('');
    setNavYear(dp.year); setNavMonth(dp.month);
    setShowTimePicker(false);
    setShowCal(true);
  };

  const handleNavMonth = (dir) => {
    const nextM = calNavMonth + dir;
    if (nextM < 1) { setNavYear(calNavYear - 1); setNavMonth(12); }
    else if (nextM > 12) { setNavYear(calNavYear + 1); setNavMonth(1); }
    else setNavMonth(nextM);
  };

  const handleSelectDay = (y, m, d) => {
    onDateChange?.(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    setShowCal(false);
  };

  // ── Date emitters ────────────────────────────────────────────────────────────
  const goDate = (y, m, d) =>
    onDateChange?.(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

  const commitMonth = (m) => {
    const safe = Math.min(Math.max(m, 1), 12);
    goDate(dp.year, safe, Math.min(dp.day, daysInMonth(dp.year, safe)));
  };
  const commitDay = (d) =>
    goDate(dp.year, dp.month, Math.min(Math.max(d, 1), daysInMonth(dp.year, dp.month)));
  const commitYear = (y) => {
    const cy = Math.min(Math.max(y, 1900), 2100);
    goDate(cy, dp.month, Math.min(dp.day, daysInMonth(cy, dp.month)));
  };

  // ── Time emitters ────────────────────────────────────────────────────────────
  const flipAmPm = () => (tp.ampm === 'AM' ? 'PM' : 'AM');
  const goTime = (h12, ampm, min) => {
    let h = h12 % 12;
    if (ampm === 'PM') h += 12;
    if (h12 === 12 && ampm === 'AM') h = 0;
    if (h12 === 12 && ampm === 'PM') h = 12;
    onTimeChange?.(`${String(h).padStart(2, '0')}:${String(Math.min(59, Math.max(0, min))).padStart(2, '0')}`);
  };

  // ── Arrow up/down ────────────────────────────────────────────────────────────
  const handleUp = (seg) => {
    if (seg === 'month') { const nm = dp.month === 12 ? 1 : dp.month + 1; goDate(dp.year, nm, Math.min(dp.day, daysInMonth(dp.year, nm))); }
    else if (seg === 'day') commitDay(dp.day >= daysInMonth(dp.year, dp.month) ? 1 : dp.day + 1);
    else if (seg === 'year') commitYear(dp.year + 1);
    else if (seg === 'hour') goTime(tp.hour12 >= 12 ? 1 : tp.hour12 + 1, tp.ampm, tp.minute);
    else if (seg === 'minute') goTime(tp.hour12, tp.ampm, (tp.minute + 1) % 60);
    else goTime(tp.hour12, flipAmPm(), tp.minute);
  };

  const handleDown = (seg) => {
    if (seg === 'month') { const nm = dp.month === 1 ? 12 : dp.month - 1; goDate(dp.year, nm, Math.min(dp.day, daysInMonth(dp.year, nm))); }
    else if (seg === 'day') commitDay(dp.day <= 1 ? daysInMonth(dp.year, dp.month) : dp.day - 1);
    else if (seg === 'year') commitYear(dp.year - 1);
    else if (seg === 'hour') goTime(tp.hour12 <= 1 ? 12 : tp.hour12 - 1, tp.ampm, tp.minute);
    else if (seg === 'minute') goTime(tp.hour12, tp.ampm, (tp.minute - 1 + 60) % 60);
    else goTime(tp.hour12, flipAmPm(), tp.minute);
  };

  // ── Digit handlers ───────────────────────────────────────────────────────────
  const handleMonthDigit = (nb) => {
    const m = Number.parseInt(nb, 10);
    setBuf(nb);
    if (nb.length === 2 || m > 1) { commitMonth(m); stepTo('day'); }
  };

  const handleDayDigit = (nb) => {
    const d = Number.parseInt(nb, 10);
    setBuf(nb);
    if (nb.length === 2 || d > 3) { commitDay(d); stepTo('year'); }
  };

  const handleYearDigit = (nb) => {
    setBuf(nb);
    if (nb.length === 4) {
      commitYear(Number.parseInt(nb, 10));
      setBuf('');
      if (showTime) stepTo('hour');
    }
  };

  const handleHourDigit = (nb) => {
    const h = Number.parseInt(nb, 10);
    setBuf(nb);
    if (nb.length === 2 || h > 1) { goTime(Math.min(Math.max(h, 1), 12), tp.ampm, tp.minute); stepTo('minute'); }
  };

  const handleMinuteDigit = (nb) => {
    const m = Number.parseInt(nb, 10);
    setBuf(nb);
    if (nb.length === 2 || m > 5) { goTime(tp.hour12, tp.ampm, Math.min(m, 59)); stepTo('ampm'); }
  };

  // ── Arrow left/right ─────────────────────────────────────────────────────────
  const handleRight = (seg) => {
    if (seg === 'month') {
      if (buf) commitMonth(Number.parseInt(buf, 10) || 1);
      stepTo('day');
    } else if (seg === 'day') {
      if (buf) commitDay(Number.parseInt(buf, 10) || 1);
      stepTo('year');
    } else if (seg === 'year' && showTime) stepTo('hour');
    else if (seg === 'hour') stepTo('minute');
    else if (seg === 'minute') stepTo('ampm');
  };

  const handleLeft = (seg) => {
    if (seg === 'ampm') stepTo('minute');
    else if (seg === 'minute') stepTo('hour');
    else if (seg === 'hour' && showDate) stepTo('year');
    else if (seg === 'year') stepTo('day');
    else if (seg === 'day') stepTo('month');
  };

  // ── Key handler ──────────────────────────────────────────────────────────────
  const handleDigit = (seg, nb) => {
    if (seg === 'month') handleMonthDigit(nb);
    else if (seg === 'day') handleDayDigit(nb);
    else if (seg === 'year') handleYearDigit(nb);
    else if (seg === 'hour') handleHourDigit(nb);
    else if (seg === 'minute') handleMinuteDigit(nb);
  };

  const onKey = (seg, e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); handleUp(seg); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); handleDown(seg); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); handleRight(seg); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); handleLeft(seg); }
    else if (seg === 'ampm' && /^[aApP]$/.test(e.key)) {
      e.preventDefault();
      goTime(tp.hour12, /^[aA]$/.test(e.key) ? 'AM' : 'PM', tp.minute);
    } else if (/^\d$/.test(e.key) && seg !== 'ampm') {
      e.preventDefault();
      handleDigit(seg, buf + e.key);
    }
  };

  // ── Display values ───────────────────────────────────────────────────────────
  const isFocused = active !== null;
  const hasDate = dateParts !== null;
  const hasTime = timeParts !== null;

  const dispMonth = () => {
    if (active === 'month' && buf) {
      const idx = Number.parseInt(buf, 10) - 1;
      return (idx >= 0 && idx < 12) ? MONTH_ABBR[idx] : buf;
    }
    return hasDate ? MONTH_ABBR[dateParts.month - 1] : 'Mon';
  };

  const dispDay = () => {
    if (active === 'day' && buf) return buf.padStart(2, '0');
    return hasDate ? String(dateParts.day).padStart(2, '0') : 'DD';
  };

  const dispYear = () => {
    if (active === 'year' && buf) return buf;
    return hasDate ? String(dateParts.year) : 'YYYY';
  };

  const dispHour = () => {
    if (active === 'hour' && buf) return buf;
    return hasTime ? String(timeParts.hour12).padStart(2, '0') : 'HH';
  };

  const dispMin = () => {
    if (active === 'minute' && buf) return buf;
    return hasTime ? String(timeParts.minute).padStart(2, '0') : 'MM';
  };

  let legendLabel;
  if (mode === 'date') legendLabel = 'Date';
  else if (mode === 'time') legendLabel = 'Time';
  else legendLabel = 'Date and Time';

  return (
    <>
      <fieldset
        aria-label={legendLabel}
        ref={wrapRef}
        onBlur={(e) => { if (!wrapRef.current?.contains(e.relatedTarget)) { setActive(null); setBuf(''); } }}
        style={{
          display: 'flex', alignItems: 'center', gap: '2px',
          width: '100%', boxSizing: 'border-box',
          borderRadius: '12px', padding: '0 10px', height: '36px',
          backgroundColor: 'var(--w-surface-2)',
          border: (isFocused || showCal || showTimePicker)
            ? '1px solid color-mix(in srgb, var(--w-accent) 35%, transparent)'
            : '1px solid var(--w-border)',
          transition: 'border-color 0.15s', margin: 0,
        }}
      >
        {showDate && (
          <>
            <CalendarEvent size={12} style={{ color: 'var(--w-ink-5)', flexShrink: 0, marginRight: '3px' }} />
            <button type="button" style={makeSegStyle(active === 'month', hasDate, '30px')} onFocus={() => stepTo('month')} onKeyDown={(e) => onKey('month', e)} onClick={() => openCal('month')}>{dispMonth()}</button>
            <Slash />
            <button type="button" style={makeSegStyle(active === 'day', hasDate, '30px')} onFocus={() => stepTo('day')} onKeyDown={(e) => onKey('day', e)} onClick={() => openCal('day')}>{dispDay()}</button>
            <Slash />
            <button type="button" style={makeSegStyle(active === 'year', hasDate, '42px')} onFocus={() => stepTo('year')} onKeyDown={(e) => onKey('year', e)} onClick={() => openCal('year')}>{dispYear()}</button>
          </>
        )}

        {showDate && showTime && <VSep />}

        {showTime && (
          <>
            {!showDate && <Clock size={12} style={{ color: 'var(--w-ink-5)', flexShrink: 0, marginRight: '4px' }} />}
            <button type="button" style={makeSegStyle(active === 'hour', hasTime, '26px')} onFocus={() => stepTo('hour')} onKeyDown={(e) => onKey('hour', e)} onClick={() => openTimePicker('hour')}>{dispHour()}</button>
            <Colon />
            <button type="button" style={makeSegStyle(active === 'minute', hasTime, '26px')} onFocus={() => stepTo('minute')} onKeyDown={(e) => onKey('minute', e)} onClick={() => openTimePicker('minute')}>{dispMin()}</button>
            <VSep />
            <button type="button" style={makeSegStyle(active === 'ampm', hasTime, '32px')} onFocus={() => stepTo('ampm')} onKeyDown={(e) => onKey('ampm', e)} onClick={() => openTimePicker('ampm')}>{hasTime ? timeParts.ampm : 'AM'}</button>
          </>
        )}
      </fieldset>

      {showCal && (
        <CalendarPopover
          anchorEl={wrapRef.current}
          navYear={calNavYear}
          navMonth={calNavMonth}
          selYear={dateParts?.year}
          selMonth={dateParts?.month}
          selDay={dateParts?.day}
          onSelectDay={handleSelectDay}
          onNavMonth={handleNavMonth}
          onClose={closeCal}
        />
      )}

      {showTimePicker && (
        <TimePopover
          anchorEl={wrapRef.current}
          hour12={tp.hour12}
          minute={tp.minute}
          ampm={tp.ampm}
          tab={timeTab}
          onTabChange={setTimeTab}
          onSetHour={(h) => { goTime(h, tp.ampm, tp.minute); }}
          onSetMinute={(m) => { goTime(tp.hour12, tp.ampm, m); }}
          onSetAmPm={(a) => { goTime(tp.hour12, a, tp.minute); }}
          onClose={closeTimePicker}
        />
      )}
    </>
  );
};
