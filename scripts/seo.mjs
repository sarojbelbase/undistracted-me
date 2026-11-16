// SEO data + schema.org JSON-LD graph + HTML injection for the web app
// (https://app.undistracted.me).
//
// The extension build shares entries/index.html and its CSP
// (`script-src 'self'`) blocks inline scripts, so JSON-LD is injected ONLY at
// web-app deploy time via scripts/inject-seo.mjs — never into the shared HTML.

const BASE_URL = 'https://app.undistracted.me';
const LANDING_URL = 'https://undistracted.me';

export const APP_SEO = {
  name: 'Undistracted Me',
  url: BASE_URL,
  description:
    'Undistracted Me is a free, open-source new tab for Chrome and Firefox: a calm dashboard with a Nepali calendar, Focus Mode and quiet widgets. Works offline.',
  author: {
    name: 'Saroj Belbase',
    url: 'https://github.com/sarojbelbase',
  },
  logo: `${LANDING_URL}/favicon.png`,
  email: 'hello@undistracted.me',
  githubUrl: 'https://github.com/sarojbelbase/undistracted-me',
  chromeUrl:
    'https://chromewebstore.google.com/detail/undistracted-me/dfgbijakkhepoonhaelocdmcleeehmef',
  firefoxUrl:
    'https://addons.mozilla.org/en-US/firefox/addon/undistracted-me/',
  redditUrl:
    'https://www.reddit.com/r/Nepal/comments/ggyzev/undistracted_me_a_nepali_extension_for_your/',
  linkedinPosts: [
    'https://www.linkedin.com/posts/sarojbelbase_undistractedme-madeinnepal-chromeextension-ugcPost-7294304729004703744-k1tI',
    'https://www.linkedin.com/posts/sarojbelbase_chromestore-share-6667725433678778368-c04V',
    'https://www.linkedin.com/posts/sarojbelbase_firefox-chrome-share-6665168217478168576-BuQo',
  ],
  profiles: [
    'https://github.com/sarojbelbase',
    'https://linkedin.com/in/sarojbelbase',
    'https://twitter.com/whoisevensaroj',
    'https://instagram.com/whoisevensaroj',
    'https://www.youtube.com/@whoevenissaroj',
    'https://sarojbelbase.com.np/',
  ],
  image: `${BASE_URL}/og.png`,
  softwareVersion: '4.0.2',
  lastModified: '2026-11-16',
};

export function buildSchemaGraph() {
  const s = APP_SEO;
  const sameAs = Array.from(
    new Set([
      s.githubUrl,
      s.author.url,
      ...s.profiles,
      s.chromeUrl,
      s.firefoxUrl,
      s.redditUrl,
      ...s.linkedinPosts,
    ]),
  );
  const authorSameAs = Array.from(
    new Set([s.author.url, ...s.profiles, ...s.linkedinPosts]),
  );

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${s.url}/#author`,
        name: s.author.name,
        url: s.author.url,
        sameAs: authorSameAs,
        jobTitle: 'Creator',
      },
      {
        '@type': 'Organization',
        '@id': `${s.url}/#org`,
        name: s.name,
        url: s.url,
        logo: s.logo,
        image: s.image,
        description: s.description,
        email: s.email,
        contactPoint: {
          '@type': 'ContactPoint',
          email: s.email,
          contactType: 'customer support',
        },
        founder: { '@id': `${s.url}/#author` },
        sameAs,
      },
      {
        '@type': 'WebSite',
        '@id': `${s.url}/#website`,
        name: s.name,
        url: s.url,
        image: s.image,
        description: s.description,
        publisher: { '@id': `${s.url}/#org` },
        inLanguage: 'en',
      },
      {
        '@type': 'WebApplication',
        '@id': `${s.url}/#app`,
        name: s.name,
        url: s.url,
        description: s.description,
        applicationCategory: 'BrowserApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        softwareVersion: s.softwareVersion,
        license: 'https://opensource.org/licenses/MIT',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@id': `${s.url}/#org` },
      },
      {
        '@type': 'FAQPage',
        '@id': `${s.url}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Is Undistracted Me free?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Undistracted Me is free and open source (MIT). There is no account, no subscription, and no sign-up.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does Undistracted Me work offline?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. The Nepali calendar, Focus Mode clock, and dashboard all work fully offline. Only optional widgets like weather, stocks, and RSS need a connection.',
            },
          },
          {
            '@type': 'Question',
            name: 'What data does Undistracted Me collect?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Nothing is sent to our servers unless you connect an optional integration. Your settings, widgets, and layout stay in your browser.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do I install Undistracted Me?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Add it from the Chrome Web Store or Firefox Add-ons, or open the web app at https://app.undistracted.me.',
            },
          },
        ],
      },
    ],
  };
}

/**
 * Inject the JSON-LD graph into an HTML string, right before `</head>`.
 * Idempotent: returns the input unchanged if JSON-LD is already present.
 * `<` is escaped as `\u003c` so the script body can never break out of the tag.
 */
export function injectSeo(html) {
  if (typeof html !== 'string') {
    throw new TypeError('injectSeo: html must be a string');
  }
  if (!html.includes('</head>')) {
    throw new Error('injectSeo: could not find </head> in html');
  }
  if (html.includes('application/ld+json')) {
    return html;
  }
  const json = JSON.stringify(buildSchemaGraph()).replace(/</g, '\\u003c');
  const tag = `<script type="application/ld+json">${json}</script>`;
  return html.replace('</head>', `${tag}\n  </head>`);
}
