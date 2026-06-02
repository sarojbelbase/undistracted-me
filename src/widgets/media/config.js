import { Widget } from './Widget';
import { MusicNoteBeamed } from 'react-bootstrap-icons';

export default {
  type: 'media',
  title: 'Media',
  category: 'tools',
  icon: MusicNoteBeamed,
  description: 'Spotify & browser media controls',
  enabled: true,
  platforms: {
    extension: { supported: true },
    web: { supported: 'partial', limitations: ['Tab media detection unavailable on web'] },
    phone: { supported: 'partial', limitations: ['Tab media detection not available on mobile'] },
  },
  x: 8, y: 8, w: 8, h: 10,
  breakpoints: {
    md: { x: 16, y: 28, w: 12, h: 10 },
    sm: { x: 16, y: 32, w: 8, h: 12 },
    xs: { x: 8, y: 121, w: 8, h: 14 },
    xxs: { x: 0, y: 184, w: 8, h: 18 },
  },
  Component: Widget,
};
