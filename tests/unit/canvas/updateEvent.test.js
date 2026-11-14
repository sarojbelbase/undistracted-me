/**
 * Tests for useEvents.updateEvent — editing local events.
 *
 * What can go wrong:
 *  – updateEvent overwrites the whole event instead of merging a patch,
 *    dropping startDate/startTime that the edit form doesn't touch.
 *  – updateEvent with an unknown id creates a spurious new event.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEvents } from '../../../app/hooks/useEvents';

vi.stubGlobal('chrome', undefined);

// Read straight from localStorage (the source of truth) rather than the hook's
// module-level cache, which is stale until the rAF-driven re-render fires.
const stored = () => JSON.parse(localStorage.getItem('widget_events') || '[]');

describe('useEvents — updateEvent', () => {
  it('updates an existing event by id and preserves other fields', () => {
    const { result } = renderHook(() => useEvents());

    act(() => {
      result.current[1]({ title: 'Before', startDate: '2025-07-01', startTime: '10:00' });
    });
    const id = stored().find((e) => e.title === 'Before').id;

    act(() => {
      result.current[3](id, { title: 'After' });
    });

    const updated = stored().find((e) => e.id === id);
    expect(updated.title).toBe('After');
    expect(updated.startDate).toBe('2025-07-01');
    expect(updated.startTime).toBe('10:00');
  });

  it('does not create a new event when updating an unknown id', () => {
    const { result } = renderHook(() => useEvents());

    act(() => {
      result.current[1]({ title: 'Only', startDate: '2025-07-01' });
    });
    const before = stored().length;

    act(() => {
      result.current[3](999999, { title: 'Ghost' });
    });

    expect(stored()).toHaveLength(before);
  });
});
