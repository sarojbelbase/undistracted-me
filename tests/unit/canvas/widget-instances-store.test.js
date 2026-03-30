/**
 * Tests for src/store/useWidgetInstancesStore.js
 *
 * What can go wrong:
 *  – "First instance keeps id === type" rule: if violated, the grid layout key
 *    stored in widget_grid_layouts no longer matches and the widget loses its
 *    saved position on every reload.
 *  – "Second instance gets a unique id": if two instances share the same id both
 *    get removed when one is removed, or they fight over the same layout slot.
 *  – Migration from legacy widget_enabled_ids: if this read fails silently the
 *    returning user loses all widgets after the migration build ships.
 *  – restoreInstances is used by settings-import; if it doesn't fully replace
 *    the array extra phantom widgets will appear.
 *  – addInstance on an unknown type should still work (defensive — future widgets).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useWidgetInstancesStore } from '../../../src/store/useWidgetInstancesStore';

// Helper: wipe store state and localStorage between tests
const resetStore = (instances = []) => {
  localStorage.clear();
  useWidgetInstancesStore.setState({ instances });
};

beforeEach(() => resetStore());
afterEach(() => {
  localStorage.clear();
  document.documentElement.style.cssText = '';
});

// ────────────────────────────────────────────────────────────────────────────
// addInstance
// ────────────────────────────────────────────────────────────────────────────

describe('addInstance', () => {
  it('adds an instance with the given type', () => {
    useWidgetInstancesStore.getState().addInstance('clock');
    const { instances } = useWidgetInstancesStore.getState();
    expect(instances).toHaveLength(1);
    expect(instances[0].type).toBe('clock');
  });

  it('first instance of a type has id === type (layout key compat)', () => {
    useWidgetInstancesStore.getState().addInstance('weather');
    const { instances } = useWidgetInstancesStore.getState();
    expect(instances[0].id).toBe('weather');
  });

  it('second instance of the same type gets a unique id different from type', () => {
    useWidgetInstancesStore.getState().addInstance('notes');
    useWidgetInstancesStore.getState().addInstance('notes');
    const { instances } = useWidgetInstancesStore.getState();
    expect(instances).toHaveLength(2);
    const [first, second] = instances;
    expect(first.id).toBe('notes');
    expect(second.id).not.toBe('notes');
  });

  it('unique second-instance id contains the type as a prefix', () => {
    useWidgetInstancesStore.getState().addInstance('clock');
    useWidgetInstancesStore.getState().addInstance('clock');
    const second = useWidgetInstancesStore.getState().instances[1];
    expect(second.id).toMatch(/^clock_/);
  });

  it('adding multiple different types keeps all of them', () => {
    ['clock', 'weather', 'calendar'].forEach((t) =>
      useWidgetInstancesStore.getState().addInstance(t)
    );
    expect(useWidgetInstancesStore.getState().instances).toHaveLength(3);
  });

  it('adding to a non-empty starting list appends (does not replace)', () => {
    resetStore([{ id: 'clock', type: 'clock' }]);
    useWidgetInstancesStore.getState().addInstance('weather');
    expect(useWidgetInstancesStore.getState().instances).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// removeInstance
// ────────────────────────────────────────────────────────────────────────────

describe('removeInstance', () => {
  it('removes the instance with the given id', () => {
    resetStore([
      { id: 'clock', type: 'clock' },
      { id: 'weather', type: 'weather' },
    ]);
    useWidgetInstancesStore.getState().removeInstance('clock');
    const { instances } = useWidgetInstancesStore.getState();
    expect(instances).toHaveLength(1);
    expect(instances[0].id).toBe('weather');
  });

  it('removes only the matching instance, not a different type', () => {
    resetStore([
      { id: 'notes', type: 'notes' },
      { id: 'notes_123_abc', type: 'notes' },
    ]);
    useWidgetInstancesStore.getState().removeInstance('notes');
    expect(useWidgetInstancesStore.getState().instances).toHaveLength(1);
    expect(useWidgetInstancesStore.getState().instances[0].id).toBe('notes_123_abc');
  });

  it('removing a non-existent id is a no-op (does not throw)', () => {
    resetStore([{ id: 'clock', type: 'clock' }]);
    expect(() =>
      useWidgetInstancesStore.getState().removeInstance('phantom_id')
    ).not.toThrow();
    expect(useWidgetInstancesStore.getState().instances).toHaveLength(1);
  });

  it('can remove all instances resulting in an empty array', () => {
    resetStore([{ id: 'clock', type: 'clock' }]);
    useWidgetInstancesStore.getState().removeInstance('clock');
    expect(useWidgetInstancesStore.getState().instances).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// restoreInstances
// ────────────────────────────────────────────────────────────────────────────

describe('restoreInstances', () => {
  it('replaces the entire instances array', () => {
    resetStore([{ id: 'clock', type: 'clock' }]);
    const backup = [
      { id: 'weather', type: 'weather' },
      { id: 'notes', type: 'notes' },
    ];
    useWidgetInstancesStore.getState().restoreInstances(backup);
    expect(useWidgetInstancesStore.getState().instances).toEqual(backup);
  });

  it('can restore an empty list', () => {
    resetStore([{ id: 'clock', type: 'clock' }]);
    useWidgetInstancesStore.getState().restoreInstances([]);
    expect(useWidgetInstancesStore.getState().instances).toHaveLength(0);
  });

  it('restoring does not merge with existing — old instances are gone', () => {
    resetStore([{ id: 'clock', type: 'clock' }]);
    useWidgetInstancesStore.getState().restoreInstances([{ id: 'calendar', type: 'calendar' }]);
    const { instances } = useWidgetInstancesStore.getState();
    expect(instances.find((i) => i.id === 'clock')).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Instance object shape
// ────────────────────────────────────────────────────────────────────────────

describe('instance object shape', () => {
  it('every added instance has both id and type', () => {
    ['clock', 'weather', 'notes'].forEach((t) =>
      useWidgetInstancesStore.getState().addInstance(t)
    );
    useWidgetInstancesStore.getState().instances.forEach((i) => {
      expect(i).toHaveProperty('id');
      expect(i).toHaveProperty('type');
    });
  });

  it('type always matches the argument passed to addInstance', () => {
    useWidgetInstancesStore.getState().addInstance('countdown');
    const { instances } = useWidgetInstancesStore.getState();
    expect(instances[0].type).toBe('countdown');
  });
});
