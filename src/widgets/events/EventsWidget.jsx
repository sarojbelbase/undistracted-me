import React from 'react';
import { BaseWidget } from '../BaseWidget';

export const EventsWidget = ({ onRemove, showRemove }) => {
  const events = [
    { title: 'YouTube Video Script', time: '6:00 AM - 7:30 AM' },
    { title: 'Workout', time: '7:30 AM - 8:30 AM' },
    { title: 'Breakfast', time: '8:30 AM - 9:30 AM' },
    { title: 'Notion Templates', time: '9:30 AM - 12:30 PM' },
    { title: 'Lunch', time: '12:30 PM - 1:30 PM' },
  ];

  return (
    <BaseWidget className="p-6 flex flex-col" onRemove={onRemove} showRemove={showRemove}>
      {/* Header */}
      <div className="flex justify-between items-baseline">
        <h3 className="text-lg font-semibold text-gray-900">Today</h3>
        <span className="text-sm text-gray-400">{events.length} Events</span>
      </div>

      {/* Event list */}
      <div className="mt-4 divide-y divide-gray-100 flex-1 overflow-y-auto">
        {events.map((event, index) => (
          <div key={index} className="py-3 flex items-start">
            <div className="w-1 bg-gray-900 rounded-full mr-4 mt-0.5 shrink-0" style={{ height: '36px' }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{event.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">{event.time}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Arrow button */}
      <div className="mt-3 flex justify-end">
        <button className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-sm hover:bg-gray-700 transition-colors text-base">
          →
        </button>
      </div>
    </BaseWidget>
  );
};
