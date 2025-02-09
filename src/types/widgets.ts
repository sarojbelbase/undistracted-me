export interface Widget {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  settings: Record<string, any>;
}

export interface WidgetBase {
  id: string;
  type: string;
  title: string;
  component: React.ComponentType<WidgetProps>;
  defaultSettings: Record<string, any>;
  defaultSize: { w: number; h: number };
}

export interface WidgetProps {
  id: string;
  settings: Record<string, any>;
}

export interface WidgetDefinition {
  id: string;
  type: string;
  title: string;
  order: number;
  component: React.ComponentType<WidgetProps>;
  defaultSettings: Record<string, any>;
  defaultSize: { w: number; h: number };
}