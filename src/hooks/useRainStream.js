import { useEffect, useRef, useCallback, useState } from "react";
import { PRODUCTION_BASE_URL } from "../constants/env.js";

const RAIN_API_URL = import.meta.env.VITE_RAIN_API_URL
  || `${PRODUCTION_BASE_URL}/api/audio/rain`;
const API_KEY = import.meta.env.VITE_API_KEY || null;

const POS_KEY = "rain_audio_pos";

export function useRainStream(fadeDurationMs = 3000) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const fadeRafRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);

  // 1. Fetch secure URL on mount
  useEffect(() => {
    const fetchUrl = async () => {
      try {
        const headers = {};
        if (API_KEY) headers['X-Api-Key'] = API_KEY;
        const res = await fetch(RAIN_API_URL, { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (data.url) setAudioUrl(data.url);
        else if (data.segments?.[0]) setAudioUrl(data.segments[0]);
      } catch { }
    };
    fetchUrl();
  }, []);

  // 2. Restore playback position
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const saved = parseFloat(localStorage.getItem(POS_KEY) || "0");
    if (saved > 0) {
      const doSeek = () => { audio.currentTime = saved; };
      if (audio.readyState >= 1) doSeek();
      else audio.addEventListener("loadedmetadata", doSeek, { once: true });
    }

    const onTimeUpdate = () => {
      localStorage.setItem(POS_KEY, String(audio.currentTime));
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [audioUrl]);

  // 3. Cleanup fade
  useEffect(() => {
    return () => {
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
      if (audioRef.current) {
        localStorage.setItem(POS_KEY, String(audioRef.current.currentTime));
      }
    };
  }, []);

  // 4. Volume Crossfade logic
  const fadeVolume = useCallback((from, to, onDone) => {
    if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    const audio = audioRef.current;
    if (!audio) return;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / fadeDurationMs, 1);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      audio.volume = Math.max(0, Math.min(1, from + (to - from) * eased));
      if (t < 1) {
        fadeRafRef.current = requestAnimationFrame(step);
      } else {
        fadeRafRef.current = null;
        onDone?.();
      }
    };
    fadeRafRef.current = requestAnimationFrame(step);
  }, [fadeDurationMs]);

  // 5. Toggle play
  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      const currentVol = audio.volume;
      setIsPlaying(false);
      fadeVolume(currentVol, 0, () => {
        audio.pause();
        audio.volume = 0;
      });
    } else {
      audio.volume = 0;
      audio.play().then(() => {
        setIsPlaying(true);
        fadeVolume(0, 1, null);
      }).catch(() => {});
    }
  }, [isPlaying, fadeVolume, audioUrl]);

  return { toggle, isPlaying, audioRef, audioUrl };
}
