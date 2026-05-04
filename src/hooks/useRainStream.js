/**
 * useRainStream — chunked ambient audio streamer
 *
 * Streams pre-split WAV segments from Vercel Blob CDN via the Web Audio API
 * scheduler. Each 30-second segment is fetched and decoded ahead of time so
 * the next one is always ready before the current one ends (gapless loop).
 *
 * Crossfade is handled by a master GainNode — the same ease-in-out cubic
 * curve used in the visual icon fade.
 *
 * Usage:
 *   const { toggle, isPlaying } = useRainStream(FADE_DURATION_MS);
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { PRODUCTION_BASE_URL } from "../../constants/env.js";

const RAIN_API_URL = import.meta.env.VITE_RAIN_API_URL
  || `${PRODUCTION_BASE_URL}/api/audio/rain`;
const API_KEY = import.meta.env.VITE_API_KEY || null;

const SEGMENT_DURATION = 30; // seconds
const LOOKAHEAD_S = 1; // start scheduling next segment this many seconds before current ends
const POS_KEY = "rain_seg_pos"; // localStorage key: { idx, offset }

// ── Utility ───────────────────────────────────────────────────────────────────
function loadPos() {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePos(idx, offset) {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify({ idx, offset }));
  } catch { /* ignore */ }
}

