import { site } from "./site.js";
import { blogPosts } from "./blog.js";

/**
 * Numbered navigation sections for /llms.txt.
 *
 * The seo-graph `llmsTxt.sections` option renders each section as `## {name}`
 * and each link as `- [{title}]({url}): {description}`. Numbering the names
 * turns the default single "## Pages" list into the navigation-index format
 * agent-readiness checkers expect.
 */
export const llmsSections = [
  {
    name: "1. Product",
    links: [
      {
        url: `${site.url}/`,
        title: "Homepage",
        description: site.description,
      },
      {
        url: `${site.url}/changelogs/`,
        title: "Changelog",
        description:
          "The release history of Undistracted Me, from the first Nepali-calendar new tab in 2020 to the Focus Mode rewrite.",
      },
    ],
  },
  {
    name: "2. Install",
    links: [
      {
        url: site.chromeUrl,
        title: "Chrome Web Store",
        description: "Add Undistracted Me to Chrome.",
      },
      {
        url: site.firefoxUrl,
        title: "Firefox Add-ons",
        description: "Add Undistracted Me to Firefox.",
      },
      {
        url: site.webAppUrl,
        title: "Web app",
        description: "Use Undistracted Me in any browser.",
      },
    ],
  },
  {
    name: "3. Project",
    links: [
      {
        url: site.githubUrl,
        title: "GitHub",
        description:
          "Source code, issues and contributions (MIT license).",
      },
      {
        url: `${site.url}${site.privacyUrl}`,
        title: "Privacy Policy & Terms of Service",
        description:
          "What data the extension collects, how it is stored and your rights.",
      },
    ],
  },
  {
    name: "4. Compare",
    links: [
      {
        url: `${site.url}/compare/`,
        title: "Compare hub",
        description:
          "Every Undistracted Me comparison in one place: Momentum, Tabliss, Bonjourr, BlockSite, StayFocusd, Forest, Start.me, Toby, Hamro Patro and Nepali Patro.",
      },
      {
        url: `${site.url}/blocksite-alternative/`,
        title: "vs BlockSite",
        description:
          "Undistracted Me vs BlockSite: a free, open-source site blocker plus focus new tab.",
      },
      {
        url: `${site.url}/stayfocusd-alternative/`,
        title: "vs StayFocusd",
        description:
          "Undistracted Me vs StayFocusd: free, open-source blocking plus a web clipper and focus tools.",
      },
      {
        url: `${site.url}/momentum-alternative/`,
        title: "vs Momentum",
        description:
          "Undistracted Me vs Momentum: free, open-source focus new tab.",
      },
      {
        url: `${site.url}/tabliss-alternative/`,
        title: "vs Tabliss",
        description:
          "Undistracted Me vs Tabliss: Pomodoro, ambient sounds and Google Tasks built in.",
      },
      {
        url: `${site.url}/bonjourr-alternative/`,
        title: "vs Bonjourr",
        description:
          "Undistracted Me vs Bonjourr: ambient sounds, Google Tasks and a bigger widget grid.",
      },
      {
        url: `${site.url}/forest-alternative/`,
        title: "vs Forest",
        description:
          "Undistracted Me vs Forest: a free, open-source Pomodoro and focus new tab for your browser.",
      },
      {
        url: `${site.url}/startme-alternative/`,
        title: "vs Start.me",
        description:
          "Undistracted Me vs Start.me: a free, open-source focus new tab with no account and no ads.",
      },
      {
        url: `${site.url}/toby-alternative/`,
        title: "vs Toby",
        description:
          "Undistracted Me vs Toby: tab management plus Pomodoro, ambient sounds and Google Tasks.",
      },
      {
        url: `${site.url}/hamropatro-alternative/`,
        title: "vs Hamro Patro",
        description:
          "Undistracted Me vs Hamro Patro: today's Nepali date (aaja kati gate) and a Bikram Sambat calendar on your focus new tab.",
      },
      {
        url: `${site.url}/nepalipatro-alternative/`,
        title: "vs Nepali Patro",
        description:
          "Undistracted Me vs Nepali Patro: a Nepali date and calendar on your new tab, plus Pomodoro, site blocking and widgets.",
      },
      {
        url: `${site.url}/leechblock-alternative/`,
        title: "vs LeechBlock NG",
        description:
          "Undistracted Me vs LeechBlock NG: the same free, open-source blocking plus a Pomodoro, ambient sounds and a focus new tab.",
      },
      {
        url: `${site.url}/freedom-alternative/`,
        title: "vs Freedom",
        description:
          "Undistracted Me vs Freedom: a free, open-source browser blocker and focus new tab, no subscription.",
      },
      {
        url: `${site.url}/coldturkey-alternative/`,
        title: "vs Cold Turkey",
        description:
          "Undistracted Me vs Cold Turkey: free, open-source blocking plus a Pomodoro, ambient sounds and quiet widgets.",
      },
    ],
  },
  {
    name: "5. Blog",
    links: [
      {
        url: `${site.url}/blog/`,
        title: "Blog",
        description:
          "Guides and comparisons on the Nepali date, the Bikram Sambat calendar, the best Nepali extensions and focus new tabs.",
      },
      ...blogPosts.map((p) => ({
        url: `${site.url}/blog/${p.slug}/`,
        title: p.title,
        description: p.description,
      })),
    ],
  },
];
