# Widget System Documentation

## Overview
The widget system provides a modular, scalable architecture for adding dashboard widgets to the Undistracted Me extension. Widgets can be enabled/disabled and are persisted to localStorage.

## Architecture

### Folder Structure
```
src/widgets/
├── BaseWidget.jsx          # Base wrapper component for all widgets
├── WidgetGrid.jsx          # Grid layout manager for widgets
├── widgetConfig.js         # Widget type definitions and defaults
├── index.js                # Main export file
├── calendar/
│   └── CalendarWidget.jsx  # Monthly calendar widget
├── countdown/
│   └── CountdownWidget.jsx # Event countdown widget
├── dateToday/
│   └── ClockWidget.jsx     # Large date display widget
├── dayProgress/
│   └── DayProgressWidget.jsx # 24-hour day progress widget
├── events/
│   └── EventsWidget.jsx    # Today's events/todo list widget
├── timer/                  # (Future: Timer widget)
└── weather/
    └── WeatherWidget.jsx   # Weather display widget
```

## Current Widgets

### 1. ClockWidget (dateToday/)
- **Size**: col-span-3 row-span-2
- **Purpose**: Large date display showing day, month, and date
- **Updates**: Every minute
- **Static data**: No

### 2. DayProgressWidget (dayProgress/)
- **Size**: col-span-2
- **Purpose**: Visual 24-hour day progress with dots
- **Updates**: Every minute
- **Static data**: No

### 3. EventsWidget (events/)
- **Size**: col-span-5
- **Purpose**: Display today's schedule/events
- **Updates**: Static (future: real-time)
- **Static data**: Yes (5 sample events)

### 4. WeatherWidget (weather/)
- **Size**: col-span-2
- **Purpose**: Current weather conditions
- **Updates**: Static (future: API integration)
- **Static data**: Yes (Cloudy, 25°C)

### 5. CalendarWidget (calendar/)
- **Size**: col-span-5
- **Purpose**: Monthly calendar view
- **Updates**: Every hour
- **Static data**: No (generates from current date)

### 6. CountdownWidget (countdown/)
- **Size**: col-span-2
- **Purpose**: Countdown to next event
- **Updates**: Every minute
- **Static data**: Yes (sample workout event)

## Adding a New Widget

### Step 1: Create Widget Component
```javascript
// src/widgets/myWidget/MyWidget.jsx
import React from 'react';
import { BaseWidget } from '../BaseWidget';

export const MyWidget = ({ onRemove, showRemove }) => {
  return (
    <BaseWidget className="col-span-X p-6" onRemove={onRemove} showRemove={showRemove}>
      {/* Widget content */}
    </BaseWidget>
  );
};
```

### Step 2: Register Widget Type
```javascript
// src/widgets/widgetConfig.js
export const WIDGET_TYPES = Object.freeze({
  // ... existing types
  MY_WIDGET: 'myWidget'
});

export const DEFAULT_WIDGETS = [
  // ... existing widgets
  { id: 'myWidget-1', type: WIDGET_TYPES.MY_WIDGET, enabled: true }
];
```

### Step 3: Add to WidgetGrid
```javascript
// src/widgets/WidgetGrid.jsx
import { MyWidget } from './myWidget/MyWidget';

// In renderWidget function:
case WIDGET_TYPES.MY_WIDGET:
  return <MyWidget {...commonProps} />;
```

### Step 4: Export Widget
```javascript
// src/widgets/index.js
export { MyWidget } from './myWidget/MyWidget';
```

## Widget Grid Layout

The widget grid uses a **12-column layout** with gap-6 spacing. Widgets span columns using Tailwind's `col-span-X` classes:

- `col-span-2`: Small widgets (weather, day progress, countdown)
- `col-span-3`: Medium widgets (clock)
- `col-span-5`: Large widgets (events, calendar)
- `row-span-2`: Double height (clock)

## Widget Management

### Enable/Disable Widgets
Widgets can be enabled/disabled through the widget configuration:
```javascript
const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);

// Disable a widget
setWidgets(prev => prev.map(w => 
  w.id === widgetId ? { ...w, enabled: false } : w
));
```

### Remove Widget (Future Feature)
The BaseWidget component includes a remove button that can be enabled:
```javascript
<WidgetGrid showWidgetControls={true} />
```

### Persistence
Widget states are automatically saved to localStorage:
- Key: `'widgets'`
- Format: JSON array of widget configurations

## Future Enhancements

1. **Drag and Drop**: Allow users to rearrange widgets
2. **Widget Settings**: Per-widget configuration options
3. **Dynamic Data**: API integrations for weather, events
4. **Custom Widgets**: User-created widget support
5. **Widget Marketplace**: Share and download widgets
6. **Responsive Layouts**: Mobile-optimized widget grid
7. **Widget Themes**: Light/dark mode support
8. **Animation**: Smooth transitions for add/remove

## Design Guidelines

### Dimensions
- Maintain consistent height/width ratios as per example.html
- Use Tailwind's grid system for layout
- Default padding: `p-6` for most widgets, `p-4` for compact ones

### Colors
- Background: `bg-white`
- Text: `text-gray-900` (headings), `text-gray-500` (secondary)
- Accents: `bg-black` for CTAs, `text-gray-400` for metadata
- Borders: `rounded-2xl` for all widgets
- Shadows: `shadow-md`

### Typography
- Headings: `text-lg font-semibold`
- Body: `text-sm`
- Large numbers: `text-6xl font-extrabold`
- Metadata: `text-xs text-gray-400`

### Interactivity
- Hover states: `hover:bg-gray-100` or `hover:bg-gray-800`
- Transitions: `transition-colors duration-300`
- Focus states: Maintain accessibility with focus outlines

## Usage in App

Toggle between widget view and main view:
```javascript
// In App.jsx
const [showWidgets, setShowWidgets] = useState(false);

{showWidgets ? (
  <WidgetGrid showWidgetControls={false} />
) : (
  <MainView />
)}
```

## Notes

- All widgets use static data initially for rapid prototyping
- Real-time updates implemented where appropriate (clock, day progress)
- Widget state persists across sessions via localStorage
- Grid layout responsive to screen size (future enhancement)
