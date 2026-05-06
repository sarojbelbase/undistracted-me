export const BackgroundSceneIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="18" height="14" rx="2" stroke={color} strokeWidth="1.8" />
    <circle cx="8.5" cy="8.5" r="1.5" stroke={color} strokeWidth="1.5" />
    <path d="M3 16l5-4 4 3 3-2 6 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="8" y1="21" x2="16" y2="21" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    <line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
