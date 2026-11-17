export default {
  type: "pocket",
  title: "Pocket",
  category: "tools",
  icon: "PocketIcon",
  description: "Save text from anywhere",
  enabled: true,
  platforms: {
    extension: { supported: true },
    web: { supported: true, limitations: ["Context-menu save needs the extension"] },
    phone: { supported: false },
  },
  x: 0,
  y: 8,
  w: 8,
  h: 10,
  breakpoints: {
    md: { x: 0, y: 38, w: 12, h: 12 },
    sm: { x: 0, y: 66, w: 12, h: 14 },
    xs: { x: 0, y: 72, w: 8, h: 16 },
    xxs: { x: 0, y: 152, w: 8, h: 16 },
  },
};
