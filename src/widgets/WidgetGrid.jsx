import React, { useState, useEffect } from 'react';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { ClockWidget } from './dateToday/ClockWidget';
import { DayProgressWidget } from './dayProgress/DayProgressWidget';
import { EventsWidget } from './events/EventsWidget';
import { WeatherWidget } from './weather/WeatherWidget';
import { CalendarWidget } from './calendar/CalendarWidget';
import { CountdownWidget } from './countdown/CountdownWidget';
import { WIDGET_TYPES, DEFAULT_WIDGETS } from './widgetConfig';

const DEFAULT_LAYOUT = [
  { i: 'clock-1', x: 0, y: 0, w: 3, h: 4 },
  { i: 'dayProgress-1', x: 3, y: 0, w: 2, h: 2 },
  { i: 'events-1', x: 5, y: 0, w: 5, h: 4 },
  { i: 'weather-1', x: 3, y: 2, w: 2, h: 2 },
  { i: 'calendar-1', x: 0, y: 4, w: 5, h: 4 },
  { i: 'countdown-1', x: 5, y: 4, w: 2, h: 2 },
];

export const WidgetGrid = ({ showWidgetControls = false }) => {
  const { width, containerRef, mounted } = useContainerWidth();
  const [layouts, setLayouts] = useState({ lg: DEFAULT_LAYOUT });
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const savedLayout = localStorage.getItem('widgetLayouts');
    if (savedLayout) {
      setLayouts(JSON.parse(savedLayout));
    }
    const savedWidgets = localStorage.getItem('activeWidgets');
    if (savedWidgets) {
      setWidgets(JSON.parse(savedWidgets));
    }
  }, []);

  const handleLayoutChange = (layout, allLayouts) => {
    setLayouts(allLayouts);
    localStorage.setItem('widgetLayouts', JSON.stringify(allLayouts));
  };

  const removeWidget = (id) => {
    const updatedWidgets = widgets.filter(w => w.id !== id);
    setWidgets(updatedWidgets);
    localStorage.setItem('activeWidgets', JSON.stringify(updatedWidgets));
  };

  const resetLayout = () => {
    setLayouts({ lg: DEFAULT_LAYOUT });
    setWidgets(DEFAULT_WIDGETS);
    localStorage.setItem('widgetLayouts', JSON.stringify({ lg: DEFAULT_LAYOUT }));
    localStorage.setItem('activeWidgets', JSON.stringify(DEFAULT_WIDGETS));
  };

  const renderWidget = (widget) => {
    const commonProps = {
      isEditMode,
      onRemove: () => removeWidget(widget.id)
    };

    switch (widget.type) {
      case WIDGET_TYPES.CLOCK: return <ClockWidget {...commonProps} />;
      case WIDGET_TYPES.DAY_PROGRESS: return <DayProgressWidget {...commonProps} />;
      case WIDGET_TYPES.EVENTS: return <EventsWidget {...commonProps} />;
      case WIDGET_TYPES.WEATHER: return <WeatherWidget {...commonProps} />;
      case WIDGET_TYPES.CALENDAR: return <CalendarWidget {...commonProps} />;
      case WIDGET_TYPES.COUNTDOWN: return <CountdownWidget {...commonProps} />;
      default: return null;
    }
  };

  return (
    <div className="w-full h-full p-4 relative" ref={containerRef}>
      {showWidgetControls && (
        <div className="absolute top-2 left-2 z-50 flex gap-2">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`p-2 rounded-full transition-all duration-300 focus:outline-none ${isEditMode ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-700'}`}
            title={isEditMode ? "Done Editing" : "Edit Layout"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
            </svg>
          </button>
          
          {isEditMode && (
            <button
              onClick={resetLayout}
              className="p-2 rounded-full bg-gray-800/50 text-gray-300 hover:text-white hover:bg-red-600/50 transition-all duration-300 focus:outline-none"
              title="Reset to Default"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {mounted && (
        <Responsive
          className="layout"
          layouts={layouts}
          width={width}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
        >
          {widgets.map(widget => (
            <div key={widget.id} className="w-full h-full relative group">
              {renderWidget(widget)}
            </div>
          ))}
        </Responsive>
      )}
    </div>
  );
};
