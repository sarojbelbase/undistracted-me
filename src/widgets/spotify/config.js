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
    sm: { x: 16, y: 38, w: 8, h: 10 },
    xs: { x: 8, y: 62, w: 8, h: 10 },
    xxs: { x: 0, y: 104, w: 8, h: 10 },
  },
  Component: Widget,
};
