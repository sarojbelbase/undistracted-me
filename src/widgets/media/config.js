import { Widget } from './Widget';
import { MusicNoteBeamed } from 'react-bootstrap-icons';

export default {
  type: 'spotify',
  title: 'Media',
  category: 'tools',
  icon: MusicNoteBeamed,
  description: 'Spotify & browser media controls',
  enabled: true,
  x: 16, y: 20, w: 8, h: 10,
  breakpoints: {
    md: { x: 16, y: 28, w: 12, h: 10 },
    sm: { x: 16, y: 32, w: 8, h: 12 },
    xs: { x: 0, y: 97, w: 16, h: 14 },
    xxs: { x: 0, y: 184, w: 8, h: 18 },
  },
  Component: Widget,
};
