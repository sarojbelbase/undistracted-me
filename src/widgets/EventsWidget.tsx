import React from 'react';
import { Plus } from 'lucide-react';
import { WidgetProps } from '../types/widgets';
import Widget from '../components/Widget';

const EventsWidget: React.FC<WidgetProps> = ({ settings }) => {
  const events = [
    { id: 1, title: 'Develop Version 3', time: '10:00 AM' },
    { id: 2, title: 'Add More Customizations', time: '12:30 PM' },
    { id: 3, title: 'Integrate Weather APIs', time: '2:00 PM' },
    { id: 4, title: 'Release New Widgets', time: '4:00 PM' },
    { id: 5, title: 'Release on Product Hunt', time: '6:00 PM' },
    { id: 6, title: 'Add Nepali Localization', time: '9:00 PM' },
    { id: 7, title: 'Publish New Version on Chrome/Firefox', time: '2:00 AM' }
  ];

  return (
    <Widget>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">
          Today
        </h2>
      </div>

      <div className="space-y-3">
        {events.map(event => (
          <div
            key={event.id}
            className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg relative pl-4"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-2 rounded-full" />
            <div className="text-base font-medium text-gray-500">{event.time}</div>
            <div className="flex-1 text-base">{event.title}</div>
          </div>
        ))}
      </div>

      <button
        className="absolute bottom-5 right-5 p-3 bg-accent-1 hover:bg-accent-1/90 text-white rounded-full shadow-lg"
        onClick={() => {/* Add event handler */ }}
      >
        <Plus className="w-6 h-6" />
      </button>
    </Widget>
  );
};

export default EventsWidget;