#!/usr/bin/env node
/**
 * RSS feed health check.
 *
 * Fetches every preset feed URL directly (no proxy) and reports which ones
 * are alive and returning valid XML.
 *
 * Usage:
 *   bun run test:feeds
 *   node scripts/test-rss-feeds.mjs
 */

import { PRESET_FEEDS, PRESET_CATEGORIES } from '../src/widgets/rss/feeds.js';

const TIMEOUT_MS = 10_000;
const UA = 'Mozilla/5.0 (compatible; UndistractedMe/1.0)';

// ANSI colour helpers
const green = s => `\x1b[32m${s}\x1b[0m`;
const red = s => `\x1b[31m${s}\x1b[0m`;
const yellow = s => `\x1b[33m${s}\x1b[0m`;
const bold = s => `\x1b[1m${s}\x1b[0m`;
const dim = s => `\x1b[2m${s}\x1b[0m`;

async function checkFeed(feed) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    });
    const ms = Date.now() - start;

    if (!res.ok) {
      return { ...feed, ok: false, status: res.status, ms, reason: `HTTP ${res.status}` };
    }

    const text = await res.text();
    const isXml = text.trimStart().startsWith('<');

    if (!isXml) {
      return { ...feed, ok: false, status: res.status, ms, reason: 'Not XML' };
    }

    return { ...feed, ok: true, status: res.status, ms };
  } catch (err) {
    const ms = Date.now() - start;
    const reason = err.name === 'AbortError' ? `Timed out (>${TIMEOUT_MS}ms)` : err.message;
    return { ...feed, ok: false, status: '—', ms, reason };
  } finally {
    clearTimeout(timer);
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────

console.log(bold('\n  RSS Feed Health Check'));
console.log(dim(`  Checking ${PRESET_FEEDS.length} feeds...\n`));

// Check all feeds concurrently
const results = await Promise.all(PRESET_FEEDS.map(checkFeed));

// Group by category for display
for (const cat of PRESET_CATEGORIES) {
  const group = results.filter(r => r.category === cat.id);
  console.log(bold(`  ── ${cat.label}`));
  for (const r of group) {
    const icon = r.ok ? green('✓') : red('✗');
    const status = String(r.status).padEnd(4);
    const ms = dim(`${r.ms}ms`);
    const name = r.label.padEnd(18);
    const reason = r.ok ? '' : yellow(` ← ${r.reason}`);
    console.log(`  ${icon} ${name} ${status} ${ms}${reason}`);
  }
  console.log();
}

// Summary
const pass = results.filter(r => r.ok);
const fail = results.filter(r => !r.ok);

console.log(bold('  Summary'));
console.log(`  ${green(`${pass.length} passed`)}  ${fail.length ? red(`${fail.length} failed`) : dim('0 failed')}`);

if (fail.length) {
  console.log(bold('\n  Dead feeds (remove or replace in src/widgets/rss/feeds.js):'));
  for (const r of fail) {
    console.log(`  ${red('✗')} ${r.id.padEnd(12)} ${r.label}  ${dim(r.url)}`);
    console.log(`       ${yellow(r.reason)}`);
  }
}

console.log();
process.exit(fail.length > 0 ? 1 : 0);
