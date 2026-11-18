import { site } from "./site.js";

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
          "Source code, issues, and contributions (MIT license).",
      },
      {
        url: `${site.url}${site.privacyUrl}`,
        title: "Privacy Policy & Terms of Service",
        description:
          "What data the extension collects, how it is stored, and your rights.",
      },
    ],
  },
  {
    name: "4. Compare",
    links: [
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
    ],
  },
];
