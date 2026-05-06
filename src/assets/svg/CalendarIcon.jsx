export const CalendarIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="4" width="18" height="17" rx="2" stroke={color} strokeWidth="1.8" />
    <line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="1.6" />
    <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="8" cy="14" r="1.2" fill={color} />
    <circle cx="12" cy="14" r="1.2" fill={color} />
    <circle cx="16" cy="14" r="1.2" fill={color} />
  </svg>
);
