import { useRef, useState, useCallback } from 'react';

/**
 * useSwipeToNavigate — shared horizontal drag-to-navigate gesture used by the
 * RSS MarqueeCard and the Dailys CarouselCard.
 *
 * Applies a resistance curve so the card tracks the finger up to ~60px, then
 * commits to `onNext` / `onPrev` past a 40px threshold on release.
 *
 * @param {{ onNext: () => void, onPrev: () => void }} opts
 * @returns {{ dragX: number, releasing: boolean, handlers: object }}
 *   `handlers` is spread onto the card element (`{ onPointerDown, onPointerMove, onPointerUp }`).
 */
export function useSwipeToNavigate({ onNext, onPrev }) {
  const startX = useRef(null);
  const dragged = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [releasing, setReleasing] = useState(false);

  const onPointerDown = useCallback((e) => {
    if (e.target.closest('button, a')) return;
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    startX.current = e.clientX;
    dragged.current = false;
    setReleasing(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    dragged.current = Math.abs(dx) > 6;
    // Resistance curve: fast initial tracking, saturating toward ±60px.
    const resistance = (v) =>
      Math.sign(v) * (60 * (1 - Math.exp(-Math.abs(v) / 120)));
    setDragX(dragged.current ? resistance(dx) : 0);
  }, []);

  const onPointerUp = useCallback(
    (e) => {
      if (startX.current === null) return;
      const dx = e.clientX - startX.current;
      startX.current = null;
      setReleasing(true);
      setDragX(0);
      if (Math.abs(dx) > 40) {
        dx < 0 ? onNext() : onPrev();
      }
    },
    [onNext, onPrev],
  );

  return {
    dragX,
    releasing,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
