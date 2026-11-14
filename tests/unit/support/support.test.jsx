/**
 * Tests for the support-nudge store + dialog.
 *
 * The store applies a frequency policy (cooldown + random gate) so the
 * "Help keep growing" dialog only appears "once in a while". These tests pin
 * that behaviour down deterministically via mocked Date.now / Math.random.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSupportStore, triggerSupportNudge } from '../../../src/store/useSupportStore';
import { SupportDialog } from '../../../src/components/SupportDialog';

const resetStore = () => useSupportStore.setState({ open: false, reason: null });

describe('useSupportStore — frequency policy', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStore();
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    resetStore();
  });

  it('does NOT nudge when inside the cooldown window', () => {
    localStorage.setItem('support_last_shown', String(Date.now() - 1000)); // 1s ago
    vi.spyOn(Math, 'random').mockReturnValue(0); // gate would pass

    const opened = triggerSupportNudge('event');

    expect(opened).toBe(false);
    expect(useSupportStore.getState().open).toBe(false);
  });

  it('does NOT nudge when the random gate fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // >= SHOW_PROBABILITY

    const opened = triggerSupportNudge('event');

    expect(opened).toBe(false);
    expect(useSupportStore.getState().open).toBe(false);
  });

  it('nudges after cooldown + gate passes, and persists the timestamp', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // < SHOW_PROBABILITY

    const opened = triggerSupportNudge('occasion');

    expect(opened).toBe(true);
    expect(useSupportStore.getState().open).toBe(true);
    expect(useSupportStore.getState().reason).toBe('occasion');
    expect(localStorage.getItem('support_last_shown')).toBe(String(Date.now()));
  });

  it('does NOT nudge again while already open', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useSupportStore.setState({ open: true });

    const opened = triggerSupportNudge('lookaway');

    expect(opened).toBe(false);
  });

  it('dismiss closes the dialog', () => {
    useSupportStore.getState().show('event');
    expect(useSupportStore.getState().open).toBe(true);
    useSupportStore.getState().dismiss();
    expect(useSupportStore.getState().open).toBe(false);
  });
});

describe('SupportDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<SupportDialog open={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the support content when open', () => {
    render(<SupportDialog open onClose={() => {}} />);
    expect(screen.getByText('Help Undistracted Me keep growing')).toBeInTheDocument();
    expect(screen.getByText('Support on Buy Me a Momo')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue to Undistracted Me' }),
    ).toBeInTheDocument();
  });

  it('calls onClose when Continue is clicked', () => {
    const onClose = vi.fn();
    render(<SupportDialog open onClose={onClose} />);
    screen.getByRole('button', { name: 'Continue to Undistracted Me' }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('links to the Momo and GitHub URLs', () => {
    render(<SupportDialog open onClose={() => {}} />);
    const cta = screen.getByRole('link', { name: /Support on Buy Me a Momo/ });
    expect(cta).toHaveAttribute('href', 'https://buymemomo.com/sarojbelbase');
    const star = screen.getByRole('link', { name: /A GitHub star/ });
    expect(star).toHaveAttribute('href', 'https://github.com/sarojbelbase/undistracted-me');
  });
});
