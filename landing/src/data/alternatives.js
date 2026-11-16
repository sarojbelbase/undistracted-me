/**
 * "Undistracted Me vs X" comparison pages.
 *
 * Every fact about a competitor is marked with a `[VERIFY]` comment so it can be
 * re-checked against the competitor's own site before publishing. Facts about
 * Undistracted Me come from this repo and are not speculative.
 */

// Our baseline — shown in the right-hand column of every comparison table.
export const ours = {
  price: "Free — no tiers, no upgrades",
  account: "No account, ever",
  openSource: "Yes — MIT license",
  pomodoro: "Built in, free",
  ambient: "Built in — rain and white noise",
  tasks: "Google Tasks, built in",
  widgets:
    "Calendar, notes, weather, stocks (NEPSE), countdown, events, media, Pomodoro, more",
};

export const alternatives = [
  {
    slug: "momentum",
    name: "Momentum",
    title: "Momentum Alternative: Free, Open-Source Focus New Tab",
    description:
      "Looking for a Momentum alternative? Undistracted Me is a free, open-source new tab with Focus Mode, Pomodoro, ambient sounds and Google Tasks — no account, no paid tier.",
    h1: "Momentum alternative",
    subline:
      "A free, open-source new tab with Focus Mode, Pomodoro, ambient sounds and Google Tasks — no paid tier.",
    intro: [
      "Momentum is one of the most popular new-tab extensions there is: a daily photo, an inspiring quote and a to-do list that greet you every time you open a tab. It's polished, widely loved, and its free tier covers the basics well. Undistracted Me starts from the same idea — a quieter new tab — but takes a different stance on price, openness and privacy.",
      "The headline difference is simple: Momentum's focus features sit behind Momentum Plus, a paid subscription, while every feature in Undistracted Me is free and open source. If you only want the photo-and-quote experience, Momentum's free tier is a fine choice. If you want the focus tools too, the maths changes.",
    ],
    comparison: {
      // [VERIFY] Momentum Plus pricing (annual plan) per momentumdash.com
      price: "Free tier; Momentum Plus is $39.95/year",
      // [VERIFY] Free tier works without an account; Plus requires one to save data
      account: "Optional on free; Plus requires an account",
      // [VERIFY] Momentum is proprietary, not open source
      openSource: "No — proprietary",
      // [VERIFY] Pomodoro timer is a Momentum Plus (paid) feature
      pomodoro: "Yes — Plus only",
      // [VERIFY] "Soundscapes" ambient audio is a Momentum Plus feature
      ambient: "Yes — Plus only",
      // [VERIFY] Built-in to-do is free; Google Tasks/Todoist/etc. are Plus-only
      tasks: "Built-in to-do; Google Tasks is Plus-only",
      // [VERIFY] Widget set per momentumdash.com feature list
      widgets: "Photo, quote, clock, weather, to-do, links, search, calendar",
    },
    differences: [
      "The most visible difference is the photo. Momentum leads with a rotating background image and a quote, and it's lovely at that. Undistracted Me leads with a plain, calm surface — a clock, the date and a few quiet widgets you pick — and swaps the photo feed for themes called Paper, Glass, Comic and Dark.",
      "On focus tools, both offer a Pomodoro timer and relaxing audio. The difference is the gate: in Momentum these are Plus features, so they're absent from the free tier, while Undistracted Me's Focus Mode — fullscreen, Pomodoro, rain and white noise, and your Google Tasks kept front and centre — is built in and free.",
      "On privacy, Momentum's free tier works without an account (it recommends one to sync), and Plus requires one. Undistracted Me has no account at all: nothing to sign up for, no sync server, and the whole thing works offline.",
    ],
    whenToChoose:
      "Choose Momentum instead if you want a polished, photo-and-quote dashboard and don't mind paying for the focus extras, or if you specifically want Momentum's curated photography and daily quote. Its design is genuinely excellent, and the free tier is useful on its own. Undistracted Me is the better fit when you want Pomodoro, ambient sounds and Google Tasks without a subscription — and without an account.",
  },
  {
    slug: "tabliss",
    name: "Tabliss",
    title: "Tabliss Alternative: Pomodoro, Ambient Sounds & Google Tasks",
    description:
      "Tabliss alternative: Undistracted Me is a free, open-source new tab that adds Focus Mode, Pomodoro, ambient sounds and Google Tasks on top of a quiet widget grid.",
    h1: "Tabliss alternative",
    subline:
      "The same free, open-source spirit as Tabliss — plus Pomodoro, ambient sounds and Google Tasks built in.",
    intro: [
      "Tabliss is a free, open-source new tab that's earned a loyal following for good reason: it has no ads, no account and no tracking, and it stores everything locally. If you value a minimal, privacy-first new tab, Tabliss is a strong baseline. Undistracted Me shares that same free and open-source stance, then adds the focus tools Tabliss leaves out.",
      "Where the two differ is in what \"new tab\" means to you. Tabliss is a blank canvas you fill with widgets. Undistracted Me is that canvas plus a dedicated Focus Mode with a Pomodoro timer, ambient rain and white noise, and your Google Tasks — features Tabliss simply doesn't ship.",
    ],
    comparison: {
      // [VERIFY] Tabliss is free with no ads or subscriptions per tabliss.io
      price: "Free — no ads, no subscriptions",
      // [VERIFY] No account; settings stored locally per tabliss.io
      account: "None — settings stay local",
      // [VERIFY] Tabliss is open source (GPL-3.0)
      openSource: "Yes — GPL-3.0",
      // [VERIFY] No built-in Pomodoro timer in Tabliss
      pomodoro: "No",
      // [VERIFY] No ambient-sound feature in Tabliss
      ambient: "No",
      // [VERIFY] Built-in to-do widget only; no Google Tasks integration
      tasks: "Built-in to-do; no Google Tasks",
      // [VERIFY] ~20 widget modules per tabliss.io
      widgets: "Weather, clock, greetings, to-do, quick links, search, more",
    },
    differences: [
      "On freedom and privacy the two are close cousins: both are free, open source, account-free and offline-friendly. The practical difference is that Tabliss is a do-it-yourself dashboard — you assemble widgets — while Undistracted Me ships a curated set of quiet widgets (calendar, notes, weather, NEPSE stocks, countdown and more) and a fullscreen Focus Mode.",
      "The biggest gap is focus. Tabliss has no Pomodoro timer and no ambient sounds, and its to-do is a simple built-in list with no Google Tasks integration. If you rely on Google Tasks, Undistracted Me keeps them on your new tab without a third-party bridge.",
      "Both are solid choices for a minimalist new tab. Tabliss is the more bare-bones, widget-only option; Undistracted Me adds the timer, the sounds and the tasks on top.",
    ],
    whenToChoose:
      "Choose Tabliss instead if you want the most minimal possible dashboard — a blank grid of widgets, nothing more — and you don't need a Pomodoro timer, ambient sounds or Google Tasks. It's a clean, trustworthy project. Choose Undistracted Me if you want that same free, open-source, no-account foundation and the focus tools bundled in.",
  },
  {
    slug: "bonjourr",
    name: "Bonjourr",
    title: "Bonjourr Alternative: Ambient Sounds, Google Tasks & More Widgets",
    description:
      "Bonjourr alternative: Undistracted Me is a free, open-source new tab with a Pomodoro timer plus ambient sounds, Google Tasks and a larger widget grid.",
    h1: "Bonjourr alternative",
    subline:
      "A free, open-source new tab like Bonjourr — with ambient sounds, Google Tasks and a bigger widget grid.",
    intro: [
      "Bonjourr is a free, donation-funded, open-source new tab with a calm, photo-backed design and a built-in Pomodoro timer. It's a lovely, minimal option and shares a lot of DNA with Undistracted Me: no account, settings stored locally, and everything free. The two agree on the basics and diverge on the details.",
      "The main differences come down to ambient sound, task integration and the size of the widget library. Bonjourr keeps things deliberately small; Undistracted Me goes a little further in each direction.",
    ],
    comparison: {
      // [VERIFY] Bonjourr is free and donation-funded per bonjourr.fr
      price: "Free — donation-funded",
      // [VERIFY] No account; local settings, no cross-device sync
      account: "None — settings stay local",
      // [VERIFY] Bonjourr is open source (GPL-3.0)
      openSource: "Yes — GPL-3.0",
      // [VERIFY] Built-in Pomodoro timer + analog clock
      pomodoro: "Yes — built in",
      // [VERIFY] No ambient-sound feature in Bonjourr
      ambient: "No",
      // [VERIFY] Notes only; no Google Tasks or to-do list
      tasks: "Notes only; no Google Tasks",
      // [VERIFY] Widget set per bonjourr.fr
      widgets: "Photo, clock, weather, search, quick links, notes, Pomodoro",
    },
    differences: [
      "The biggest shared feature is the Pomodoro timer: both Bonjourr and Undistracted Me have one built in, for free. Bonjourr pairs it with a minimalist analog clock and a time-of-day photo background. Undistracted Me pairs it with a fullscreen Focus Mode and ambient rain and white noise — the one thing Bonjourr doesn't offer.",
      "On tasks, Bonjourr keeps it simple with a notes field and no task-list integration. Undistracted Me pulls your real Google Tasks onto the new tab, alongside a notes widget, so your list travels with your Google account rather than living only on one machine.",
      "On widgets, Bonjourr sticks to a compact set — photo, clock, weather, search, quick links and notes. Undistracted Me ships a wider grid: calendar, notes, weather, NEPSE stocks, countdown, events, media controls, Pomodoro and more, all optional and rearrangeable.",
    ],
    whenToChoose:
      "Choose Bonjourr instead if you want the most focused, minimal new tab — a photo, a clock and a Pomodoro — and you don't need ambient sounds, Google Tasks or a large widget grid. It's a beautifully restrained project. Choose Undistracted Me if you want the Pomodoro plus rain-and-white-noise ambience, Google Tasks, and a richer set of optional widgets.",
  },
];

export function getAlternative(slug) {
  return alternatives.find((a) => a.slug === slug);
}
