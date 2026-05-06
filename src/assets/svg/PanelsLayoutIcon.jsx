export const PanelsLayoutIcon = ({ size = 14, color = 'currentColor', mutedColor }) => {
  const c2 = mutedColor ?? color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="9" height="18" rx="2" stroke={color} strokeWidth="1.8" />
      <rect x="13" y="3" width="9" height="8" rx="2" stroke={color} strokeWidth="1.8" />
      <rect x="13" y="13" width="9" height="8" rx="2" stroke={c2} strokeWidth="1.5" />
    </svg>
  );
};
