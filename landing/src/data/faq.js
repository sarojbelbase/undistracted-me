import { site } from "./site.js";

export const faq = [
  {
    q: "Is Undistracted Me free?",
    a: "Yes — completely free, with no paid tiers, no premium unlock, and no ads. It's also open source under the MIT license, so the whole thing is yours to inspect, fork, and improve.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. The dashboard, notes, to-dos, timer, and Nepali calendar all work without a connection. Only live features like weather, stocks, and Google sync need to be online.",
  },
  {
    q: "What data does it collect?",
    a: `Nothing by default. If you connect Google Calendar, Tasks, or Contacts, that data is read only to display it on your dashboard and stays on your device. We don't run analytics or sell anything. Full details live in the <a href="${site.privacyUrl}">privacy policy</a>.`,
  },
  {
    q: "Does it support Firefox?",
    a: `Yes. Undistracted Me ships for both Chrome and Firefox with the same features, and the same respect for your privacy. Grab it from the <a href="${site.firefoxUrl}" rel="noopener">Firefox Add-ons store</a>.`,
  },
  {
    q: "How do I report a bug or suggest a feature?",
    a: `The easiest way is to <a href="${site.formsUrl}" rel="noopener">report a bug</a> or <a href="${site.formsUrl}" rel="noopener">suggest a feature</a> through the forms, or open an issue on <a href="${site.githubUrl}" rel="noopener">GitHub</a>. We read everything.`,
  },
];
