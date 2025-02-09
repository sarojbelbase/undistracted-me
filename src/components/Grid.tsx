import React from 'react';
import { Widget, WidgetProps } from '../types/widgets';

interface GridProps {
  widgets: Widget[];
  renderWidget: (widget: Widget, props: WidgetProps) => React.ReactNode;
}

const Grid: React.FC<GridProps> = ({ widgets, renderWidget }) => {
  return (
    <div className="grid grid-cols-12 grid-rows-8 gap-6 p-5 min-h-screen">
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className="relative"
          style={{
            gridColumn: `span ${widget.size.w}`,
            gridRow: `span ${widget.size.h}`,
          }}
        >
          {
            renderWidget(widget, {
              id: widget.id,
              settings: widget.settings
            })
          }
        </div>
      ))}
    </div>
  );
};

export default Grid;