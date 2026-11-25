/**
 * "Undistracted Me vs X" comparison pages.
 *
 * Every fact about a competitor is marked with a `[VERIFY]` comment so it can be
 * re-checked against the competitor's own site before publishing. Facts about
 * Undistracted Me come from this repo and are not speculative.
 */

// Our baseline: shown in the right-hand column of every comparison table.
export const ours = {
  price: "Free: no tiers, no upgrades",
  account: "No account, ever",
  openSource: "Yes: MIT license",
  pomodoro: "Built in, free",
  ambient: "Built in: rain and white noise",
  tasks: "Google Tasks, built in",
  widgets:
    "Calendar, notes, weather, stocks (NEPSE), countdown, events, media, Pomodoro, more",
  blocking: "Built in: block sites for a timer or always, free",
  clipper: "Built in: clip and save text from any page",
};

export const alternatives = [
  {
    slug: "momentum",
    name: "Momentum",
    title: "Momentum Alternative: Free, Open-Source Focus New Tab",
    description:
      "Looking for a Momentum alternative? Undistracted Me is a free, open-source new tab with Focus Mode, Pomodoro, ambient sounds and Google Tasks: no account, no paid tier.",
    h1: "Momentum alternative",
    subline:
      "A free, open-source new tab with Focus Mode, Pomodoro, ambient sounds and Google Tasks: no paid tier.",
    intro: [
      "Momentum is one of the most popular new-tab extensions there is: a daily photo, an inspiring quote and a to-do list that greet you every time you open a tab. It's polished, widely loved and its free tier covers the basics well. Undistracted Me starts from the same idea: a quieter new tab: but takes a different stance on price, openness and privacy.",
      "The headline difference is simple: Momentum's focus features sit behind Momentum Plus, a paid subscription, while every feature in Undistracted Me is free and open source. If you only want the photo-and-quote experience, Momentum's free tier is a fine choice. If you want the focus tools too, the maths changes.",
    ],
    comparison: {
      // [VERIFY] Momentum Plus pricing (annual plan) per momentumdash.com
      price: "Free tier; Momentum Plus is $39.95/year",
      // [VERIFY] Free tier works without an account; Plus requires one to save data
      account: "Optional on free; Plus requires an account",
      // [VERIFY] Momentum is proprietary, not open source
      openSource: "No: proprietary",
      // [VERIFY] Pomodoro timer is a Momentum Plus (paid) feature
      pomodoro: "Yes: Plus only",
      // [VERIFY] "Soundscapes" ambient audio is a Momentum Plus feature
      ambient: "Yes: Plus only",
      // [VERIFY] Built-in to-do is free; Google Tasks/Todoist/etc. are Plus-only
      tasks: "Built-in to-do; Google Tasks is Plus-only",
      // [VERIFY] Widget set per momentumdash.com feature list
      widgets: "Photo, quote, clock, weather, to-do, links, search, calendar",
      // [VERIFY] No site-blocking feature in Momentum
      blocking: "No",
      // [VERIFY] No read-it-later / web clipper in Momentum
      clipper: "No",
    },
    differences: [
      "The most visible difference is the photo. Momentum leads with a rotating background image and a quote, and it's lovely at that. Undistracted Me leads with a plain, calm surface: a clock, the date and a few quiet widgets you pick: and swaps the photo feed for themes called Paper, Glass, Comic and Dark.",
      "On focus tools, both offer a Pomodoro timer and relaxing audio. The difference is the gate: in Momentum these are Plus features, so they're absent from the free tier, while Undistracted Me's Focus Mode: fullscreen, Pomodoro, rain and white noise and your Google Tasks kept front and centre: is built in and free.",
      "On privacy, Momentum's free tier works without an account (it recommends one to sync) and Plus requires one. Undistracted Me has no account at all: nothing to sign up for, no sync server and the whole thing works offline.",
    ],
    whenToChoose:
      "Choose Momentum instead if you want a polished, photo-and-quote dashboard and don't mind paying for the focus extras or if you specifically want Momentum's curated photography and daily quote. Its design is genuinely excellent, and the free tier is useful on its own. Undistracted Me is the better fit when you want Pomodoro, ambient sounds and Google Tasks without a subscription: and without an account.",
  },
  {
    slug: "tabliss",
    name: "Tabliss",
    title: "Tabliss Alternative: Pomodoro, Ambient Sounds & Google Tasks",
    description:
      "Tabliss alternative: Undistracted Me is a free, open-source new tab that adds Focus Mode, Pomodoro, ambient sounds and Google Tasks on top of a quiet widget grid.",
    h1: "Tabliss alternative",
    subline:
      "The same free, open-source spirit as Tabliss: plus Pomodoro, ambient sounds and Google Tasks built in.",
    intro: [
      "Tabliss is a free, open-source new tab that's earned a loyal following for good reason: it has no ads and no account and it stores everything locally. If you value a minimal, privacy-first new tab, Tabliss is a strong baseline. Undistracted Me shares that same free and open-source stance, then adds the focus tools Tabliss leaves out.",
      "Where the two differ is in what \"new tab\" means to you. Tabliss is a blank canvas you fill with widgets. Undistracted Me is that canvas plus a dedicated Focus Mode with a Pomodoro timer, ambient rain and white noise and your Google Tasks: features Tabliss simply doesn't ship.",
    ],
    comparison: {
      // [VERIFY] Tabliss is free with no ads or subscriptions per tabliss.io
      price: "Free: no ads, no subscriptions",
      // [VERIFY] No account; settings stored locally per tabliss.io
      account: "None: settings stay local",
      // [VERIFY] Tabliss is open source (GPL-3.0)
      openSource: "Yes: GPL-3.0",
      // [VERIFY] No built-in Pomodoro timer in Tabliss
      pomodoro: "No",
      // [VERIFY] No ambient-sound feature in Tabliss
      ambient: "No",
      // [VERIFY] Built-in to-do widget only; no Google Tasks integration
      tasks: "Built-in to-do; no Google Tasks",
      // [VERIFY] ~20 widget modules per tabliss.io
      widgets: "Weather, clock, greetings, to-do, quick links, search, more",
      // [VERIFY] No site-blocking feature in Tabliss
      blocking: "No",
      // [VERIFY] No read-it-later / web clipper in Tabliss
      clipper: "No",
    },
    differences: [
      "On freedom and privacy the two are close cousins: both are free, open source, account-free and offline-friendly. The practical difference is that Tabliss is a do-it-yourself dashboard: you assemble widgets: while Undistracted Me ships a curated set of quiet widgets (calendar, notes, weather, NEPSE stocks, countdown and more) and a fullscreen Focus Mode.",
      "The biggest gap is focus. Tabliss has no Pomodoro timer and no ambient sounds, and its to-do is a simple built-in list with no Google Tasks integration. If you rely on Google Tasks, Undistracted Me keeps them on your new tab without a third-party bridge.",
      "Both are solid choices for a minimalist new tab. Tabliss is the more bare-bones, widget-only option; Undistracted Me adds the timer, the sounds and the tasks on top.",
    ],
    whenToChoose:
      "Choose Tabliss instead if you want the most minimal possible dashboard: a blank grid of widgets, nothing more: and you don't need a Pomodoro timer, ambient sounds or Google Tasks. It's a clean, trustworthy project. Choose Undistracted Me if you want that same free, open-source, no-account foundation and the focus tools bundled in.",
  },
  {
    slug: "bonjourr",
    name: "Bonjourr",
    title: "Bonjourr Alternative: Ambient Sounds, Google Tasks & More Widgets",
    description:
      "Bonjourr alternative: Undistracted Me is a free, open-source new tab with a Pomodoro timer plus ambient sounds, Google Tasks and a larger widget grid.",
    h1: "Bonjourr alternative",
    subline:
      "A free, open-source new tab like Bonjourr: with ambient sounds, Google Tasks and a bigger widget grid.",
    intro: [
      "Bonjourr is a free, donation-funded, open-source new tab with a calm, photo-backed design and a built-in Pomodoro timer. It's a lovely, minimal option and shares a lot of DNA with Undistracted Me: no account, settings stored locally and everything free. The two agree on the basics and diverge on the details.",
      "The main differences come down to ambient sound, task integration and the size of the widget library. Bonjourr keeps things deliberately small; Undistracted Me goes a little further in each direction.",
    ],
    comparison: {
      // [VERIFY] Bonjourr is free and donation-funded per bonjourr.fr
      price: "Free: donation-funded",
      // [VERIFY] No account; local settings, no cross-device sync
      account: "None: settings stay local",
      // [VERIFY] Bonjourr is open source (GPL-3.0)
      openSource: "Yes: GPL-3.0",
      // [VERIFY] Built-in Pomodoro timer + analog clock
      pomodoro: "Yes: built in",
      // [VERIFY] No ambient-sound feature in Bonjourr
      ambient: "No",
      // [VERIFY] Notes only; no Google Tasks or to-do list
      tasks: "Notes only; no Google Tasks",
      // [VERIFY] Widget set per bonjourr.fr
      widgets: "Photo, clock, weather, search, quick links, notes, Pomodoro",
      // [VERIFY] No site-blocking feature in Bonjourr
      blocking: "No",
      // [VERIFY] No read-it-later / web clipper in Bonjourr
      clipper: "No",
    },
    differences: [
      "The biggest shared feature is the Pomodoro timer: both Bonjourr and Undistracted Me have one built in, for free. Bonjourr pairs it with a minimalist analog clock and a time-of-day photo background. Undistracted Me pairs it with a fullscreen Focus Mode and ambient rain and white noise: the one thing Bonjourr doesn't offer.",
      "On tasks, Bonjourr keeps it simple with a notes field and no task-list integration. Undistracted Me pulls your real Google Tasks onto the new tab, alongside a notes widget, so your list travels with your Google account rather than living only on one machine.",
      "On widgets, Bonjourr sticks to a compact set: photo, clock, weather, search, quick links and notes. Undistracted Me ships a wider grid: calendar, notes, weather, NEPSE stocks, countdown, events, media controls, Pomodoro and more, all optional and rearrangeable.",
    ],
    whenToChoose:
      "Choose Bonjourr instead if you want the most focused, minimal new tab: a photo, a clock and a Pomodoro: and you don't need ambient sounds, Google Tasks or a large widget grid. It's a beautifully restrained project. Choose Undistracted Me if you want the Pomodoro plus rain-and-white-noise ambience, Google Tasks and a richer set of optional widgets.",
  },
  {
    slug: "blocksite",
    name: "BlockSite",
    title: "BlockSite Alternative: Free, Open-Source Site Blocker + Focus New Tab",
    description:
      "Looking for a BlockSite alternative? Undistracted Me is a free, open-source new tab with site blocking and a web clipper: no account and your blocklist never leaves your device.",
    h1: "BlockSite alternative",
    subline:
      "A free, open-source site blocker that is also a focus new tab: with a web clipper, Pomodoro and quiet widgets.",
    intro: [
      "BlockSite is a popular distraction blocker: it blocks websites and apps, usually on a schedule and is used by around a million people. Undistracted Me starts from the same promise: block the sites that pull you in: but bundles it into a free, open-source new tab instead of a paid, standalone utility.",
      "The headline difference is privacy and price. BlockSite's blocking is the whole product, and its premium tier gates schedules and extra features. Undistracted Me gives you blocking, a web clipper and a full dashboard in one free, open-source package: and your blocklist never leaves your device.",
    ],
    comparison: {
      // [VERIFY] BlockSite free tier limits (number of sites / schedules) per blocksite.co
      price: "Free tier; Premium for full schedules",
      // [VERIFY] BlockSite account is optional for sync
      account: "Optional account for sync",
      // [VERIFY] BlockSite is proprietary
      openSource: "No: proprietary",
      // [VERIFY] BlockSite is a blocker, not a focus timer
      pomodoro: "No built-in Pomodoro",
      // [VERIFY] No ambient-sound feature in BlockSite
      ambient: "No",
      // [VERIFY] BlockSite has no Google Tasks integration
      tasks: "No Google Tasks",
      // [VERIFY] BlockSite offers no new-tab widget dashboard
      widgets: "No new-tab dashboard",
      // [VERIFY] BlockSite blocks sites and apps on schedules
      blocking: "Yes: sites and apps on schedules",
      // [VERIFY] BlockSite has no read-it-later / web clipper
      clipper: "No",
    },
    differences: [
      "Both stop you reaching the sites that eat your day. The difference is where that happens. BlockSite is a purpose-built blocker you install and forget; Undistracted Me is a blocker plus a whole new-tab page: the same rule engine, but it meets you every time you open a tab.",
      "On privacy, the wedge is meaningful. Your blocklist in Undistracted Me is stored only on your device and enforced through the browser's own declarative rules: it never touches a server. BlockSite is a commercial product with its own account and sync infrastructure.",
      "On scope, BlockSite does one thing (blocking) and does it well. Undistracted Me does blocking for free and adds a web clipper, a Pomodoro timer, ambient sounds, Google Tasks and a rearrangeable widget grid, all open source.",
    ],
    whenToChoose:
      "Choose BlockSite instead if you want a dedicated, schedule-driven blocker and don't mind a separate premium tier or if blocking across apps (not just the browser) is your priority. Choose Undistracted Me if you want blocking built into a free, open-source new tab: with a web clipper and focus tools alongside it and no account, ever.",
  },
  {
    slug: "stayfocusd",
    name: "StayFocusd",
    title: "StayFocusd Alternative: Free, Open-Source Site Blocker + Focus New Tab",
    description:
      "Looking for a StayFocusd alternative? Undistracted Me is a free, open-source new tab that blocks distracting sites and clips what you find: no account, your blocklist never leaves your device.",
    h1: "StayFocusd alternative",
    subline:
      "The same free, open-source blocking spirit as StayFocusd: plus a web clipper, a Pomodoro and a whole focus new tab.",
    intro: [
      "StayFocusd is a beloved, free and open-source blocker that limits the time you can spend on distracting sites: the \"nuclear option\" you reach for when you're serious about focus. Undistracted Me shares its open-source, no-account ethos, then wraps that same idea in a full new-tab page.",
      "The difference is what you get alongside the blocking. StayFocusd is blocking only, living quietly in your toolbar. Undistracted Me gives you blocking plus a web clipper, a Pomodoro timer, ambient sounds, Google Tasks and a dashboard of quiet widgets: all free and open source.",
    ],
    comparison: {
      // [VERIFY] StayFocusd is free and open source
      price: "Free: open source",
      // [VERIFY] StayFocusd has no account
      account: "None: settings stay local",
      // [VERIFY] StayFocusd is open source (GPL-3.0)
      openSource: "Yes: GPL-3.0",
      // [VERIFY] StayFocusd has no Pomodoro timer
      pomodoro: "No built-in Pomodoro",
      // [VERIFY] StayFocusd has no ambient-sound feature
      ambient: "No",
      // [VERIFY] StayFocusd has no Google Tasks integration
      tasks: "No Google Tasks",
      // [VERIFY] StayFocusd offers no new-tab dashboard
      widgets: "No new-tab dashboard",
      // [VERIFY] StayFocusd limits time on sites per day
      blocking: "Yes: time-limited site blocking",
      // [VERIFY] StayFocusd has no read-it-later / web clipper
      clipper: "No",
    },
    differences: [
      "On privacy and price the two are close: both are free, open source and keep your settings local. Neither requires an account. If you just want a no-nonsense time-limiter, StayFocusd is a great, trustworthy choice.",
      "The practical difference is the surface. StayFocusd runs from a toolbar popup and does blocking only. Undistracted Me is a full new tab: the blocking is one part of a page that also clips what you find, times your focus sessions, plays ambient sounds and shows your tasks.",
      "On blocking style, StayFocusd's strength is daily time budgets per site. Undistracted Me blocks for a set timer or permanently, with a calm interstitial that gives you a countdown instead of a hard wall.",
    ],
    whenToChoose:
      "Choose StayFocusd instead if you want a lean, free, open-source time-limiter and nothing more: it has earned its reputation. Choose Undistracted Me if you want that same free and open-source blocking as part of a complete focus new tab, with a web clipper, Pomodoro, ambient sounds and Google Tasks built in.",
  },
  {
    slug: "forest",
    name: "Forest",
    title: "Forest Alternative: Free, Open-Source Pomodoro & Focus New Tab",
    description:
      "Forest alternative: Undistracted Me brings the same Pomodoro focus and app blocking to your browser new tab, free and open source, with ambient sounds and Google Tasks.",
    h1: "Forest alternative",
    subline:
      "A free, open-source Pomodoro and focus new tab for your browser: app blocking, ambient sounds and Google Tasks, no account.",
    intro: [
      "Forest is one of the most loved focus apps around: plant a virtual tree, start a timer and the tree grows while you work. It's built for your phone, with a free tier that covers the core timer and app blocking, plus a Forest Plus subscription for the extras. Undistracted Me takes the same idea and puts it where you actually get distracted: your browser's new tab.",
      "The big difference is the surface. Forest lives on your phone and guards your mobile apps. Undistracted Me lives in your new tab and guards your browser: a Pomodoro timer, a fullscreen Focus Mode and site blocking, all free and open source.",
    ],
    comparison: {
      // [VERIFY] Forest Plus is $5.99/mo or $35.99/yr (US App Store, "Early Bird") per forestapp.cc + App Store
      price: "Free; Forest Plus is $5.99/mo or $35.99/yr",
      // [VERIFY] Account used for sync, leaderboard and Plant Together per forestapp.cc
      account: "Account for sync and social features",
      // [VERIFY] Forest is proprietary
      openSource: "No: proprietary",
      // [VERIFY] Focus timer in countdown and stopwatch form is a free core feature
      pomodoro: "Yes: focus timer, countdown and stopwatch",
      // [VERIFY] Mindful Space soundscapes: one free, all with Plus
      ambient: "Yes: soundscapes (one free, all with Plus)",
      // [VERIFY] Forest is a phone app with no browser new-tab dashboard
      widgets: "No new-tab dashboard",
      // [VERIFY] Deep Focus blocks mobile apps; free tier
      blocking: "Yes: blocks phone apps",
      // [VERIFY] No web clipper
      clipper: "No",
      // [VERIFY] No to-do list or Google Tasks integration
      tasks: "No task list or Google Tasks",
    },
    differences: [
      "The core idea is shared: both make focus tangible with a Pomodoro-style timer. Forest grows a tree; Undistracted Me counts down in a fullscreen Focus Mode. The difference is where the focus happens: Forest is a phone app, Undistracted Me is your browser's new tab.",
      "On blocking, Forest's Deep Focus guards the apps on your phone. Undistracted Me blocks distracting websites with the browser's own rules, for a set timer or permanently, and your blocklist never leaves your device.",
      "On price and openness, Forest's free tier is genuinely useful but the extras sit behind Forest Plus. Undistracted Me is entirely free and open source: Pomodoro, ambient rain and white noise, Google Tasks and site blocking all built in, with no account.",
    ],
    whenToChoose:
      "Choose Forest instead if you get distracted on your phone and want its polished tree-growing ritual, or if you specifically want to plant real trees. It's a beautiful app. Choose Undistracted Me if your distractions live in the browser and you want a free, open-source Pomodoro, site blocker and focus new tab in one place.",
  },
  {
    slug: "startme",
    name: "Start.me",
    title: "Start.me Alternative: Free, Open-Source Focus New Tab",
    description:
      "Start.me alternative: Undistracted Me is a free, open-source new tab with a Pomodoro timer, ambient sounds and Google Tasks, no account and no ads.",
    h1: "Start.me alternative",
    subline:
      "A free, open-source start page and focus new tab: Pomodoro, ambient sounds and Google Tasks, no account, no ads.",
    intro: [
      "Start.me is a capable cloud start page: a grid of bookmarks, RSS feeds, notes and widgets that syncs across your devices. It's a solid bookmark manager, and its free tier is generous. Undistracted Me starts from a different question: what if your new tab helped you focus, not just organise links?",
      "The two share a love of widgets, but diverge on the point of the page. Start.me is about collecting and organising everything you visit. Undistracted Me is about doing less, deliberately: a quiet dashboard plus Focus Mode, a Pomodoro timer, ambient sounds and your Google Tasks.",
    ],
    comparison: {
      // [VERIFY] Start.me free = ad-supported, 3 pages; PRO $26/yr per start.me/pricing
      price: "Free (ads, 3 pages); PRO is $26/yr",
      // [VERIFY] A free account is required per start.me onboarding
      account: "Account required",
      // [VERIFY] Start.me is proprietary
      openSource: "No: proprietary",
      // [VERIFY] No Pomodoro or focus timer
      pomodoro: "No",
      // [VERIFY] No ambient-sound feature
      ambient: "No",
      // [VERIFY] Tasks widget is standard; Google Tasks is a PRO widget per start.me/pricing
      tasks: "Tasks widget; Google Tasks on PRO",
      // [VERIFY] 30+ standard widgets, 9 more on PRO per start.me/pricing
      widgets: "30+ standard widgets; 9 more on PRO",
      // [VERIFY] No site-blocking feature
      blocking: "No",
      // [VERIFY] Bookmark save only, no read-it-later text clipper
      clipper: "No text clipper",
    },
    differences: [
      "Start.me's strength is bookmarks: unlimited on the free tier, synced through your account. Undistracted Me treats bookmarks as one quiet widget among many, and keeps everything local with no account at all.",
      "The clearest difference is focus. Start.me has no Pomodoro timer, no Focus Mode and no ambient sounds. Undistracted Me builds the whole page around them, with rain and white noise built in.",
      "On privacy, Start.me runs in the cloud and shows ads on the free plan. Undistracted Me runs offline, stores your settings in your browser and has no ads and no account.",
    ],
    whenToChoose:
      "Choose Start.me instead if you want a cloud-synced bookmark manager and don't mind ads on the free tier, or if organising links across devices is your main goal. Choose Undistracted Me if you want a free, open-source focus new tab with Pomodoro, ambient sounds and Google Tasks and no account or ads.",
  },
  {
    slug: "toby",
    name: "Toby",
    title: "Toby Alternative: Free, Open-Source Focus New Tab",
    description:
      "Toby alternative: Undistracted Me is a free, open-source new tab for managing tabs, staying focused and getting things done: Pomodoro, ambient sounds and Google Tasks, no account.",
    h1: "Toby alternative",
    subline:
      "A free, open-source new tab for tabs, focus and tasks: Pomodoro, ambient sounds and Google Tasks, no account.",
    intro: [
      "Toby turns your new tab into a tidy shelf of saved tabs: collections of cards you can open again later, synced through your Toby account. It's a clean, well-liked tab manager. Undistracted Me takes the same new-tab slot and asks it to do more: manage your attention, not just your tabs.",
      "Where Toby is a tab manager, Undistracted Me is a focus dashboard. Both replace your new tab. Undistracted Me adds a Pomodoro timer, a fullscreen Focus Mode, ambient sounds, Google Tasks and site blocking, all free and open source.",
    ],
    comparison: {
      // [VERIFY] Toby Starter = free up to 60 saved tabs; Productivity $6/mo ($4.50/mo yearly) per gettoby.com/pricing
      price: "Free (60 saved tabs); Productivity from $4.50/mo",
      // [VERIFY] A Toby account is required (Google sign-on) per gettoby.com help
      account: "Account required",
      // [VERIFY] Toby is proprietary
      openSource: "No: proprietary",
      // [VERIFY] No Pomodoro or focus timer
      pomodoro: "No",
      // [VERIFY] No ambient-sound feature
      ambient: "No",
      // [VERIFY] Notes and to-links only, no Google Tasks per gettoby.com/pricing
      tasks: "Notes only; no Google Tasks",
      // [VERIFY] Tab cards and collections, not a widget dashboard
      widgets: "No widget dashboard",
      // [VERIFY] No site-blocking feature
      blocking: "No",
      // [VERIFY] Saves tabs, not read-it-later text
      clipper: "No text clipper",
    },
    differences: [
      "Toby's strength is tab triage: save tabs into collections and reopen them later. Undistracted Me keeps quick links and a bookmarks widget, but its real work is the other direction: closing the distracting tabs, not saving them.",
      "On focus, Toby has no Pomodoro timer, no Focus Mode and no ambient sounds. Undistracted Me is built around them, with site blocking that stops you opening the tab in the first place.",
      "On price and privacy, Toby's free plan caps at 60 saved tabs and needs an account. Undistracted Me is free with no limits, no account and everything stored locally.",
    ],
    whenToChoose:
      "Choose Toby instead if you live in many tabs and want a synced shelf to park them in, and you're happy with an account. Choose Undistracted Me if you want to spend less time in tabs altogether: a free, open-source focus new tab with Pomodoro, ambient sounds, Google Tasks and site blocking.",
  },
  {
    slug: "hamropatro",
    name: "Hamro Patro",
    title: "Hamro Patro Alternative: Nepali Calendar on a Free Focus New Tab",
    description:
      "Hamro Patro alternative: Undistracted Me puts today's Nepali date (aaja kati gate) and a Bikram Sambat calendar on your new tab, plus Pomodoro and site blocking. Free and open source.",
    h1: "Hamro Patro alternative",
    subline:
      "Today's date and a monthly calendar on your new tab: plus Pomodoro, site blocking and quiet widgets, all free and open source.",
    intro: [
      "Hamro Patro is the biggest calendar app in its home market: a super-app that began in 2010 as a simple calendar and grew to bundle news, horoscopes, foreign exchange rates, weather and a notes app. It's genuinely useful and free. Ads show by default, and a small yearly subscription removes them. Undistracted Me starts from a different question: what if today's date lived on the new tab you already open all day, next to your focus tools?",
      "The headline difference is breadth versus focus. Hamro Patro is a super-app: the date plus news, horoscopes, foreign exchange rates, weather and radio, with ads and a small subscription to go ad-free. Undistracted Me is deliberately narrow: today's date and a monthly calendar, then a Pomodoro timer, site blocking and quiet widgets, with no ads and no account.",
    ],
    comparison: {
      // [VERIFY] Free with ads; ~$2.99/yr ($1.99/6mo) removes them per App Store
      price: "Free with ads; ~$2.99/yr removes them",
      // [VERIFY] No account required to use the calendar
      account: "No account required",
      // [VERIFY] Hamro Patro is proprietary, not open source
      openSource: "No: proprietary",
      // [VERIFY] No Pomodoro or focus timer
      pomodoro: "No",
      // [VERIFY] No ambient-sound feature
      ambient: "No",
      // [VERIFY] No site-blocking feature
      blocking: "No",
      // [VERIFY] No read-it-later / web clipper
      clipper: "No",
      // [VERIFY] Notes and reminders built in
      tasks: "Notes and reminders built in",
      // [VERIFY] Feature set per hamropatro.com/apps
      widgets: "Calendar, horoscope, news, foreign exchange, weather, radio, notes",
    },
    differences: [
      "The clearest difference is the job each one does. Hamro Patro is a calendar and news super-app: open it when you want the date, the headlines or a horoscope. Undistracted Me is a new tab, so today's date and a monthly calendar sit next to a Pomodoro timer, site blocking, ambient sounds and your tasks: the page you open a hundred times a day is already useful.",
      "On privacy and price, Undistracted Me is free with no ads and no account, and everything stays in your browser. Hamro Patro is free but shows ads, and removing them needs a small yearly subscription.",
      "On focus, Hamro Patro has no focus tools: no timer, no blocking and no ambient sounds. Undistracted Me is built around them, with a fullscreen Focus Mode and rain and white noise built in.",
    ],
    whenToChoose:
      "Choose Hamro Patro instead if you want a dedicated calendar and news app with horoscopes, foreign exchange rates and radio, and you don't mind ads or a small subscription to remove them. It's the most popular option in its market for good reason. Choose Undistracted Me if you want today's date and a monthly calendar on the new tab you already open, alongside Pomodoro, site blocking and quiet widgets: free, open source, no account.",
    faq: [
      {
        q: "What is the Nepali date today?",
        a: "Undistracted Me shows today's Bikram Sambat (BS) date alongside the Gregorian one, right on your new tab, so the answer to aaja kati gate is always one tab away.",
      },
      {
        q: "Is Undistracted Me a free Hamro Patro alternative?",
        a: "Yes. Undistracted Me is free and open source with no account and no ads. It shows today's date and a monthly calendar on your new tab, plus Pomodoro, site blocking and widgets.",
      },
      {
        q: "What does Hamro Patro have that Undistracted Me does not?",
        a: "Hamro Patro is a full calendar and news super-app with horoscopes, foreign exchange rates, weather and radio. Undistracted Me is a focus new tab: it shows the date and calendar, then adds Pomodoro, site blocking and ambient sounds.",
      },
    ],
  },
  {
    slug: "nepalipatro",
    name: "Nepali Patro",
    title: "Nepali Patro Alternative: Nepali Date & Calendar on a Focus New Tab",
    description:
      "Nepali Patro alternative: Undistracted Me shows today's Nepali date (aaja kati gate) and a Bikram Sambat calendar on your new tab, plus Pomodoro and site blocking. Free and open source.",
    h1: "Nepali Patro alternative",
    subline:
      "Today's date, festivals and holidays on your new tab: plus Pomodoro, site blocking and quiet widgets, all free and open source.",
    intro: [
      "Nepali Patro is a cleaner, calendar-first alternative to the biggest name in its category. It shows today's date, festivals, holidays and a monthly calendar, with a simple My Calendar for saving dates and reminders. It's free, works offline and its fans praise a less cluttered design. Undistracted Me shares the calendar-first instinct, then puts it somewhere more useful.",
      "The headline difference is where the calendar lives. Nepali Patro is a standalone calendar app you open to check today's date, festivals and holidays. Undistracted Me puts the same date and a monthly calendar on the new tab you open all day, next to a Pomodoro timer, site blocking and quiet widgets: no account, no ads, open source.",
    ],
    comparison: {
      // [VERIFY] Free app per Google Play listing
      price: "Free",
      // [VERIFY] No account required
      account: "No account required",
      // [VERIFY] Nepali Patro is proprietary, not open source
      openSource: "No: proprietary",
      // [VERIFY] No Pomodoro or focus timer
      pomodoro: "No",
      // [VERIFY] No ambient-sound feature
      ambient: "No",
      // [VERIFY] No site-blocking feature
      blocking: "No",
      // [VERIFY] No read-it-later / web clipper
      clipper: "No",
      // [VERIFY] My Calendar saves dates with reminders per nepalipatro.com.np
      tasks: "My Calendar dates and reminders",
      // [VERIFY] Feature set per nepalipatro.com.np
      widgets: "Calendar, festivals, holidays, date conversion, more",
    },
    differences: [
      "The clearest difference is the focus. Nepali Patro centres on the calendar: today's date, festivals, holidays and a My Calendar for dates you want to remember. Undistracted Me is a new tab first, so the date and a monthly calendar sit next to a Pomodoro timer, site blocking and your tasks.",
      "On privacy and price both are free with no account. Undistracted Me is also open source, stores everything locally and shows no ads.",
      "On focus, Nepali Patro has no focus tools. Undistracted Me is built around them: a fullscreen Focus Mode, a Pomodoro timer, site blocking and ambient rain and white noise.",
    ],
    whenToChoose:
      "Choose Nepali Patro instead if you want a focused, calendar-first app with a clean design and a place to save dates and reminders. Choose Undistracted Me if you want today's date and a monthly calendar on the new tab you already open, alongside Pomodoro, site blocking and quiet widgets: free, open source, no account.",
    faq: [
      {
        q: "What is the Nepali date today?",
        a: "Undistracted Me shows today's Bikram Sambat (BS) date alongside the Gregorian one on your new tab, so the answer to aaja kati gate is always one tab away.",
      },
      {
        q: "Does Undistracted Me show festivals and holidays?",
        a: "Yes. The calendar widget marks festivals and holidays on the relevant dates, and a full monthly calendar is one click away on the same new tab as your Pomodoro and tasks.",
      },
      {
        q: "Is Undistracted Me a free Nepali Patro alternative?",
        a: "Yes. Undistracted Me is free and open source with no account and no ads. It puts today's date and a monthly calendar on your new tab, plus Pomodoro, site blocking and widgets.",
      },
    ],
  },
  {
    slug: "leechblock",
    name: "LeechBlock NG",
    title: "LeechBlock NG Alternative: A Blocker That Is Also a Focus New Tab",
    description:
      "Looking for a LeechBlock alternative? Undistracted Me pairs a free, open-source site blocker with a full focus new tab: Pomodoro, ambient sounds, Google Tasks and widgets. No account.",
    h1: "LeechBlock NG alternative",
    subline:
      "The same free, open-source blocking spirit as LeechBlock: plus a Pomodoro, ambient sounds and a whole focus new tab.",
    intro: [
      "LeechBlock NG is the free, open-source blocker that power users love: up to 30 block sets, each with its own sites, schedules, time limits and lock-down rules. It has no account and holds a strong rating on the Chrome Web Store. Undistracted Me shares that free, open-source, no-account ethos, then wraps it in a full new-tab page.",
      "The difference is the surface. LeechBlock lives in a toolbar and does blocking only, through a dense options page that rewards patience. Undistracted Me is a new tab: the same blocking engine meets you every time you open a tab, alongside a Pomodoro timer, ambient sounds and your tasks.",
    ],
    comparison: {
      // [VERIFY] Free and open source under MPL-2.0 per proginosko.com/leechblock
      price: "Free: open source (MPL-2.0)",
      // [VERIFY] No account; rules stored in the browser
      account: "No account required",
      // [VERIFY] MPL-2.0 licence
      openSource: "Yes: MPL-2.0",
      // [VERIFY] No Pomodoro or focus timer
      pomodoro: "No",
      // [VERIFY] No ambient-sound feature
      ambient: "No",
      // [VERIFY] Up to 30 block sets with schedules, time limits and lock-down
      blocking: "Yes: schedules, time limits and lock-down",
      // [VERIFY] No read-it-later / web clipper
      clipper: "No",
      // [VERIFY] No task integration
      tasks: "No",
      // [VERIFY] No new-tab dashboard
      widgets: "No new-tab dashboard",
    },
    differences: [
      "On blocking power the two are close. LeechBlock's strength is granular control: up to 30 block sets with schedules, time limits and lock-down. Undistracted Me blocks sites for a set timer or permanently, with a calm countdown interstitial instead of a hard wall.",
      "On privacy and price both are free, open source and account-free, and both keep your blocklist local. LeechBlock's options page is powerful but famously dense; Undistracted Me's settings live in the new tab you already open.",
      "On scope, LeechBlock does blocking only. Undistracted Me adds a Pomodoro timer, ambient rain and white noise, Google Tasks and a rearrangeable widget grid, all open source.",
    ],
    whenToChoose:
      "Choose LeechBlock NG instead if you want maximum granular blocking rules and don't need a Pomodoro, ambient sounds or a new-tab dashboard. It's the power-user pick for good reason. Choose Undistracted Me if you want that same free, open-source blocking as part of a complete focus new tab.",
  },
  {
    slug: "freedom",
    name: "Freedom",
    title: "Freedom Alternative: A Free, Open-Source Focus New Tab",
    description:
      "Freedom alternative: Undistracted Me is a free, open-source new tab with site blocking, a Pomodoro timer, ambient sounds and Google Tasks. No account, no subscription.",
    h1: "Freedom alternative",
    subline:
      "A free, open-source new tab that blocks distractions, times your focus and plays ambient sounds: no subscription.",
    intro: [
      "Freedom is a cross-platform blocker that syncs sessions across Mac, Windows, iOS, Android and Chrome, blocking apps, websites or the entire internet. It has a free tier and a Premium plan at $39.99 a year, with a one-time forever price as an option. Undistracted Me starts from a narrower place: your browser's new tab.",
      "The headline difference is platform and price. Freedom is a subscription that guards every device; Undistracted Me is a free, open-source new tab that guards your browser, with a Pomodoro, ambient sounds and Google Tasks built in and no account.",
    ],
    comparison: {
      // [VERIFY] Free + Premium $39.99/yr or $99.50 forever per freedom.to/premium
      price: "Free tier; Premium $39.99/yr or $99.50 forever",
      // [VERIFY] Account used to sync sessions across devices
      account: "Account for cross-device sync",
      // [VERIFY] Freedom is proprietary, not open source
      openSource: "No: proprietary",
      // [VERIFY] No built-in Pomodoro or focus timer
      pomodoro: "No",
      // [VERIFY] No ambient-sound feature in the blocker
      ambient: "No",
      // [VERIFY] Blocks apps, websites or the whole internet
      blocking: "Yes: apps, sites or the whole internet",
      // [VERIFY] No read-it-later / web clipper
      clipper: "No",
      // [VERIFY] No Google Tasks integration
      tasks: "No Google Tasks",
      // [VERIFY] No new-tab dashboard
      widgets: "No new-tab dashboard",
    },
    differences: [
      "The clearest difference is where the focus happens. Freedom blocks distractions across your computer, phone and tablet at once, synced from one account. Undistracted Me lives in your new tab and blocks distracting websites with the browser's own rules.",
      "On price, Freedom's free tier is useful but the extras sit behind Premium. Undistracted Me is entirely free and open source, with site blocking, a Pomodoro, ambient sounds and Google Tasks all built in and no account.",
      "On scope, Freedom is a dedicated blocker. Undistracted Me is a blocker plus a whole new-tab dashboard: a web clipper, quiet widgets and a fullscreen Focus Mode.",
    ],
    whenToChoose:
      "Choose Freedom instead if you need to block across every device at once and are happy with a subscription. It's the right tool for whole-device focus. Choose Undistracted Me if your distractions live in the browser and you want a free, open-source blocker plus focus tools in one place.",
  },
  {
    slug: "coldturkey",
    name: "Cold Turkey",
    title: "Cold Turkey Alternative: A Free, Open-Source Focus New Tab",
    description:
      "Cold Turkey alternative: Undistracted Me is a free, open-source new tab with site blocking, a Pomodoro timer, ambient sounds and Google Tasks. No account, no lockout.",
    h1: "Cold Turkey alternative",
    subline:
      "A free, open-source new tab that blocks distractions and times your focus: with ambient sounds and Google Tasks built in.",
    intro: [
      "Cold Turkey is the self-described toughest website and app blocker: it blocks distractions like social media, games and YouTube, with a Pro tier that adds schedules and hard lock-downs. Undistracted Me starts from the same promise, block what distracts you, but wraps it in a calmer new tab.",
      "The headline difference is the philosophy. Cold Turkey leans on hard blocks you can't switch off. Undistracted Me blocks for a set timer or permanently with a calm countdown, and pairs it with a Pomodoro, ambient sounds and quiet widgets.",
    ],
    comparison: {
      // [VERIFY] Free tier blocks sites for a set time; Pro adds schedules and lock-down per getcoldturkey.com
      price: "Free tier; Pro for schedules and lock-down",
      // [VERIFY] No account required
      account: "No account required",
      // [VERIFY] Cold Turkey is proprietary, not open source
      openSource: "No: proprietary",
      // [VERIFY] No Pomodoro or focus timer
      pomodoro: "No",
      // [VERIFY] No ambient-sound feature
      ambient: "No",
      // [VERIFY] Blocks apps, websites or the whole internet
      blocking: "Yes: apps, sites or the whole internet",
      // [VERIFY] No read-it-later / web clipper
      clipper: "No",
      // [VERIFY] No Google Tasks integration
      tasks: "No Google Tasks",
      // [VERIFY] No new-tab dashboard
      widgets: "No new-tab dashboard",
    },
    differences: [
      "On blocking, Cold Turkey is built for hard, unbreakable blocks: schedules, lock-downs and the ability to freeze you out. Undistracted Me blocks for a set timer or permanently, with a countdown interstitial that lets you pause with intent.",
      "On price and privacy, Undistracted Me is free and open source with no account, and your blocklist never leaves your device. Cold Turkey is a proprietary desktop app with a paid Pro tier.",
      "On scope, Cold Turkey is a dedicated desktop blocker. Undistracted Me is a blocker plus a whole new-tab page: a Pomodoro timer, ambient sounds, Google Tasks and a rearrangeable widget grid.",
    ],
    whenToChoose:
      "Choose Cold Turkey instead if you want the hardest possible block and don't mind a desktop-only app or paying for Pro. Choose Undistracted Me if you want blocking built into a free, open-source focus new tab, with a Pomodoro and ambient sounds alongside it.",
  },
];

export function getAlternative(slug) {
  return alternatives.find((a) => a.slug === slug);
}
