import { useState, useRef, useCallback } from 'react';
import { Popup } from './Popup';

function extraStyle(confirming, danger) {
  // opacity:1 when confirming keeps the button visible inside opacity-0 group-hover containers
  if (confirming) return { color: 'var(--w-danger)', opacity: 1 };
  if (danger) return { color: 'var(--w-danger)' };
  return {};
}

/**
 * ConfirmButton — single-click shows inline “Sure?”, second click confirms.
 * Auto-resets after `timeout` ms (default 3500) if no second click.
 *
 * Props:
 *   onConfirm  – () => void  — called on confirmed second click
 *   label      – string      — label / title for the default state (also aria-label)
 *   children   – ReactNode   — content shown in default state (icon, text, or both)
 *   danger     – bool        — style as danger (red) even in default state
 *   timeout    – number      — ms before auto-reset (default 3500)
 *   className  – string      — extra class(es) for the outer button
 *   style      – object      — extra inline styles for the outer button
 */
export const ConfirmButton = ({
  onConfirm,
  label,
  children,
  danger = false,
  timeout = 3500,
  className = '',
  style = {},
  ...rest
}) => {
  const [confirming, setConfirming] = useState(false);
  const [hoverAnchor, setHoverAnchor] = useState(null);
  const timerRef = useRef(null);
  const btnRef = useRef(null);

  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    setConfirming(false);
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (confirming) {
      cancel();
      onConfirm();
    } else {
      setConfirming(true);
      timerRef.current = setTimeout(cancel, timeout);
    }
  }, [confirming, cancel, onConfirm, timeout]);

  return (
    <>
      <button
        {...rest}
        ref={btnRef}
        type="button"
        onClick={handleClick}
        aria-label={confirming ? 'Confirm — click again to proceed' : label}
        onMouseEnter={() => setHoverAnchor(btnRef.current?.getBoundingClientRect() ?? null)}
        onMouseLeave={() => setHoverAnchor(null)}
        className={className}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          gap: 4, cursor: 'pointer', border: 'none', transition: 'all 0.18s ease',
          ...style,
          ...extraStyle(confirming, danger),
        }}
      >
        {confirming ? <span style={{ whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.6875rem', letterSpacing: '0.01em' }}>Sure?</span> : children}
      </button>
      {label && hoverAnchor && !confirming && (
        <Popup anchor={hoverAnchor} preferAbove className="px-2.5 py-1">
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--w-ink-2)', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        </Popup>
      )}
    </>
  );
};
