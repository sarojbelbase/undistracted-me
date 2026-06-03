import { Widget } from './Widget';
import { ExpenseSettings } from './Settings';
import { WalletFill } from 'react-bootstrap-icons';

export default {
  type: 'expense',
  title: 'Expense Tracker',
  category: 'tools',
  icon: WalletFill,
  description: 'Track daily expenses with summaries',
  enabled: true,
  platforms: {
    extension: { supported: true },
    web: { supported: true },
    phone: { supported: true },
  },
  x: 8, y: 18, w: 8, h: 10,
  breakpoints: {
    md: { x: 28, y: 28, w: 8, h: 9 },
    sm: { x: 16, y: 44, w: 8, h: 12 },
    xs: { x: 0, y: 88, w: 8, h: 14 },
    xxs: { x: 0, y: 200, w: 8, h: 15 },
  },
  Component: Widget,
  settingsComponent: ExpenseSettings,
};
