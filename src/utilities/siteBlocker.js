/**
 * Website Blocker — chrome.declarativeNetRequest dynamic rules CRUD.
 *
 * Blocks distracting sites by adding dynamic `declarativeNetRequest` rules.
 * Blocked domains are stored in localStorage (`blocked_sites`) and synced to
 * chrome.declarativeNetRequest dynamic rules (IDs 1000+).
 *
 * Never blocks:
 *   - chrome://, chrome-extension://, edge://, about://, file://
 *   - The extension's own new-tab page
 *   - Localhost
 */

import { isExtension } from './index';

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'blocked_sites';
const RULE_ID_BASE = 1000;

/** Protocols that should never be blocked. */
const NEVER_BLOCK_PROTOCOLS = [
  'chrome:', 'chrome-extension:', 'chrome-extension://',
  'edge:', 'about:', 'file:', 'data:', 'devtools:',
];

/** Domains that should never be blocked. */
const NEVER_BLOCK_DOMAINS = [
  'localhost', '127.0.0.1', '[::1]',
  'undistractedme.sarojbelbase.com.np',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the hostname (domain) from a URL or domain string.
 * Returns null for non-blockable URLs.
 */
export const extractDomain = (urlOrDomain) => {
  if (!urlOrDomain || typeof urlOrDomain !== 'string') return null;

  // Already a bare domain (no protocol)
  if (!urlOrDomain.includes('://') && !urlOrDomain.startsWith('//')) {
    const cleaned = urlOrDomain.replace(/^www\./, '').split('/')[0].split(':')[0].trim().toLowerCase();
    return cleaned || null;
  }

  try {
    const url = new URL(urlOrDomain);
    // Never block special protocols
    if (NEVER_BLOCK_PROTOCOLS.some((p) => url.protocol === p || url.protocol.startsWith(p))) {
      return null;
    }
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    if (NEVER_BLOCK_DOMAINS.includes(hostname)) return null;
    return hostname || null;
  } catch {
    return null;
  }
};

// ── Storage ───────────────────────────────────────────────────────────────────

/** Read the blocked sites list from localStorage. */
const readBlockedSites = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    // Migrate old flat array format ["domain.com"] → [{ domain, blockedUntil }]
    if (data.length > 0 && typeof data[0] === 'string') {
      const migrated = data.map(d => ({ domain: d, blockedUntil: Date.now() + 30 * 60 * 1000 }));
      writeBlockedSites(migrated);
      return migrated;
    }
    return data;
  } catch { return []; }
};

/** Write the blocked sites list to localStorage. */
const writeBlockedSites = (domains) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(domains));
    return true;
  } catch {
    return false;
  }
};

// ── Dynamic Rules ─────────────────────────────────────────────────────────────

/**
 * Build a declarativeNetRequest dynamic rule for a domain.
 * Uses `chrome.runtime.getURL()` for the redirect target (not `extensionPath`)
 * — this is the proven approach from working extensions and Chrome samples.
 */
const buildRule = (domain, ruleId) => {
  const baseUrl = isExtension()
    ? chrome.runtime.getURL('/blocked.html')
    : '/blocked.html';
  // Pass the blocked domain as a query param — DNR strips document.referrer
  const blockedUrl = baseUrl + '?d=' + encodeURIComponent(domain);

  // Use urlFilter — simple, battle-tested, won't match chrome-extension:// URLs.
  // (Previous regexFilter had RE2 "match entire URL" gotchas.)
  return {
    id: ruleId,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { url: blockedUrl },
    },
    condition: {
      urlFilter: `||${domain}/`,
      resourceTypes: ['main_frame'],
    },
  };
};

/**
 * Add dynamic rules for a list of domains.
 * Each domain gets 1 rule ID, starting from RULE_ID_BASE.
 * Uses getDynamicRules() to find only existing blocker rules (no 9000-ID loop).
 */
