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
        sameAs: [site.author.url],
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
        sameAs: [site.githubUrl, site.chromeUrl, site.firefoxUrl],
        founder: { "@id": `${site.url}/#author` },
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
        applicationCategory: "BrowserApplication",
        operatingSystem: "Chrome, Firefox, Web",
        url: site.url,
        softwareVersion: "4.0.0",
        license: "https://opensource.org/licenses/MIT",
        isAccessibleForFree: true,
        inLanguage: "en",
        keywords:
          "nepali calendar, bikram sambat, nepali date, new tab extension, chrome extension, firefox addon, focus mode, distraction free, nepali patro",
        featureList: widgets.map((w) => w.title),
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
    ],
  };
}
