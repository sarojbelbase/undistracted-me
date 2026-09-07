/**
 * Tests for shorthandFromUrl in src/utilities/index.js
 *
 * Covers:
 *  - stripping `www` (existing behaviour)
 *  - skipping generic subdomains (`app`, `web`, `m`, `login`, …) so the label
 *    reflects the actual service, e.g. app.rigohr.com → "Rigohr"
 *  - keeping meaningful first labels (`mail`, `docs`)
 *  - NOT skipping a generic label when it is the registrable domain itself
 *    (app.com → "App")
 *  - fallback for non-URL input
 */

import { describe, it, expect } from 'vitest';
import { shorthandFromUrl } from '../../../src/utilities/index';

describe('shorthandFromUrl', () => {
  it('strips www', () => {
    expect(shorthandFromUrl('https://www.github.com/saroj')).toBe('Github');
  });

  it('skips the generic `app` subdomain', () => {
    expect(shorthandFromUrl('https://app.rigohr.com/')).toBe('Rigohr');
  });

  it('skips other generic subdomains', () => {
    expect(shorthandFromUrl('https://web.whatsapp.com/')).toBe('Whatsapp');
    expect(shorthandFromUrl('https://m.facebook.com/')).toBe('Facebook');
    expect(shorthandFromUrl('https://login.example.com/')).toBe('Example');
    expect(shorthandFromUrl('https://auth.example.com/')).toBe('Example');
    expect(shorthandFromUrl('https://secure.bank.com/')).toBe('Bank');
  });

  it('keeps meaningful first labels', () => {
    expect(shorthandFromUrl('https://mail.google.com/')).toBe('Mail');
    expect(shorthandFromUrl('https://docs.google.com/')).toBe('Docs');
  });

  it('keeps a generic label when it is the domain itself', () => {
    expect(shorthandFromUrl('https://app.com/')).toBe('App');
    expect(shorthandFromUrl('https://www.app.com/')).toBe('App');
  });

  it('handles multi-level TLDs', () => {
    expect(shorthandFromUrl('https://www.example.co.uk/')).toBe('Example');
    expect(shorthandFromUrl('https://app.example.co.uk/')).toBe('Example');
  });

  it('falls back to the first character for non-URL input', () => {
    expect(shorthandFromUrl('not-a-url')).toBe('N');
    expect(shorthandFromUrl('')).toBe('?');
  });
});
