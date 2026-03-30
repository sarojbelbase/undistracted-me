/**
 * Unit tests for the LookAway overlay component.
 *
 * The component renders via createPortal into document.body so RTL's
 * screen queries work as normal. We use vi.useFakeTimers() to control
 * the per-second countdown and the 500ms dismiss animation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LookAway } from '../../../src/components/LookAway/index.jsx';

// The 7 RGB triplets used to colour the orbs / ring
const ORB_PALETTES = [
  '54,133,230',
  '198,38,46',
  '222,62,128',
  '165,109,226',
  '243,115,41',
  '40,188,163',
  '207,162,94',
];

// Advance fake timers one tick and flush React state in a single act() call
const tick = (ms = 1000) => act(() => { vi.advanceTimersByTime(ms); });

describe('LookAway component', () => {
  let onDismiss;

  beforeEach(() => {
    onDismiss = vi.fn();
    vi.useFakeTimers();

    // jsdom has no requestFullscreen — provide a stub
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── Rendering / accessibility ──────────────────────────────────────────────

  it('renders with role="dialog"', () => {
    render(<LookAway onDismiss={onDismiss} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has aria-modal="true"', () => {
    render(<LookAway onDismiss={onDismiss} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('has descriptive aria-label on the overlay', () => {
    render(<LookAway onDismiss={onDismiss} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Look away break');
  });

  it('renders a non-empty heading (message title)', () => {
    render(<LookAway onDismiss={onDismiss} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1.textContent.trim().length).toBeGreaterThan(0);
  });

  it('renders a non-empty subtitle paragraph', () => {
    render(<LookAway onDismiss={onDismiss} />);
    const paragraphs = Array.from(document.querySelectorAll('p')).filter(
      (p) => p.textContent.trim().length > 5
    );
    expect(paragraphs.length).toBeGreaterThan(0);
  });

  it('renders into document.body via portal', () => {
    render(<LookAway onDismiss={onDismiss} />);
    expect(document.body.querySelector('[role="dialog"]')).toBeInTheDocument();
  });

  // ── Initial countdown display ──────────────────────────────────────────────

  it('shows "00:20" for default duration', () => {
    render(<LookAway onDismiss={onDismiss} />);
    expect(screen.getByText('00:20')).toBeInTheDocument();
  });

  it('shows "00:05" for duration=5', () => {
    render(<LookAway onDismiss={onDismiss} duration={5} />);
    expect(screen.getByText('00:05')).toBeInTheDocument();
  });

  it('shows "01:30" for duration=90', () => {
    render(<LookAway onDismiss={onDismiss} duration={90} />);
    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('shows "02:00" for duration=120', () => {
    render(<LookAway onDismiss={onDismiss} duration={120} />);
    expect(screen.getByText('02:00')).toBeInTheDocument();
  });

  // ── Timer aria attributes ──────────────────────────────────────────────────

  it('timer div has aria-live="polite"', () => {
    render(<LookAway onDismiss={onDismiss} duration={20} />);
    expect(screen.getByLabelText('20 seconds remaining')).toHaveAttribute(
      'aria-live', 'polite'
    );
  });

  it('timer aria-label reflects the current remaining seconds', () => {
    render(<LookAway onDismiss={onDismiss} duration={10} />);
    expect(screen.getByLabelText('10 seconds remaining')).toBeInTheDocument();
  });

  // ── Countdown mechanics ────────────────────────────────────────────────────

  it('decrements countdown by 1 each second', () => {
    render(<LookAway onDismiss={onDismiss} duration={5} />);
    expect(screen.getByText('00:05')).toBeInTheDocument();

    tick(1000);
    expect(screen.getByText('00:04')).toBeInTheDocument();

    tick(1000);
    expect(screen.getByText('00:03')).toBeInTheDocument();

    tick(1000);
    expect(screen.getByText('00:02')).toBeInTheDocument();
  });

  it('updates aria-label after each second', () => {
    render(<LookAway onDismiss={onDismiss} duration={3} />);
    expect(screen.getByLabelText('3 seconds remaining')).toBeInTheDocument();

    tick(1000);
    expect(screen.getByLabelText('2 seconds remaining')).toBeInTheDocument();

    tick(1000);
    expect(screen.getByLabelText('1 seconds remaining')).toBeInTheDocument();
  });

  it('does NOT call onDismiss mid-countdown', () => {
    render(<LookAway onDismiss={onDismiss} duration={5} />);
    tick(3000); // 3 ticks, 2 remaining
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss after countdown + 500ms exit animation', () => {
    render(<LookAway onDismiss={onDismiss} duration={2} />);

    tick(1000); // remaining: 2 → 1
    tick(1000); // remaining: 1 → 0, dismiss() invoked → setTimeout(onDismiss, 500)

    expect(onDismiss).not.toHaveBeenCalled(); // animation still playing

    tick(500); // animation completes
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss exactly once after a single countdown cycle', () => {
    render(<LookAway onDismiss={onDismiss} duration={1} />);
    tick(1000); // remaining: 1 → 0, dismiss called
    tick(500);  // animation done
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  // ── Buttons ────────────────────────────────────────────────────────────────

  it('renders a "Skip" button', () => {
    render(<LookAway onDismiss={onDismiss} />);
    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
  });

  it('renders a "Lock Screen" button', () => {
    render(<LookAway onDismiss={onDismiss} />);
    expect(screen.getByRole('button', { name: /lock screen/i })).toBeInTheDocument();
  });

  it('Skip triggers dismiss after 500ms animation', () => {
    render(<LookAway onDismiss={onDismiss} duration={20} />);
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    expect(onDismiss).not.toHaveBeenCalled();
    tick(500);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Skip does not call onDismiss before animation completes', () => {
    render(<LookAway onDismiss={onDismiss} duration={20} />);
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    tick(100); // partial animation
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('Lock Screen calls requestFullscreen on documentElement', () => {
    render(<LookAway onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /lock screen/i }));
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
  });

  // ── Keyboard interaction ───────────────────────────────────────────────────

  it('Escape key triggers dismiss after 500ms', () => {
    render(<LookAway onDismiss={onDismiss} duration={20} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).not.toHaveBeenCalled();
    tick(500);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Enter key does NOT trigger dismiss', () => {
    render(<LookAway onDismiss={onDismiss} duration={20} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    tick(600);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('Space key does NOT trigger dismiss', () => {
    render(<LookAway onDismiss={onDismiss} duration={20} />);
    fireEvent.keyDown(window, { key: ' ' });
    tick(600);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('Tab key does NOT trigger dismiss', () => {
    render(<LookAway onDismiss={onDismiss} duration={20} />);
    fireEvent.keyDown(window, { key: 'Tab' });
    tick(600);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ── RingProgress SVG ──────────────────────────────────────────────────────

  it('SVG ring circle with stroke-dasharray is present', () => {
    render(<LookAway onDismiss={onDismiss} duration={4} />);
    const circles = document.querySelectorAll('circle[stroke-dasharray]');
    expect(circles.length).toBeGreaterThan(0);
  });

  it('ring stroke-dashoffset starts at 0 when progress=1.0', () => {
    render(<LookAway onDismiss={onDismiss} duration={4} />);
    const circle = document.querySelector('circle[stroke-dasharray]');
    expect(parseFloat(circle.getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 1);
  });

  it('ring dashoffset is RING_CIRC/2 when half the time has elapsed', () => {
    const RING_CIRC = 2 * Math.PI * 7; // r=7 from the component
    render(<LookAway onDismiss={onDismiss} duration={4} />);

    tick(1000); // 3/4 elapsed → progress=3/4
    tick(1000); // 2/4 = 1/2 elapsed → progress=0.5

    const circle = document.querySelector('circle[stroke-dasharray]');
    expect(parseFloat(circle.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      RING_CIRC * 0.5,
      1
    );
  });

  it('ring dashoffset at 3/4 depletion equals RING_CIRC * 3/4', () => {
    const RING_CIRC = 2 * Math.PI * 7;
    render(<LookAway onDismiss={onDismiss} duration={4} />);

    tick(1000); // 1s elapsed → remaining=3 → progress=0.75 → offset = RING_CIRC*0.25
    tick(1000); // 2s elapsed → remaining=2 → progress=0.5  → offset = RING_CIRC*0.5
    tick(1000); // 3s elapsed → remaining=1 → progress=0.25 → offset = RING_CIRC*0.75

    const circle = document.querySelector('circle[stroke-dasharray]');
    expect(parseFloat(circle.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      RING_CIRC * 0.75,
      1
    );
  });

  // ── Random colour palette ──────────────────────────────────────────────────

  it('orbRgb is one of the 7 known ORB_PALETTES values', () => {
    render(<LookAway onDismiss={onDismiss} />);
    const timerEl = screen.getByLabelText('20 seconds remaining');
    // Inline style: rgba(R,G,B,0.7) — jsdom preserves the raw string
    const colorStyle = timerEl.style.color;
    const match = colorStyle.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    expect(match).not.toBeNull();
    const rgb = `${match[1]},${match[2]},${match[3]}`;
    expect(ORB_PALETTES).toContain(rgb);
  });

  it('each render picks a colour from ORB_PALETTES', () => {
    // Render 10 times to confirm all results are valid palette entries
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(<LookAway onDismiss={vi.fn()} />);
      const timerEl = screen.getByLabelText('20 seconds remaining');
      const match = timerEl.style.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      expect(match).not.toBeNull();
      const rgb = `${match[1]},${match[2]},${match[3]}`;
      expect(ORB_PALETTES).toContain(rgb);
      unmount();
    }
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────

  it('removes keydown listener from window on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<LookAway onDismiss={onDismiss} />);
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('does not call onDismiss after unmount even if timer fires', () => {
    const { unmount } = render(<LookAway onDismiss={onDismiss} duration={2} />);
    unmount();
    // Advance past when countdown would have called dismiss
    tick(2000);
    tick(500);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