// Ease-in-out cubic  t ∈ [0,1]
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useRainStream(fadeDurationMs = 3000) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Long-lived refs — survive re-renders without triggering them
  const ctxRef = useRef(null);       // AudioContext
  const gainRef = useRef(null);      // master GainNode
  const sourceRef = useRef(null);    // current AudioBufferSourceNode
  const nextSourceRef = useRef(null);// pre-scheduled next node
  const cacheRef = useRef(new Map());// segIdx → AudioBuffer (decoded cache)
  const segIdxRef = useRef(0);       // segment currently playing
  const startTimeRef = useRef(0);    // ctx.currentTime when current seg started
  const rafRef = useRef(null);       // rAF for crossfade
  const schedTimerRef = useRef(null);// setTimeout for scheduling next segment
  const segmentsRef = useRef([]);    // Dynamic list of segment URLs

  // ── Fetch manifest ────────────────────────────────────────────────────────
  const ensureSegments = async () => {
    if (segmentsRef.current.length > 0) return segmentsRef.current;
    try {
      const headers = {};
      if (API_KEY) headers['X-Api-Key'] = API_KEY;
      const res = await fetch(RAIN_API_URL, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      if (data.segments && Array.isArray(data.segments)) {
        segmentsRef.current = data.segments;
      }
    } catch {
      // no-op
    }
    return segmentsRef.current;
  };

  // ── Audio context (lazy, created on first user gesture) ──────────────────
  function getCtx() {
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      ctxRef.current = ctx;
      gainRef.current = gain;
    }
    return ctxRef.current;
  }

  // ── Fetch + decode a segment (cached) ────────────────────────────────────
  async function fetchSegment(idx) {
    const segs = await ensureSegments();
    const n = segs.length;
    if (!n) return null;
    const i = ((idx % n) + n) % n;
    if (cacheRef.current.has(i)) return cacheRef.current.get(i);
    const res = await fetch(segs[i]);
    const ab = await res.arrayBuffer();
    const buf = await getCtx().decodeAudioData(ab);
    cacheRef.current.set(i, buf);
    return buf;
  }

  // ── Crossfade GainNode ────────────────────────────────────────────────────
  function fadeGain(from, to, onDone) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const ctx = ctxRef.current;
    if (!ctx) return;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min((now - t0) / fadeDurationMs, 1);
      gainRef.current.gain.value = from + (to - from) * easeInOut(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }

  // ── Schedule the next segment before current one ends ────────────────────
  function scheduleNext(currentSegIdx, segStartCtxTime, buf) {
    const endCtxTime = segStartCtxTime + buf.duration;
    const msUntilSchedule = (endCtxTime - LOOKAHEAD_S - getCtx().currentTime) * 1000;

    schedTimerRef.current = setTimeout(async () => {
      const segs = segmentsRef.current;
      if (!segs.length) return;
      const nextIdx = (currentSegIdx + 1) % segs.length;
      const nextBuf = await fetchSegment(nextIdx);
      if (!nextBuf) return;

      const ctx = getCtx();
      const src = ctx.createBufferSource();
      src.buffer = nextBuf;
      src.connect(gainRef.current);
      src.start(endCtxTime);
      nextSourceRef.current = src;

      // Once it's playing, it becomes "current"
      src.onended = () => {
        segIdxRef.current = nextIdx;
        startTimeRef.current = endCtxTime;
        scheduleNext(nextIdx, endCtxTime, nextBuf);
      };

      // Prefetch the one after
      fetchSegment(nextIdx + 1).catch(() => {});
    }, Math.max(0, msUntilSchedule));
  }

  // ── Start playback ────────────────────────────────────────────────────────
  const play = useCallback(async () => {
    const segs = await ensureSegments();
    if (!segs.length) return;
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();

    const { idx = 0, offset = 0 } = loadPos();
    const startIdx = Math.min(idx, segs.length - 1);

    const buf = await fetchSegment(startIdx);
    if (!buf) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(gainRef.current);

    const startCtxTime = ctx.currentTime;
    src.start(startCtxTime, offset);
    sourceRef.current = src;
    segIdxRef.current = startIdx;
    startTimeRef.current = startCtxTime - offset; // adjusted so "end" is correct

    src.onended = () => {
      const nextIdx = (startIdx + 1) % segmentsRef.current.length;
      fetchSegment(nextIdx).then((nextBuf) => {
        if (!nextBuf) return;
        const src2 = ctx.createBufferSource();
        src2.buffer = nextBuf;
        src2.connect(gainRef.current);
        const t = ctx.currentTime;
        src2.start(t);
        sourceRef.current = src2;
        segIdxRef.current = nextIdx;
        startTimeRef.current = t;
        src2.onended = src.onended; // chain
        scheduleNext(nextIdx, t, nextBuf);
      });
    };

    // Schedule the next segment ahead of time for gapless transition
    scheduleNext(startIdx, startCtxTime - offset, buf);

    // Fade in
    fadeGain(0, 1, null);
    setIsPlaying(true);

    // Prefetch segment after
    fetchSegment(startIdx + 1).catch(() => {});
  }, [fadeDurationMs]);

  // ── Stop playback ─────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    clearTimeout(schedTimerRef.current);

    // Save position before stopping
    const ctx = ctxRef.current;
    if (ctx) {
      const offset = (ctx.currentTime - startTimeRef.current) % SEGMENT_DURATION;
      savePos(segIdxRef.current, Math.max(0, offset));
    }

    fadeGain(gainRef.current?.gain.value ?? 1, 0, () => {
      sourceRef.current?.stop();
      nextSourceRef.current?.stop();
      sourceRef.current = null;
      nextSourceRef.current = null;
      ctxRef.current?.suspend();
    });

    setIsPlaying(false);
  }, [fadeDurationMs]);

  // ── Toggle ────────────────────────────────────────────────────────────────
  const toggle = useCallback(() => {
    if (isPlaying) stop();
    else play();
  }, [isPlaying, play, stop]);

  // ── Persist position every second while playing ───────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const offset = (ctx.currentTime - startTimeRef.current) % SEGMENT_DURATION;
      savePos(segIdxRef.current, Math.max(0, offset));
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(schedTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const ctx = ctxRef.current;
      if (ctx) {
        const offset = (ctx.currentTime - startTimeRef.current) % SEGMENT_DURATION;
        savePos(segIdxRef.current, Math.max(0, offset));
        sourceRef.current?.stop();
        nextSourceRef.current?.stop();
        ctx.close();
      }
    };
  }, []);

  return { toggle, isPlaying };
}
