import { Widget } from './widgets';

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ThemeSettings {
  accentColor: string;
  isDark: boolean;
}

export interface AppSettings {
  theme: ThemeSettings;
  widgets: Widget[];
}

export interface DayProgressSettings {
  mode: 'work' | '24h';
  startHour: number;
  endHour: number;
  showPercentage: boolean;
  dotColorActive: string;
  dotColorInactive: string;
}