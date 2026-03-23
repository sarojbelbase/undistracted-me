const DigitRoller = ({ char }) => (
  <span
    style={{
      display: 'inline-block',
      fontVariantNumeric: 'tabular-nums',
      animation: 'focusDigitIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both',
    }}
  >
    {char}
  </span>
);

export default DigitRoller;
