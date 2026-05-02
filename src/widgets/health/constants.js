/**
 * Health widget — static configuration for the three supported metrics.
 * Colors mirror the image reference: blue=steps, amber=sleep, green=workout.
 */

export const DEFAULT_HEALTH_SETTINGS = {
  showSteps:   true,
  showSleep:   true,
  showWorkout: true,
};

// Maps metric key → settings field name
export const SHOW_KEYS = {
  steps:   'showSteps',
  sleep:   'showSleep',
  workout: 'showWorkout',
};

// bg is a low-opacity wash; color is the icon / accent
export const METRICS = [
  {
    key:     'steps',
    label:   'Steps',
    color:   '#3b82f6',
    bg:      'rgba(59,130,246,0.12)',
  },
  {
    key:     'sleep',
    label:   'Sleep',
    color:   '#f59e0b',
    bg:      'rgba(245,158,11,0.12)',
  },
  {
    key:     'workout',
    label:   'Active',
    color:   '#10b981',
    bg:      'rgba(16,185,129,0.12)',
  },
];
