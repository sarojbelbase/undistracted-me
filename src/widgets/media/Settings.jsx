import { useState, useEffect } from 'react';
import { SpotifyIcon as SpotifyBrandIcon } from '../../assets/brand/icons';
import { isSpotifyConnected, getSpotifyProfile, fetchAndCacheProfile } from './utils';
import { SPOTIFY_ACCOUNT_CHANGED } from './hooks/useSpotifyPlayback';
import { IntegrationRow } from '../../components/ui/IntegrationRow';
import { TintedChip } from '../../components/ui/TintedChip';

const spotifyTierLabel = (profile) => {
  if (!profile) return null;
  if (profile.product === 'premium') return 'Spotify Premium';
  if (profile.product === 'free' || profile.product === 'open') return 'Spotify Free';
  return null;
};

export const SpotifySettings = () => {
  const [connected, setConnected] = useState(() => isSpotifyConnected());
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // fetchAndCacheProfile hits the Spotify API and returns avatar; fall back to
    // the cached storage profile (name+product only) if the API call fails.
    fetchAndCacheProfile()
      .then(p => { if (p) setProfile(p); })
      .catch(() => { })
      .finally(() => {
        if (!profile) getSpotifyProfile().then(p => { if (p) setProfile(p); });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when Accounts settings tab fires SPOTIFY_ACCOUNT_CHANGED on this window.
  // (globalThis.storage only fires on *other* tabs — useless here.)
  useEffect(() => {
    const handler = ({ detail }) => {
      setConnected(detail.connected);
      if (detail.connected) {
        // Profile with avatar comes back from fetchAndCacheProfile inside Accounts tab
        fetchAndCacheProfile().then(p => { if (p) setProfile(p); }).catch(() => { });
      } else {
        setProfile(null);
      }
    };
    globalThis.addEventListener(SPOTIFY_ACCOUNT_CHANGED, handler);
    return () => globalThis.removeEventListener(SPOTIFY_ACCOUNT_CHANGED, handler);
  }, []);

  return (
    <div className="flex flex-col gap-4">

      {/* ── Spotify connection row ── */}
      <IntegrationRow
        icon={<SpotifyBrandIcon size={22} />}
        label="Spotify"
        description="Controls playback and shows the currently playing track."
        privacyLabel="Nothing stored on servers"
        connected={connected}
        profile={profile ? { ...profile, picture: profile.avatar ?? null } : null}
        profileSubtitle={spotifyTierLabel(profile)}
      />

      {/* ── Playback sources ── */}
      <div className="flex flex-col gap-2.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.75rem' }}>
        <p className="text-[10px] font-semibold m-0" style={{ color: 'var(--w-ink-6)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          Playback sources
        </p>
        <div className="flex flex-wrap gap-1.5">
          <TintedChip style={{ background: 'rgba(255,85,0,0.10)', color: '#ff5500' }}>SoundCloud</TintedChip>
          <TintedChip style={{ background: 'rgba(255,0,0,0.10)', color: '#ff0000' }}>YouTube</TintedChip>
          <TintedChip style={{ background: 'rgba(192,0,0,0.10)', color: '#c00c1e' }}>YouTube Music</TintedChip>
          <TintedChip style={{ opacity: 0.45, cursor: 'default', pointerEvents: 'none' }}>+ More</TintedChip>
        </div>
        <p className="text-[10px] leading-relaxed m-0" style={{ color: 'var(--w-ink-5)' }}>
          Detected automatically, just play in any tab.
        </p>
      </div>

    </div>
  );
};
