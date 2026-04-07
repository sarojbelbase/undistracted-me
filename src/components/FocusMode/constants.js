import { getTimeZoneAwareDayJsInstance, convertEnglishToNepali } from '../../utilities';
import { MONTH_NAMES } from '../../constants';

// ─── Date helpers ─────────────────────────────────────────────────────────────

export const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const GREGORIAN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const getGregorianDateParts = () => {
  const now = getTimeZoneAwareDayJsInstance();
  return { dow: ENGLISH_DAYS[now.day()], month: GREGORIAN_MONTHS[now.month()], day: now.date(), year: now.year() };
};

export const getBikramSambatDateParts = () => {
  const now = getTimeZoneAwareDayJsInstance();
  const [year, month, day] = now.format('YYYY M D').split(' ').map(Number);
  const result = convertEnglishToNepali(year, month, day);
  if (result === 'Invalid date!') return { dow: ENGLISH_DAYS[now.day()], month: '—', day: 0, year: 0 };
  const [ny, nm, nd] = result.split(' ').map(Number);
  return { dow: ENGLISH_DAYS[now.day()], month: MONTH_NAMES[nm - 1], day: nd, year: ny };
};

// ─── Pomodoro reader ──────────────────────────────────────────────────────────

export const readPomodoro = () => {
  try {
    const raw = localStorage.getItem('fm_pomodoro');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.running || s.remaining <= 0) return null;
    return s;
  } catch {
    return null;
  }
};

// ─── Event helpers ────────────────────────────────────────────────────────────

export const getNextEventToShow = (events) => {
  const now = new Date();
  const active = events.find(e => {
    if (!e.startDate || !e.endDate || !e.startTime || !e.endTime) return false;
    const start = new Date(`${e.startDate}T${e.startTime}`);
    const end = new Date(`${e.endDate}T${e.endTime}`);
    return now >= start && now <= end;
  });
  if (active) return { event: active, isActive: true };

  const upcoming = events
    .filter(e => {
      if (!e.startDate || !e.startTime) return false;
      return new Date(`${e.startDate}T${e.startTime}`) > now;
    })
    .sort((a, b) =>
      new Date(`${a.startDate}T${a.startTime}`) - new Date(`${b.startDate}T${b.startTime}`)
    );
  if (upcoming.length > 0) return { event: upcoming[0], isActive: false };
  return null;
};

export const getTimeUntilEvent = (event) => {
  const start = new Date(`${event.startDate}T${event.startTime}`);
  const diffMs = start - new Date();
  if (diffMs <= 0) return 'now';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `in ${diffMin}m`;
  const h = Math.floor(diffMin / 60), m = diffMin % 60;
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
};

export const formatEventStartTime = (event) => {
  if (!event.startTime) return '';
  const [h, min] = event.startTime.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
};

// ─── Shared styles ────────────────────────────────────────────────────────────

export const GLASS_CARD = {
  background: 'rgba(4,5,7,0.68)',
  backdropFilter: 'blur(28px)',
  WebkitBackdropFilter: 'blur(28px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '14px',
};

export const FG_MASK = 'linear-gradient(to bottom, transparent 0%, transparent 64%, rgba(0,0,0,0.5) 78%, black 100%)';
