/**
 * Widget instances store.
 *
 * Replaces the `useWidgetInstances` React hook with a Zustand store so that
 * any component can subscribe to the active widget list without prop-drilling.
 *
 * Persistence key matches the existing `widget_instances` localStorage key so
 * current user layouts are migrated transparently.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WIDGET_REGISTRY } from '../widgets';

const STORE_KEY = 'widget_instances';

const mkId = (type) =>
  `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/**
 * Determine the initial instances list with three-level fall-through:
 *  1. New format already stored under `widget_instances`
 *  2. Migrate from legacy `widget_enabled_ids` array
 *  3. Seed from WIDGET_REGISTRY defaults
 */
const resolveInitialInstances = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* ignore */ }

  try {
    const old = JSON.parse(localStorage.getItem('widget_enabled_ids'));
    if (Array.isArray(old) && old.length)
      return old.map((id) => ({ id, type: id }));
  } catch { /* ignore */ }

  return WIDGET_REGISTRY.filter((w) => w.enabled).map((w) => ({
    id: w.id,
    type: w.type,
  }));
};

export const useWidgetInstancesStore = create(
  persist(
    (set, get) => ({
      instances: resolveInitialInstances(),

      addInstance: (type) => {
        set((state) => {
          // First instance of a type keeps id === type for layout compatibility
          const firstOccupied = state.instances.some((i) => i.id === type);
          const id = firstOccupied ? mkId(type) : type;
          return { instances: [...state.instances, { id, type }] };
        });
      },

      removeInstance: (id) => {
        set((state) => ({
          instances: state.instances.filter((i) => i.id !== id),
        }));
      },

      /** Restore a full snapshot (used by settings import). */
      restoreInstances: (list) => set({ instances: list }),
    }),
    {
      name: STORE_KEY,
      // Only persist the instances array, not the action functions
      partialize: (state) => ({ instances: state.instances }),
    },
  ),
);
