import { site } from "./site.js";

export const faq = [
  {
    q: "Is Undistracted Me free?",
    a: "Yes, it's free to use today, with no premium unlock and no ads. It's also open source under the MIT license, so the whole thing is yours to inspect, fork and improve. If hosting costs can't be covered it may move to a paid model and early supporters will be contacted and kept free.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. There's no account to sign in to, so install and go. Widgets that pull from the internet, like weather, stocks, news and your Google data, need a connection to refresh.",
  },
  {
    q: "Can it block distracting sites?",
    a: "Yes. Block any site for a set time or permanently, right from Settings. Blocking runs through the browser's own declarative rules, needs no broad \"read all sites\" permission and your blocklist never leaves your device.",
  },
  {
    q: "What is the web clipper?",
    a: "It's a save-for-later tool built into your new tab. Select text on any page, right-click and choose \"Save to Pocket\" and it lands on your new tab: sorted by type and website, with folders, search and offline access. Text only, stored only on your device.",
  },
  {
    q: "What data does it collect?",
    a: "Only anonymous widget-usage analytics: we count which widgets are added and used, with no personal data and no browsing history. Google integrations keep their tokens on your device, not on a server.",
  },
  {
    q: "Does it support Firefox?",
    a: `Yes. Get it from <a href="${site.firefoxUrl}" rel="noopener">Firefox Add-ons</a>, or from the <a href="${site.chromeUrl}" rel="noopener">Chrome Web Store</a> if you use Chrome.`,
  },
  {
    q: "Is it a focus extension, a productivity extension or a deep work tool?",
    a: "All three. It's a focus extension because it blocks distracting sites and gives you a fullscreen Focus Mode with a Pomodoro timer and ambient sounds. It's a productivity extension because your new tab becomes a working surface: tasks, calendar, web clipper and quiet widgets. And it's a deep work tool because that's what those add up to a calm place to start, stay in and finish the work.",
  },
  {
    q: "How do I report a bug or suggest a feature?",
    a: `Use the <a href="${site.formsUrl}" rel="noopener">feedback form</a>. The report-a-bug and suggest-a-feature links in the footer both open it.`,
  },
];
