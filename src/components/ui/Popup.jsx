import React, { useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

const MARGIN = 10; // min gap from every viewport edge

/**
 * Generic portal popup anchored near a DOM element.
 *
 * Two-phase positioning: renders invisible first so useLayoutEffect can
 * measure the actual rendered size before the browser paints — no flicker.
 * Auto-flips above/below based on available viewport space.
 *
 * Props:
 *   anchor      — snapshot of getBoundingClientRect() on the trigger element
 *   preferAbove — hint to prefer showing above the anchor (still auto-flips)
 *   className   — extra classes on the card (e.g. "p-3 gap-2.5 max-w-[260px]")
 *   children    — popup content
 */
export const Popup = ({ anchor, children, preferAbove = false, className = 'p-3 gap-2.5 max-w-[260px]' }) => {
  const ref = useRef(null);
  const [style, setStyle] = useState({
    position: 'fixed', opacity: 0, pointerEvents: 'none', zIndex: 9999,
  });

  useLayoutEffect(() => {
    if (!ref.current || !anchor) return;
    const m = MARGIN;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { width: tw, height: th } = ref.current.getBoundingClientRect();

    // Horizontal: center over anchor, clamped to viewport edges
    const cx = anchor.left + anchor.width / 2;
    const left = Math.max(m, Math.min(cx - tw / 2, vw - tw - m));

    // Vertical: check available space in each direction
    const spaceBelow = vh - anchor.bottom - m;
    const spaceAbove = anchor.top - m;
    const goAbove = preferAbove
      ? (spaceAbove >= th || spaceAbove >= spaceBelow)
      : (spaceBelow < th && spaceAbove > spaceBelow);

    let top = goAbove ? anchor.top - th - 6 : anchor.bottom + 6;
    top = Math.max(m, Math.min(top, vh - th - m));

    setStyle({ position: 'fixed', zIndex: 9999, pointerEvents: 'none', opacity: 1, left, top });
  }, [anchor, preferAbove]);

  if (!anchor) return null;

  return createPortal(
    <div
      ref={ref}
      style={{
        ...style,
        background: 'var(--card-bg)',
        backdropFilter: 'var(--card-blur)',
        WebkitBackdropFilter: 'var(--card-blur)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
        transition: 'opacity 80ms ease',
      }}
      className={`rounded-xl shadow-xl flex flex-col w-max ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
};
