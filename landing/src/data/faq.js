import { site } from "./site.js";

export const faq = [
  {
    q: "Is Undistracted Me free?",
    a: "Yes, it's free to use today, with no premium unlock and no ads. It's also open source under the MIT license, so the whole thing is yours to inspect, fork and improve. If hosting costs can't be covered it may move to a paid model, and early supporters will be contacted and kept free.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. There's no account to sign in to, so install and go. Widgets that pull from the internet, like weather, stocks, news and your Google data, need a connection to refresh.",
  },
  {
    q: "What data does it collect?",
    a: "None that identifies you: no account, no tracking and no analytics. Google integrations keep their tokens on your device, not on a server.",
  },
  {
    q: "Does it support Firefox?",
    a: `Yes. Get it from <a href="${site.firefoxUrl}" rel="noopener">Firefox Add-ons</a>, or from the <a href="${site.chromeUrl}" rel="noopener">Chrome Web Store</a> if you use Chrome.`,
  },
  {
    q: "How do I report a bug or suggest a feature?",
    a: `Use the <a href="${site.formsUrl}" rel="noopener">feedback form</a>. The report-a-bug and suggest-a-feature links in the footer both open it.`,
  },
];
