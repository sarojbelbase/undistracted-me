export const MusicDiscIcon = ({ size = 14, color = 'currentColor', mutedColor }) => {
  const c2 = mutedColor ?? color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" fill={c2} />
      <path d="M5.5 8C7 6.5 9 5.5 12 5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.5 13.5C4.5 17 8 19.5 12 19.5" stroke={c2} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
};
