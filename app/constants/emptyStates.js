/**
 * ─── Empty-state copy — single source of truth ───────────────────────────────
 *
 * One title, one sentence, at most one action button. No numbered steps, no
 * emoji. Rendered by `app/components/ui/EmptyState.jsx`.
 *
 * Structure (the "same structure" used everywhere):
 *   EMPTY_STATES.<widget>.<key> = { title: string, text: string }
 *
 * Widget faces (cramped cards) render with `size="sm"`; modal / expanded views
 * render with the default size. Dynamic copy (a search query, a folder name, a
 * time range) is interpolated at the call site and stays out of this map.
 */
export const EMPTY_STATES = Object.freeze({
  pocket: {
    all: {
      title: "Nothing saved yet.",
      text: "Select text on any page, right-click, and choose Add to Pocket.",
    },
    widget: {
      title: "Nothing saved yet",
      text: "Select text on any page and Add to Pocket.",
    },
    link: {
      title: "No links yet.",
      text: "Right-click a link or a page and choose Add to Pocket.",
    },
    sentence: {
      title: "No sentences yet.",
      text: "Select a sentence on any page and choose Add to Pocket.",
    },
    paragraph: {
      title: "No paragraphs yet.",
      text: "Select a few sentences on any page and choose Add to Pocket.",
    },
    code: {
      title: "No code yet.",
      text: "Select code on any page and choose Add to Pocket.",
    },
  },

  rss: {
    default: {
      title: "No headlines yet",
      text: "Select at least one source from Settings.",
    },
    custom: {
      title: "No headlines yet",
      text: "Import an OPML file with your feed URLs to get started.",
    },
  },

  occasions: {
    unconnected: {
      title: "No occasions yet",
      text: "Connect Google Contacts to sync birthdays or add them manually.",
    },
    empty: {
      title: "Nothing coming up",
      text: "No birthdays in your contacts.",
    },
  },

  events: {
    empty: {
      title: "No upcoming events",
      text: "Hit + to create one.",
    },
  },

  countdown: {
    empty: {
      title: "No countdowns yet",
      text: "Add events or open settings to create one.",
    },
  },

  expense: {
    empty: {
      title: "No expenses yet",
      text: "Add one below.",
    },
  },

  media: {
    empty: {
      title: "Nothing playing",
      text: "Open YouTube or SoundCloud in any tab.",
    },
  },

  quickAccess: {
    empty: {
      title: "No top sites available",
      text: "Your most-visited sites will appear here.",
    },
    unsupported: {
      title: "Not supported outside the extension",
      text: "Open this page as the extension's new tab to see top sites.",
    },
  },
});
