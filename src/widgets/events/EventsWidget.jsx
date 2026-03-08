import React from 'react';
import { BaseWidget } from '../BaseWidget';

export const EventsWidget = ({ onRemove, showRemove }) => {
  // Static data for now
  const events = [
    { title: 'YouTube Video Script', time: '6:00 AM - 7:30 AM' },
    { title: 'Workout', time: '7:30 AM - 8:30 AM' },
    { title: 'Breakfast', time: '8:30 AM - 9:30 AM' },
    { title: 'Notion Templates', time: '9:30 AM - 12:30 PM' },
    { title: 'Lunch', time: '12:30 PM - 1:30 PM' }
  ];

  return (
    <BaseWidget className="h-full w-full p-6 flex flex-col" onRemove={onRemove} showRemove={showRemove}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-white">Today</h3>
          <p className="text-sm text-white/60">{events.length} Events</p>
        </div>
      </div>
      <div className="mt-4 divide-y divide-white/10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {events.map((event, index) => (
          <div key={index} className="py-3 flex items-start">
            <div className="w-1 bg-white/40 rounded mr-4 mt-1" style={{ height: '36px' }} />
            <div className="flex-1">
              <div className="font-medium text-white">{event.title}</div>
              <div className="text-sm text-white/60">{event.time}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center shadow-lg hover:bg-white/30 transition-colors backdrop-blur-md">
          →
        </button>
      </div>
    </BaseWidget>
  );
};
