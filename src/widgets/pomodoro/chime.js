/**
 * chime.js — Web Audio API chime generator for Pomodoro timer completion.
 *
 * Zero dependencies. Generates a pleasant two-tone chime using oscillators.
 * No external audio file needed — works offline, in extension context, and on web.
 *
 * Usage:
 *   import { playChime } from './chime';
 *   playChime(); // plays a brief completion chime
 */

let audioCtx = null;

/** Lazily get or create an AudioContext (must happen after user gesture on web). */
const getCtx = () => {
  if (!audioCtx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    audioCtx = new AC();
  }
  // Resume if suspended (autoplay policy on web)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

/**
 * Play a short, pleasant two-tone completion chime.
 * D4 → G4 (293.66 Hz → 392.00 Hz), each ~120ms with gentle decay.
 * Total duration ~300ms — unobtrusive but noticeable.
 */
export const playChime = () => {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const playTone = (freq, startTime, duration, gain = 0.18) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Gentle attack + decay envelope
      vol.gain.setValueAtTime(0, startTime);
      vol.gain.linearRampToValueAtTime(gain, startTime + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(vol);
      vol.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Two-tone chime: D4 then G4, slightly overlapping
    playTone(293.66, now, 0.18);       // D4
    playTone(392, now + 0.1, 0.22);    // G4 — slightly louder, slightly longer for pleasant decay

    // Subtle harmonic octave on the second tone for richness
    const osc2 = ctx.createOscillator();
    const vol2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(784, now + 0.1); // G5 octave
    vol2.gain.setValueAtTime(0, now + 0.1);
    vol2.gain.linearRampToValueAtTime(0.06, now + 0.12);
    vol2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(vol2);
    vol2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.3);
  } catch {
    // Silently fail — audio is a nice-to-have, not critical
  }
};

/**
 * Play a shorter, softer tick sound for break completion.
 * Single G4 tone, 100ms, lower gain.
 */
export const playBreakChime = () => {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const vol = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5

    vol.gain.setValueAtTime(0, now);
    vol.gain.linearRampToValueAtTime(0.12, now + 0.02);
    vol.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(vol);
    vol.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch {
    // Silently fail
  }
};
