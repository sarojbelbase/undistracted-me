import { site } from "./site.js";
import { faq } from "./faq.js";
import { widgets } from "./widgets.js";

/**
 * Builds the JSON-LD `@graph` for the landing page.
 *
 * Entities are linked by `@id` (Organization → WebSite → WebPage → app/FAQ),
 * with a Person entity for the author so Google can attribute the project to a
 * real human (E-E-A-T). `featureList` and `keywords` tell search engines and AI
 * agents exactly what the app does in the site's own words.
 */
export function buildSchemaGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${site.url}/#author`,
        name: site.author.name,
        url: site.author.url,
        sameAs: [site.author.url, ...site.social.linkedin],
        jobTitle: "Creator",
        knowsAbout: [
          "Nepali calendar",
          "Bikram Sambat",
          "browser extensions",
          "web development",
        ],
      },
      {
        "@type": "Organization",
        "@id": `${site.url}/#org`,
        name: site.name,
        url: site.url,
        logo: {
          "@type": "ImageObject",
          url: `${site.url}/favicon.png`,
        },
        sameAs: [site.githubUrl, site.chromeUrl, site.firefoxUrl, site.social.reddit],
        founder: { "@id": `${site.url}/#author` },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: site.email,
        },
        address: {
          "@type": "PostalAddress",
          addressCountry: "NP",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        description: site.description,
        inLanguage: "en",
        publisher: { "@id": `${site.url}/#org` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${site.url}/#app`,
        name: site.name,
        description: site.description,
        applicationCategory: "ProductivityApplication",
        operatingSystem: "Chrome, Firefox",
        url: site.url,
        softwareVersion: "4.0.0",
        license: "https://opensource.org/licenses/MIT",
        isAccessibleForFree: true,
        inLanguage: "en",
        keywords:
          "pomodoro, google tasks, ambient sounds, focus timer, nepali calendar, bikram sambat, nepali date, new tab extension, chrome extension, firefox addon, focus mode, distraction free, nepali patro, site blocker, block distracting sites, web clipper, save for later, pocket alternative",
        featureList: [...widgets.map((w) => w.title), "Site blocking", "Web clipper"],
        author: { "@id": `${site.url}/#author` },
        publisher: { "@id": `${site.url}/#org` },
        offers: [
          {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            name: "Chrome extension",
            url: site.chromeUrl,
          },
          {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            name: "Firefox add-on",
            url: site.firefoxUrl,
          },
        ],
        potentialAction: [
          {
            "@type": "DownloadAction",
            name: "Add to Chrome",
            target: { "@type": "EntryPoint", url: site.chromeUrl },
          },
          {
            "@type": "DownloadAction",
            name: "Get it for Firefox",
            target: { "@type": "EntryPoint", url: site.firefoxUrl },
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${site.url}/#webpage`,
        url: site.url,
        name: site.title,
        description: site.description,
        inLanguage: "en",
        isPartOf: { "@id": `${site.url}/#website` },
        about: { "@id": `${site.url}/#app` },
        author: { "@id": `${site.url}/#author` },
        dateModified: site.lastUpdated,
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: site.ogImage,
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${site.url}/#faq`,
        mainEntity: faq.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: {
            "@type": "Answer",
            text: a.replace(/<[^>]*>/g, ""),
          },
        })),
      },
      {
        "@type": "Article",
        "@id": `${site.url}/#story`,
        headline: "Why I built Undistracted Me",
        description:
          "The origin story behind Undistracted Me — a new tab built to quiet the noise.",
        inLanguage: "en",
        author: { "@id": `${site.url}/#author` },
        publisher: { "@id": `${site.url}/#org` },
        datePublished: site.lastUpdated,
        dateModified: site.lastUpdated,
        mainEntityOfPage: { "@id": `${site.url}/#webpage` },
        about: { "@id": `${site.url}/#app` },
        articleBody:
          "I'd open a tab to check one thing. Then the headlines started.\n\nAnd I'd lose track of what I was doing — my context, the thing I sat down to finish, dissolved into everything else on the screen.\n\nHelp turned into weight: every tool meant to lighten the day added one more thing to carry.\n\nSo I built a tab that carries it all, quietly. One place for the clock, the calendar and the few things I need. Nothing to get lost in.",
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${site.url}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: site.url,
          },
        ],
      },
    ],
  };
}
