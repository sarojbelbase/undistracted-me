import React from 'react';
import { SkipStartFill, SkipEndFill, PlayFill, PauseFill } from 'react-bootstrap-icons';
import { TooltipBtn } from '../../components/ui/TooltipBtn';
import { BaseWidget } from '../BaseWidget';

export function SpotifyPlayer({ onRemove, settingsPanel, bgStyle, inkColor, muteColor, btnBg, btnBorder, hasBg, track, trackAnimKey, spotifyPending, spotifySkipPending, handlePlayPause, handleNext, handlePrev }) {
  const isSkip = (dir) => spotifySkipPending === dir;
  const spinColor = hasBg ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)';
  return (
    <BaseWidget className="relative p-0 flex flex-col" cardStyle={bgStyle} settingsContent={settingsPanel} settingsTitle="Media" onRemove={onRemove}>
      {track.albumArt && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <img src={track.albumArt} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.52)' }} />
        </div>
      )}
      <div className="relative z-10 flex flex-col h-full p-4 gap-2">
        <div key={trackAnimKey} className="flex flex-col gap-2" style={trackAnimKey > 0 ? { animation: 'spotifyTrackIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both' } : undefined}>
          {track.albumArt && <div className="flex justify-center"><img src={track.albumArt} alt="" decoding="async" className="w-20 h-20 rounded-xl shadow-lg object-cover" /></div>}
          <div className="flex flex-col gap-0.5 min-w-0 mt-1">
            <div className="truncate text-sm font-semibold" style={{ color: inkColor }}>{track.title}</div>
            <div className="truncate text-xs" style={{ color: muteColor }}>{track.artist}</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 pt-1">
          <div className="relative">
            {isSkip('prev') && <div className="absolute animate-spin pointer-events-none rounded-full" style={{ inset: '-3px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: spinColor }} aria-hidden="true" />}
            <TooltipBtn tooltip="Previous"><button onClick={handlePrev} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80" style={{ backgroundColor: btnBg, color: inkColor, border: btnBorder, opacity: isSkip('prev') ? 0.6 : 1, transition: 'opacity 0.2s' }} aria-label="Previous"><SkipStartFill size={13} /></button></TooltipBtn>
          </div>
          <div className="relative">
            {spotifyPending && <div className="absolute animate-spin pointer-events-none rounded-full" style={{ inset: '-3px', border: '2px solid rgba(0,0,0,0.08)', borderTopColor: 'rgba(0,0,0,0.55)' }} aria-hidden="true" />}
            <TooltipBtn tooltip={track.isPlaying ? 'Pause' : 'Play'}><button onClick={handlePlayPause} className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#000', opacity: spotifyPending ? 0.65 : 1, transition: 'opacity 0.2s, transform 0.15s' }} aria-label={track.isPlaying ? 'Pause' : 'Play'}>{track.isPlaying ? <PauseFill size={16} /> : <PlayFill size={16} />}</button></TooltipBtn>
          </div>
          <div className="relative">
            {isSkip('next') && <div className="absolute animate-spin pointer-events-none rounded-full" style={{ inset: '-3px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: spinColor }} aria-hidden="true" />}
            <TooltipBtn tooltip="Next"><button onClick={handleNext} className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80" style={{ backgroundColor: btnBg, color: inkColor, border: btnBorder, opacity: isSkip('next') ? 0.6 : 1, transition: 'opacity 0.2s' }} aria-label="Next"><SkipEndFill size={13} /></button></TooltipBtn>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}
