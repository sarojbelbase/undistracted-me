import { site } from "./site.js";
import { faq } from "./faq.js";

/** Builds the JSON-LD `@graph` for the landing page. */
export function buildSchemaGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#org`,
        name: site.name,
        url: site.url,
        logo: {
          "@type": "ImageObject",
          url: `${site.url}/favicon.png`,
        },
        sameAs: [site.githubUrl],
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        description: site.description,
        publisher: { "@id": `${site.url}/#org` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${site.url}/#app`,
        name: site.name,
        description:
          "A calm, distraction-free new tab dashboard with a Nepali calendar, dual-timezone clock, Focus Mode, ambient rain, and mindful widgets.",
        applicationCategory: "BrowserApplication",
        operatingSystem: "Chrome, Firefox, Web",
        url: site.url,
        softwareVersion: "4.0.0",
        license: "https://opensource.org/licenses/MIT",
        isAccessibleForFree: true,
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
      },
      {
        "@type": "WebPage",
        "@id": `${site.url}/#webpage`,
        url: site.url,
        name: site.title,
        isPartOf: { "@id": `${site.url}/#website` },
        about: { "@id": `${site.url}/#app` },
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
