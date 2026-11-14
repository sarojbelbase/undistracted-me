export const OccasionsIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2C8 2 6 6 12 8C18 6 16 2 12 2Z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M3 11h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z" stroke={color} strokeWidth="1.8" />
    <line x1="12" y1="8" x2="12" y2="11" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
