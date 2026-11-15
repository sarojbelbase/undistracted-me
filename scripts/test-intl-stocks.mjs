#!/usr/bin/env bun
/**
 * Live-API integration test for the international-stocks pipeline.
 *
 * Hits Yahoo Finance directly (the same endpoints the Cloudflare proxy
 * forwards to) and runs the production parsers (`api/stocks/_intl.js`) over
 * the responses, asserting the normalized shape for a spread of ticker
 * formats plus edge cases.
 *
 * Usage:  bun scripts/test-intl-stocks.mjs
 */

import { fetchYahoo, parseYahooChart, parseYahooSearch } from '../api/stocks/_intl.js';

const CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const SEARCH_BASE = 'https://query1.finance.yahoo.com/v1/finance/search';

// [symbol, note]
const CHART_SYMBOLS = [
  ['AAPL', 'US NASDAQ'],
  ['TSLA', 'US NASDAQ'],
  ['MSFT', 'US NASDAQ'],
  ['NVDA', 'US NASDAQ'],
  ['BRK-B', 'hyphenated class share'],
  ['VOW3.DE', 'German exchange suffix'],
  ['0700.HK', 'HK ticker w/ leading zero'],
  ['ZZZZZZZZZZ', 'invalid ticker (expect null)'],
];

// [query, expected symbol prefix]
const SEARCH_QUERIES = [
  ['apple', 'AAPL'],
  ['microsoft', 'MSFT'],
  ['volkswagen', 'VOW'],
  ['tata', 'TATA'],
];

let failures = 0;

// ── Chart ──────────────────────────────────────────────────────────────────────
console.log('\n── Yahoo chart (parseYahooChart) ──');
for (const [sym, note] of CHART_SYMBOLS) {
  const url = `${CHART_BASE}${encodeURIComponent(sym)}?range=3mo&interval=1d`;
  try {
    const res = await fetchYahoo(url);
    const json = await res.json();
    const data = parseYahooChart(json);
    if (sym === 'ZZZZZZZZZZ') {
      if (data === null) console.log(`  ✅ ${sym} (${note}) → null as expected`);
      else { console.error(`  ❌ ${sym} (${note}) → expected null, got ${JSON.stringify(data).slice(0, 80)}`); failures++; }
    } else {
      const valid = !!data
        && Array.isArray(data.prices) && data.prices.length >= 2
        && typeof data.ltp === 'number'
        && typeof data.prevClose === 'number'
        && data.open != null && data.high != null && data.low != null;
      if (valid) console.log(`  ✅ ${sym} (${note}) → ltp=${data.ltp}, prevClose=${data.prevClose}, ${data.prices.length} candles`);
      else { console.error(`  ❌ ${sym} (${note}) → invalid: ${JSON.stringify(data).slice(0, 80)}`); failures++; }
    }
  } catch (err) {
    console.error(`  ❌ ${sym} (${note}) → threw: ${err.message}`);
    failures++;
  }
}

// ── Search ────────────────────────────────────────────────────────────────────
console.log('\n── Yahoo search (parseYahooSearch) ──');
for (const [q, expectPrefix] of SEARCH_QUERIES) {
  const url = `${SEARCH_BASE}?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0`;
  try {
    const res = await fetchYahoo(url);
    const json = await res.json();
    const quotes = parseYahooSearch(json);
    const symbols = quotes.map((x) => x.symbol);
    const found = symbols.some((s) => s === expectPrefix || s.startsWith(expectPrefix));
    console.log(`  ${found ? '✅' : '❌'} "${q}" → [${symbols.slice(0, 6).join(', ')}${quotes.length > 6 ? ', …' : ''}]`);
    if (!found) failures++;
  } catch (err) {
    console.error(`  ❌ "${q}" → threw: ${err.message}`);
    failures++;
  }
}

console.log('');
if (failures === 0) {
  console.log('✅ All international-stocks checks passed.');
  process.exit(0);
} else {
  console.error(`❌ ${failures} check(s) failed.`);
  process.exit(1);
}
