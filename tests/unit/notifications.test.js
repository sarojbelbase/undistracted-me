/**
 * Tests for app/constants/notifications.js — buildNotification countdown copy.
 *
 * Locks in the react-guru fix: the widget always sends an explicit body
 * ("…is starting" for calendar events, "Countdown complete" for custom
 * countdowns), and buildNotification must render it verbatim rather than
 * discarding it via a content heuristic.
 */
import { describe, it, expect } from 'vitest';
import { buildNotification } from '../../app/constants/notifications.js';

describe('buildNotification — countdown', () => {
  it('renders the "…is starting" body for calendar events', () => {
    const n = buildNotification('countdown', {
      title: 'Team standup',
      body: 'Google Calendar event is starting',
    });
    expect(n.title).toBe('Team standup');
    expect(n.message).toBe('Google Calendar event is starting');
  });

  it('renders the "Countdown complete" body for custom countdowns (not discarded)', () => {
    const n = buildNotification('countdown', {
      title: 'Ship the extension',
      body: 'Countdown complete',
    });
    expect(n.title).toBe('Ship the extension');
    expect(n.message).toBe('Countdown complete');
  });

  it('falls back to generic copy when no body is provided', () => {
    const withLabel = buildNotification('countdown', { title: 'Release' });
    expect(withLabel.message).toBe('Your countdown for "Release" just ended.');

    const bare = buildNotification('countdown', {});
    expect(bare.title).toBe('Countdown finished');
    expect(bare.message).toBe('The timer you set has reached zero. Time to move.');
  });
});
