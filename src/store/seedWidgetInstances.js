/**
 * Seeds the widget instances store with WIDGET_REGISTRY defaults on fresh
 * install (empty localStorage) or after a reset.
 *
 * Lives in its own file to break the circular import chain:
 *   useWidgetInstancesStore → widgets → Widget.jsx → useWidgetSettings → useWidgetInstancesStore
 *
 * This file is imported by App.jsx (the top of the tree) — nothing in the
 * widgets/ or store/ directories imports it back, so there is no cycle.
 */

import { WIDGET_REGISTRY } from '../widgets';
import { CURRENT_PLATFORM } from '../constants/env';
import { useWidgetInstancesStore } from './useWidgetInstancesStore';
import { applyFirstRunDefaults } from '../utilities/applyFirstRunDefaults';

const isSupportedOnPlatform = (widget) => {
  const p = widget.platforms?.[CURRENT_PLATFORM];
  return !p || p.supported !== false;
};

export const seedWidgetInstancesIfEmpty = () => {
  if (useWidgetInstancesStore.getState().instances.length > 0) return;
  useWidgetInstancesStore.setState({
    instances: WIDGET_REGISTRY
      .filter((w) => w.enabled && isSupportedOnPlatform(w))
      .map((w) => ({ id: w.type, type: w.type })),
  });
  // Apply first-run widget defaults immediately after seeding so they are in
  // the Zustand store and localStorage BEFORE widgets mount on the next render.
  applyFirstRunDefaults();
};
