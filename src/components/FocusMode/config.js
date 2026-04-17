// ─── Focus Mode layout configuration ─────────────────────────────────────────
//
// Single source of truth for zones, items, and render order.
// Each zone has `enable` and `items` where every item has `enable` + `order`.
//
// ┌──────────────────────── TOP ────────────────────────────┐
// │  [← Canvas]         weather · date         [⛶] [⚙]   │
// ├──────────────────────────────────────────────────────────┤
// │       LEFT            CENTER             RIGHT           │
// │    (panels)       clock + search      (world clock)      │
// ├──────────────────────── BOTTOM ─────────────────────────┤
// │                      greeting                            │
// └──────────────────────────────────────────────────────────┘

export const ZONES = {
  top: {
    enable: true,
    items: {
      weatherIcon: { enable: true, order: 0 },
      weatherTemp: { enable: true, order: 1 },
      date: { enable: true, order: 2 },
      year: { enable: true, order: 3 },
    },
  },
  center: {
    enable: true,
    items: {
      clock: { enable: true, order: 0 },
      searchBar: { enable: true, order: 1 },
    },
  },
  left: {
    enable: true,
    items: {
      pomodoro: { enable: true, order: 0 },
      event: { enable: true, order: 1 },
      occasion: { enable: true, order: 2 },
      stock: { enable: true, order: 3 },
      spotify: { enable: true, order: 4 },
    },
  },
  right: {
    enable: true,
    items: {
      worldClocks: { enable: true, order: 0 },
    },
  },
  bottom: {
    enable: true,
    items: {
      greeting: { enable: true, order: 0 },
    },
  },
};
