/**
 * Google Fitness REST API helpers.
 *
 * All three metrics share one aggregation helper.  Data is cached in
 * localStorage for 30 minutes so the widget is instant on re-open and
 * doesn't hammer the quota limit.
 */

const FITNESS_BASE = 'https://www.googleapis.com/fitness/v1/users/me';
const CACHE_KEY    = 'health_widget_cache';
const CACHE_TTL_MS = 30 * 60_000; // 30 min

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayRange() {
  const now = Date.now();
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  return { start: midnight.getTime(), end: now };
}

function sleepRange() {
  // Yesterday noon → today noon — captures a full night regardless of timezone
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return { start: today.getTime() - 86_400_000, end: today.getTime() };
}

// ── Google Fitness aggregate call ─────────────────────────────────────────────

async function aggregate(token, dataTypeName, startMs, endMs) {
  const res = await fetch(`${FITNESS_BASE}/dataset:aggregate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [{ dataTypeName }],
      bucketByTime: { durationMillis: String(endMs - startMs) },
      startTimeMillis: String(startMs),
      endTimeMillis:   String(endMs),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(`Fitness API ${res.status}`), { status: res.status, body: err });
  }
  return res.json();
}

// ── Individual metric fetchers ────────────────────────────────────────────────

export async function fetchSteps(token) {
  const { start, end } = todayRange();
  const data = await aggregate(token, 'com.google.step_count.delta', start, end);
  const points = data.bucket?.[0]?.dataset?.[0]?.point ?? [];
  return points.reduce((sum, p) => sum + (p.value?.[0]?.intVal ?? 0), 0);
}

export async function fetchSleep(token) {
  const { start, end } = sleepRange();
  const data = await aggregate(token, 'com.google.sleep.segment', start, end);
  // Sleep types counted as actual sleep (skip awake=1 and out_of_bed=3)
  const SLEEP_TYPES = new Set([2, 4, 5, 6]);
  const points = data.bucket?.[0]?.dataset?.[0]?.point ?? [];
  let totalMs = 0;
  for (const p of points) {
    if (!SLEEP_TYPES.has(p.value?.[0]?.intVal)) continue;
    // Timestamps are nanoseconds strings — use BigInt to avoid precision loss
    totalMs += Number(
      (BigInt(p.endTimeNanos) - BigInt(p.startTimeNanos)) / BigInt(1_000_000),
    );
  }
  return Math.round(totalMs / 60_000); // minutes
}

export async function fetchWorkout(token) {
  const { start, end } = todayRange();
  const data = await aggregate(token, 'com.google.active_minutes', start, end);
  const points = data.bucket?.[0]?.dataset?.[0]?.point ?? [];
  return points.reduce((sum, p) => sum + (p.value?.[0]?.intVal ?? 0), 0);
}

// ── Cache ─────────────────────────────────────────────────────────────────────

export function readHealthCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
}

export function writeHealthCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* ignore quota errors */ }
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatSteps(n) {
  if (n == null) return { value: '—', unit: 'steps' };
  return { value: n.toLocaleString(), unit: 'steps' };
}

export function formatSleep(minutes) {
  if (!minutes) return { value: '—', unit: 'sleep' };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const value = h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
  return { value, unit: 'sleep' };
}

export function formatWorkout(minutes) {
  if (!minutes) return { value: '—', unit: 'active' };
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return { value: m === 0 ? `${h}h` : `${h}h ${m}m`, unit: 'active' };
  }
  return { value: String(minutes), unit: 'min active' };
}
