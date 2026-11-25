import { site } from "./site.js";

/**
 * Blog data: categories + posts. Content is a list of blocks so the same data
 * renders both the HTML page and the markdown alternate for AI crawlers.
 *
 * Block shapes:
 *   { h: "Heading" }
 *   { p: "Paragraph" }
 *   { ul: ["item", ...] }
 *   { cta: true }   // "recommend Undistracted Me" block at the end
 *
 * Posts are written for people first (real, specific, honest) and recommend
 * Undistracted Me where it genuinely fits, like a big product owner would.
 */

export const blogCategories = [
  { slug: "nepali-calendar", name: "Nepali Calendar" },
  { slug: "comparison", name: "Comparison" },
  { slug: "made-in-nepal", name: "Made in Nepal" },
  { slug: "focus", name: "Focus & Productivity" },
];

export const blogPosts = [
  {
    slug: "nepali-date-today-aaja-kati-gate",
    title: "Nepali Date Today: What Is Aaja Kati Gate?",
    description:
      "Aaja kati gate means what is today's date in Nepali. Here is how the Bikram Sambat calendar works, its 12 months, why it matters and the fastest way to see today's Nepali date.",
    category: "nepali-calendar",
    date: "2026-11-25",
    tags: ["nepali date today", "aaja kati gate", "bikram sambat", "nepali calendar"],
    content: [
      {
        p: "Ask a Nepali person what time it is and they will often answer twice: once in the Gregorian calendar, and once in Bikram Sambat. The question everyone searches for is aaja kati gate, literally what is today's date. This post answers it and explains the calendar behind it.",
      },
      {
        h: "What does aaja kati gate mean?",
        p: "Aaja kati gate (आज कति गते) is Nepali for what is today's date. It is typed into search engines every single day, mostly by Nepalis living abroad who have lost track of the Nepali date while their home country runs a different calendar.",
      },
      {
        h: "What is Bikram Sambat?",
        p: "Bikram Sambat (BS) is the official calendar of Nepal. It runs roughly 56 years and 8 months ahead of the Gregorian calendar, so the Nepali year 2083 begins in mid-April 2026. It has 12 months and is the calendar that sets Nepal's festivals, public holidays and official documents.",
      },
      {
        h: "The 12 Nepali months",
        ul: [
          "Baishakh (mid-April to mid-May)",
          "Jestha (mid-May to mid-June)",
          "Ashadh (mid-June to mid-July)",
          "Shrawan (mid-July to mid-August)",
          "Bhadra (mid-August to mid-September)",
          "Ashwin (mid-September to mid-October)",
          "Kartik (mid-October to mid-November)",
          "Mangsir (mid-November to mid-December)",
          "Poush (mid-December to mid-January)",
          "Magh (mid-January to mid-February)",
          "Falgun (mid-February to mid-March)",
          "Chaitra (mid-March to mid-April)",
        ],
      },
      {
        h: "Why the Nepali date matters",
        p: "Dashain, Tihar and nearly every festival fall on a Bikram Sambat date, not a Gregorian one. Official documents, school terms and business deadlines in Nepal all use it too. If you celebrate Nepali festivals, you need the Nepali date.",
      },
      {
        h: "The fastest way to see today's Nepali date",
        p: "You can open a calendar website, check a phone app, or ask someone. But the fastest way is to make the answer show up on its own: a new tab that displays the Bikram Sambat date and a full monthly calendar every time you open a tab.",
      },
      { cta: true },
    ],
  },
  {
    slug: "best-nepali-calendar-apps-extensions",
    title: "Best Nepali Calendar Apps and Extensions in 2026",
    description:
      "Hamro Patro, Nepali Patro, Tabre, Miti and Namaskar all show the Nepali date, but they differ a lot. Here is an honest comparison of the best Nepali calendar apps and browser extensions in 2026.",
    category: "comparison",
    date: "2026-11-25",
    tags: ["nepali calendar", "nepali patro", "best nepali calendar", "nepali calendar extension"],
    content: [
      {
        p: "There are now more ways to see the Nepali date than ever, and the choice is genuinely confusing: some are full super-apps, some are calendars and some live on your new tab. Here is an honest look at the main ones, with a recommendation at the end.",
      },
      {
        h: "Hamro Patro: the super-app",
        p: "Hamro Patro is the biggest of them all, with more than ten million downloads. It began in 2010 as a calendar and grew into a super-app that bundles news, horoscopes, foreign exchange rates, weather and a notes app. It is free with ads, and a small yearly subscription removes them. Choose it if you want everything in one app and don't mind the ads.",
      },
      {
        h: "Nepali Patro: calendar first",
        p: "Nepali Patro is a cleaner, calendar-focused alternative. It shows today's date, festivals and holidays, with a simple My Calendar for saving your own dates and reminders. Its fans praise a less cluttered design. Choose it if you want a focused calendar and not a super-app.",
      },
      {
        h: "Tabre, Miti and Namaskar: the new-tab calendars",
        p: "A newer wave of extensions puts the Nepali date on your browser's new tab. Tabre turns the new tab into a Nepali calendar dashboard, Miti builds a workspace around the calendar, and Namaskar pairs the date with a landscape photo of Nepal. All three are solid if all you want is the date.",
      },
      {
        h: "Undistracted Me: the calendar plus the focus tools",
        p: "Undistracted Me shows the same Bikram Sambat date and a monthly calendar on your new tab, then adds what none of the others have: a site blocker, a Pomodoro timer, ambient sounds and a grid of quiet widgets. It is free, open source and works offline with no account. If the calendar is one part of how you want your new tab to work, this is the one that does both.",
      },
      {
        h: "The honest summary",
        ul: [
          "Hamro Patro: the all-in-one super-app, if you want news and horoscopes too.",
          "Nepali Patro: the clean, calendar-first app.",
          "Tabre, Miti, Namaskar: the date on your new tab, and little else.",
          "Undistracted Me: the date on your new tab plus a blocker, Pomodoro and widgets.",
        ],
      },
      { cta: true },
    ],
  },
  {
    slug: "best-nepali-chrome-extensions",
    title: "Best Nepali Chrome Extensions in 2026",
    description:
      "A short, honest list of the best Chrome extensions made by Nepali developers: Nepali calendar new tabs, typing tools and the Hamro Patro extension, with what each is best for.",
    category: "made-in-nepal",
    date: "2026-11-25",
    tags: ["nepali extension", "nepali chrome extension", "made in nepal", "best nepali extension"],
    content: [
      {
        p: "Nepali developers have quietly built a small but useful set of Chrome extensions. If you want the Nepali date, Nepali typing or Nepali news in your browser, these are the ones worth knowing.",
      },
      {
        h: "Nepali calendar new tabs",
        p: "Tabre, Miti and Namaskar each replace the new tab with a Nepali calendar: today's Bikram Sambat date, tithi, festivals and sometimes weather. They are the simple, calendar-only option.",
      },
      {
        h: "Hamro Patro's extension",
        p: "Hamro Patro now has its own Chrome extension that puts Nepali dates, festivals, news, rashifal and market rates one click away, straight from the biggest name in Nepali calendars.",
      },
      {
        h: "Nepali typing extensions",
        p: "If you type in Nepali, there are extensions for that too, including ones that convert between Preeti and Unicode. They are a different niche from the calendar, but part of the same made-in-Nepal ecosystem.",
      },
      {
        h: "Undistracted Me: the focus extension built in Nepal",
        p: "Undistracted Me started as a Nepali date new tab and grew into a full focus new tab. It shows the Bikram Sambat date and a monthly calendar, then adds a site blocker, a Pomodoro timer, ambient sounds and quiet widgets, all free and open source. It is the one that pairs the Nepali date with the tools for deep work.",
      },
      {
        h: "The honest summary",
        ul: [
          "Calendar only: Tabre, Miti, Namaskar.",
          "News and dates: Hamro Patro extension.",
          "Typing: Preeti and Unicode converters.",
          "Calendar plus focus: Undistracted Me.",
        ],
      },
      { cta: true },
    ],
  },
  {
    slug: "best-focus-new-tab-extensions",
    title: "The Best Focus New Tab Extensions in 2026",
    description:
      "Momentum, Tabliss, Bonjourr and Undistracted Me each replace your new tab with something calmer. Here is how they compare on price, openness and the focus tools you actually get.",
    category: "focus",
    date: "2026-11-25",
    tags: ["best focus new tab", "focus new tab extension", "site blocker", "pomodoro extension"],
    content: [
      {
        p: "A focus new tab is a new-tab page built to help you work, not distract you. The big names are Momentum, Tabliss and Bonjourr, and they differ more than their calm screenshots suggest. Here is the honest comparison.",
      },
      {
        h: "Momentum: polished, with a paid tier",
        p: "Momentum is the most popular: a daily photo, a quote and a to-do list. The catch is that its focus tools, the Pomodoro timer and soundscapes, sit behind Momentum Plus, a paid subscription. The free tier is lovely but limited.",
      },
      {
        h: "Tabliss: minimal and free",
        p: "Tabliss is free and open source with no account. It is a blank canvas you fill with widgets, and it is genuinely good, but it has no Pomodoro timer, no ambient sounds and no site blocking.",
      },
      {
        h: "Bonjourr: calm, with a Pomodoro",
        p: "Bonjourr is free, donation-funded and open source, with a built-in Pomodoro timer. It is deliberately small, so there are no ambient sounds, no site blocking and no Google Tasks.",
      },
      {
        h: "Undistracted Me: the blocker plus the timer",
        p: "Undistracted Me bundles the focus tools the others split across paid tiers or leave out: a site blocker, a fullscreen Pomodoro timer, ambient rain and white noise, Google Tasks and a grid of quiet widgets, including a Nepali calendar. Everything is free and open source with no account.",
      },
      {
        h: "The honest summary",
        ul: [
          "Momentum: best for a daily photo, but focus tools are paid.",
          "Tabliss: best for a minimal, do-it-yourself widget grid.",
          "Bonjourr: best for a calm photo plus a free Pomodoro.",
          "Undistracted Me: best for blocking plus a Pomodoro, sounds and widgets, all free.",
        ],
      },
      { cta: true },
    ],
  },
  {
    slug: "made-in-nepal-apps-extensions",
    title: "Made in Nepal: Apps and Extensions by Nepali Developers",
    description:
      "A list of the best apps and browser extensions built by Nepali developers: Hamro Patro, Nepali Patro, eSewa, Khalti, Tabre, Miti and Undistracted Me, with what each is best for.",
    category: "made-in-nepal",
    date: "2026-11-25",
    tags: ["made in nepal", "nepali apps", "nepali developers", "nepali extension"],
    content: [
      {
        p: "Nepal's developer scene has quietly shipped some of the most-used software in the country: digital wallets, calendars and a growing set of browser extensions. Here is an honest list of the ones worth knowing, and what each is best for.",
      },
      {
        h: "The giants: Hamro Patro, eSewa and Khalti",
        p: "Hamro Patro is the most-downloaded Nepali app, with more than ten million installs. It began as a calendar and grew into a super-app with news, horoscopes, foreign exchange and weather. eSewa and Khalti are the digital-wallet giants that let Nepalis pay bills and send money from a phone. These are the household names.",
      },
      {
        h: "The calendar apps and new tabs",
        p: "Nepali Patro is the clean, calendar-first alternative to Hamro Patro. A newer wave of browser extensions, Tabre, Miti and Namaskar, puts the Nepali date on your new tab. All of them are solid if all you want is the date.",
      },
      {
        h: "The focus extension built in Nepal",
        p: "Undistracted Me is a focus new tab that started as a Nepali date extension and grew into a full productivity tool: a Bikram Sambat calendar, a site blocker, a Pomodoro timer, ambient sounds and quiet widgets, all free and open source with no account. It is the one that pairs the Nepali date with the tools for deep work.",
      },
      {
        h: "Typing and other tools",
        p: "For Nepali typing, there are Unicode and Preeti converters, keyboards and fonts. They are a different niche, but part of the same made-in-Nepal ecosystem.",
      },
      {
        h: "The honest summary",
        ul: [
          "Digital wallets: eSewa, Khalti.",
          "Calendar super-app: Hamro Patro.",
          "Calendar only: Nepali Patro, Tabre, Miti, Namaskar.",
          "Typing: Unicode and Preeti tools.",
          "Calendar plus focus: Undistracted Me.",
        ],
      },
      { cta: true },
    ],
  },
];

export function getPost(slug) {
  return blogPosts.find((p) => p.slug === slug);
}

export function getCategory(slug) {
  return blogCategories.find((c) => c.slug === slug);
}
