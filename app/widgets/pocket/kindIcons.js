import { CodeSlash, Link45deg, Quote, TextLeft } from "react-bootstrap-icons";

/**
 * KIND_ICONS — the react-bootstrap-icons glyph for each kind. Kept in its own
 * module so constants.js stays importable by the service worker without pulling
 * icon components into the background bundle.
 */
export const KIND_ICONS = Object.freeze({
  link: Link45deg,
  sentence: Quote,
  paragraph: TextLeft,
  code: CodeSlash,
});
