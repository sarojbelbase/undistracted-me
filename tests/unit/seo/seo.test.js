import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSchemaGraph, injectSeo } from '../../../scripts/seo.mjs';

// Tests run from the repo root (see `test:unit` in package.json), so cwd is
// reliable. `import.meta.url` is not a `file:` URL under Vitest's jsdom env.
const repoRoot = process.cwd();
const read = (p) => readFileSync(join(repoRoot, p), 'utf8');

describe('app.undistracted.me agent-readiness (SEO)', () => {
  describe('scripts/seo.mjs', () => {
    const graph = buildSchemaGraph();
    const org = graph['@graph'].find((n) => n['@type'] === 'Organization');
    const person = graph['@graph'].find((n) => n['@type'] === 'Person');
    const faq = graph['@graph'].find((n) => n['@type'] === 'FAQPage');

    it('emits entity identity + content schema types', () => {
      const types = graph['@graph'].map((n) => n['@type']);
      expect(types).toEqual(
        expect.arrayContaining([
          'Person',
          'Organization',
          'WebSite',
          'WebApplication',
          'FAQPage',
        ]),
      );
    });

    it('Organization carries identity + completeness fields', () => {
      expect(org.name).toBe('Undistracted Me');
      expect(org.url).toBe('https://app.undistracted.me');
      expect(org.logo).toMatch(/favicon\.png$/);
      expect(org.image).toBe('https://app.undistracted.me/og.png');
      expect(org.contactPoint).toMatchObject({
        '@type': 'ContactPoint',
        email: 'hello@undistracted.me',
      });
    });

    it('Organization links 3+ authoritative profiles via sameAs', () => {
      expect(org.sameAs.length).toBeGreaterThanOrEqual(3);
      expect(org.sameAs).toContain('https://github.com/sarojbelbase/undistracted-me');
      expect(org.sameAs).toContain('https://github.com/sarojbelbase');
      expect(org.sameAs).toContain('https://linkedin.com/in/sarojbelbase');
      expect(org.sameAs).toContain('https://twitter.com/whoisevensaroj');
      expect(org.sameAs).toContain('https://instagram.com/whoisevensaroj');
      expect(org.sameAs).toContain('https://www.youtube.com/@whoevenissaroj');
      expect(org.sameAs).toContain('https://sarojbelbase.com.np/');
      expect(org.sameAs.some((u) => u.includes('linkedin.com'))).toBe(true);
    });

    it('Person links its own social profiles via sameAs', () => {
      expect(person.sameAs).toContain('https://github.com/sarojbelbase');
      expect(person.sameAs).toContain('https://linkedin.com/in/sarojbelbase');
      expect(person.sameAs).toContain('https://twitter.com/whoisevensaroj');
    });

    it('FAQPage exposes answer content', () => {
      expect(faq.mainEntity.length).toBeGreaterThanOrEqual(3);
      expect(faq.mainEntity[0]).toMatchObject({ '@type': 'Question' });
    });

    it('injectSeo inserts parseable JSON-LD exactly once and is idempotent', () => {
      const html =
        '<!DOCTYPE html><html><head><title>x</title></head><body></body></html>';
      const out = injectSeo(html);
      expect(out).toContain('application/ld+json');
      expect((out.match(/application\/ld\+json/g) || []).length).toBe(1);
      expect(injectSeo(out)).toBe(out);

      const jsonText = out.match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )[1];
      const parsed = JSON.parse(jsonText);
      expect(parsed['@context']).toBe('https://schema.org');
    });
  });

  describe('public/ machine-readable files', () => {
    it('sitemap.xml lists the homepage with a lastmod date', () => {
      const xml = read('public/sitemap.xml');
      expect(xml).toContain('<urlset');
      expect(xml).toContain('<loc>https://app.undistracted.me/</loc>');
      expect(xml).toContain('<lastmod>');
    });

    it('robots.txt points to the sitemap', () => {
      const txt = read('public/robots.txt');
      expect(txt).toContain('User-agent: *');
      expect(txt).toContain('Sitemap: https://app.undistracted.me/sitemap.xml');
    });

    it('llms.txt leads with H1, blockquote, then ## sections of links', () => {
      const txt = read('public/llms.txt');
      expect(txt.startsWith('# ')).toBe(true);
      expect(txt).toContain('> ');
      expect(txt).toContain('## ');
      expect(txt).toMatch(/\[[^\]]+\]\(https?:\/\//);
    });

    it('404.html is agent-friendly and links sitemap + llms.txt', () => {
      const html = read('public/404.html');
      expect(html).toContain('<h1>');
      expect(html).toContain('/sitemap.xml');
      expect(html).toContain('/llms.txt');
      expect(html).toContain('noindex');
    });

    it('og.png is a committed 1200x630 PNG for social sharing', () => {
      const png = readFileSync(join(repoRoot, 'public/og.png'));
      const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      expect(png.subarray(0, 8).equals(sig)).toBe(true);
      expect(png.readUInt32BE(16)).toBe(1200); // IHDR width
      expect(png.readUInt32BE(20)).toBe(630); // IHDR height
    });
  });

  describe('entries/index.html (shared home page)', () => {
    const html = read('entries/index.html');

    it('has exactly one H1 plus nav/main/footer landmarks', () => {
      expect((html.match(/<h1\b/g) || []).length).toBe(1);
      expect(html).toContain('<nav');
      expect(html).toContain('<main');
      expect(html).toContain('<footer');
    });

    it('has canonical + Open Graph + Twitter meta tags', () => {
      expect(html).toContain(
        '<link rel="canonical" href="https://app.undistracted.me/"',
      );
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('name="twitter:card"');
      expect(html).toContain(
        'content="https://app.undistracted.me/og.png"',
      );
    });

    it('contains no inline JSON-LD (injected at deploy time only)', () => {
      expect(html).not.toContain('application/ld+json');
    });
  });
});
