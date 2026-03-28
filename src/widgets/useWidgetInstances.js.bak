import { useState } from 'react';
import { WIDGET_REGISTRY } from './index';

const INSTANCES_KEY = 'widget_instances';
const mkId = (type) => `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const loadInstances = () => {
  // 1. New format
  try {
    const saved = JSON.parse(localStorage.getItem(INSTANCES_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { }

  // 2. Migrate from old enabledIds
  try {
    const oldEnabled = JSON.parse(localStorage.getItem('widget_enabled_ids'));
    if (Array.isArray(oldEnabled) && oldEnabled.length) {
      return oldEnabled.map(id => ({ id, type: id }));
    }
  } catch { }

  // 3. Default: one instance per enabled widget, id === type (backward-compat with saved layout)
  return WIDGET_REGISTRY.filter(w => w.enabled).map(w => ({ id: w.id, type: w.type }));
};

export const useWidgetInstances = () => {
  const [instances, setInstances] = useState(loadInstances);

  const addInstance = (type) => {
    setInstances(prev => {
      // First instance of a type uses id === type (matches existing saved layouts)
      const firstOccupied = prev.some(i => i.id === type);
      const id = firstOccupied ? mkId(type) : type;
      const next = [...prev, { id, type }];
      localStorage.setItem(INSTANCES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeInstance = (id) => {
    setInstances(prev => {
      const next = prev.filter(i => i.id !== id);
      localStorage.setItem(INSTANCES_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Used by import to restore a full snapshot
  const restoreInstances = (list) => {
    setInstances(list);
  };

  return { instances, addInstance, removeInstance, restoreInstances };
};
