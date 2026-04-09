import React from 'react';
import { PERIOD_TYPES, CALENDAR_TYPES } from './utils';
import { SegmentedControl } from '../../components/ui/SegmentedControl';

const CALENDAR_PERIODS = new Set(['month', 'year']);

export const Settings = ({ period = 'day', calendar = 'ad', onChange }) => (
  <div className="flex flex-col gap-4">
    <SegmentedControl
      label="Period"
      options={PERIOD_TYPES.map(p => ({ label: p.label, value: p.id }))}
      value={period}
      onChange={(v) => onChange('period', v)}
    />
    {CALENDAR_PERIODS.has(period) && (
      <SegmentedControl
        label="Calendar"
        options={CALENDAR_TYPES.map(c => ({ label: c.label, value: c.id }))}
        value={calendar}
        onChange={(v) => onChange('calendar', v)}
      />
    )}
  </div>
);
