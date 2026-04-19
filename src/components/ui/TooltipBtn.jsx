import { useState, useRef } from 'react';
import { Popup } from './Popup';

/**
 * Drop-in <button> replacement that shows a styled Popup tooltip on hover
 * instead of the browser-native `title` tooltip.
 *
 * Usage:
 *   <TooltipBtn tooltip="My label" className="..." onClick={...}>
 *     children
 *   </TooltipBtn>
 *
 * All standard button props are forwarded. Existing onMouseEnter/onMouseLeave
 * handlers are composed — not replaced.
 */
export const TooltipBtn = ({ tooltip, children, onMouseEnter, onMouseLeave, ...rest }) => {
  const ref = useRef(null);
  const [anchor, setAnchor] = useState(null);

  return (
    <>
      <button
        ref={ref}
        onMouseEnter={(e) => {
          setAnchor(ref.current?.getBoundingClientRect() ?? null);
          onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          setAnchor(null);
          onMouseLeave?.(e);
        }}
        {...rest}
      >
        {children}
      </button>
      {tooltip && anchor && (
        <Popup anchor={anchor} preferAbove className="px-2.5 py-1">
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--w-ink-2)', whiteSpace: 'nowrap' }}>
            {tooltip}
          </span>
        </Popup>
      )}
    </>
  );
};
