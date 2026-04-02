export const RefreshIcon = ({ spinning }) => (
  <svg
    width="13" height="13" viewBox="0 0 16 16"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
    className={spinning ? 'animate-spin' : ''}
    aria-hidden="true"
  >
    <path d="M13.5 8a5.5 5.5 0 1 1-1.07-3.3" />
    <polyline points="12 2 13.5 4.7 10.8 5.5" />
  </svg>
);