const updateDynamicRules = async (domains) => {
  if (!isExtension()) return;

  // Only remove rules that actually exist — not all 9000 IDs
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing
    .filter(r => r.id >= RULE_ID_BASE)
    .map(r => r.id);

  const addRules = domains.map((domain, i) =>
    buildRule(domain, RULE_ID_BASE + i),
  );

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });
  } catch (err) {
    console.error('[siteBlocker] Failed to update rules:', err);
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

/** Block a site for a given duration (minutes). Pass -1 for infinite. */
export const blockSite = async (urlOrDomain, durationMinutes = 30) => {
  const domain = extractDomain(urlOrDomain);
  if (!domain) return readBlockedSites();

  const current = readBlockedSites();
  const existing = current.find(s => s.domain === domain);
  const infinite = durationMinutes === -1;
  const totalDurationMs = infinite ? null : durationMinutes * 60 * 1000;
  const blockedUntil = infinite ? null : Date.now() + totalDurationMs;

  const entry = infinite
    ? { domain, infinite: true, blockedUntil: null, totalDurationMs: null }
    : { domain, blockedUntil, totalDurationMs };

  let updated;
  if (existing) {
    updated = current.map(s => s.domain === domain ? { ...s, ...entry } : s);
  } else {
    updated = [...current, entry];
  }
  updated.sort((a, b) => a.domain.localeCompare(b.domain));

  const now = Date.now();
  const active = updated.filter(s => s.infinite || s.blockedUntil > now);
  writeBlockedSites(active);
  await updateDynamicRules(active.map(s => s.domain));

  // Mirror to chrome.storage.local so the service worker can schedule
  // unblock alarms (the SW has no access to localStorage in MV3).
  if (isExtension()) {
    try {
      await chrome.storage.local.set({ blocked_sites: active });
    } catch { /* ignore */ }
  }

  return active;
};

/** Remove a blocked site. Only used internally by alarm expiry. */
export const unblockSite = async (urlOrDomain) => {
  const domain = extractDomain(urlOrDomain);
  if (!domain) return readBlockedSites();
  const updated = readBlockedSites().filter(s => s.domain !== domain);
  writeBlockedSites(updated);
  await updateDynamicRules(updated.map(s => s.domain));

  // Mirror to chrome.storage.local so the SW alarm data stays in sync.
  if (isExtension()) {
    try { await chrome.storage.local.set({ blocked_sites: updated }); } catch { /* ignore */ }
  }

  return updated;
};

/** Check if a URL is currently blocked. */
export const isBlocked = (urlOrDomain) => {
  const domain = extractDomain(urlOrDomain);
  if (!domain) return false;
  const site = readBlockedSites().find(s => s.domain === domain);
  if (!site) return false;
  if (site.infinite) return true;
  return site.blockedUntil > Date.now();
};

/** Get remaining time for a blocked domain (ms). Returns Infinity for infinite blocks, null if not blocked. */
export const getRemainingTime = (urlOrDomain) => {
  const domain = extractDomain(urlOrDomain);
  if (!domain) return null;
  const site = readBlockedSites().find(s => s.domain === domain);
  if (!site) return null;
  if (site.infinite) return Infinity;
  const remaining = site.blockedUntil - Date.now();
  return remaining > 0 ? remaining : null;
};

/** Get the full list of blocked domains with their remaining time. */
export const getBlockedSites = () => {
  const now = Date.now();
  const all = readBlockedSites();
  // Keep infinite entries — blockedUntil is null, and null > now is false
  const active = all.filter(s => s.infinite || s.blockedUntil > now);
  if (active.length !== all.length) {
    writeBlockedSites(active);
  }
  return active;
};

export const canBlock = (urlOrDomain) => extractDomain(urlOrDomain) !== null;

export const importBlockedSites = async (domains, durationMinutes) => {
  const cleaned = domains.map(extractDomain).filter(Boolean);
  const blockedUntil = Date.now() + (durationMinutes || 30) * 60 * 1000;
  const updated = cleaned.map(domain => ({ domain, blockedUntil }));
  writeBlockedSites(updated);
  await updateDynamicRules(cleaned);
  return updated;
};

export const clearBlockedSites = async () => {
  writeBlockedSites([]);
  await updateDynamicRules([]);
  return [];
};

export const initSiteBlocker = async () => {
  if (!isExtension()) return;
  const active = getBlockedSites();
  await updateDynamicRules(active.map(s => s.domain));
};
