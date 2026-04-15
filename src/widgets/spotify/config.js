import { Widget } from './Widget';
import { MusicNoteBeamed } from 'react-bootstrap-icons';

export default {
  type: 'spotify',
  title: 'Spotify',
  category: 'tools',
  icon: MusicNoteBeamed,
  description: 'Spotify playback controls',
  enabled: true,
  x: 4, y: 5, w: 2, h: 2.5,
  breakpoints: {
    md: { x: 4, y: 7, w: 3, h: 2.5 },
    sm: { x: 4, y: 9.5, w: 2, h: 2.5 },
    xs: { x: 2, y: 15.5, w: 2, h: 2.5 },
    xxs: { x: 0, y: 26, w: 2, h: 2.5 },
  },
  Component: Widget,
};
