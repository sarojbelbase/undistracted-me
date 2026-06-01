import React from 'react';
import { SkipStartFill, SkipEndFill, PlayFill, PauseFill } from 'react-bootstrap-icons';
import { TooltipBtn } from '../../components/ui/TooltipBtn';
import { BaseWidget } from '../BaseWidget';
import { chromeArtworkRing } from './hooks/mediaHelpers';

function ChromePlayPauseBtn({ session, pending, onClick }) {
  return (
    <div className="relative">
      {pending && <div className="absolute animate-spin pointer-events-none rounded-full" style={{ inset: '-3px', border: '2px solid rgba(0,0,0,0.08)', borderTopColor: 'rgba(0,0,0,0.55)' }} aria-hidden="true" />}
      <TooltipBtn tooltip={session?.playbackState === 'playing' ? 'Pause' : 'Play'}>
        <button onClick={onClick} className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#000', opacity: pending ? 0.65 : 1, transition: 'opacity 0.2s, transform 0.15s' }}
          aria-label={session?.playbackState === 'playing' ? 'Pause' : 'Play'}>
          {session?.playbackState === 'playing' ? <PauseFill size={16} /> : <PlayFill size={16} />}
        </button>
      </TooltipBtn>
    </div>
  );
}

function ChromeSkipBtn({ direction, session, pending, onClick, btnBg, ink, border }) {
  const Icon = direction === 'prev' ? SkipStartFill : SkipEndFill;
  const disabled = session?.canGoPrev === false && direction === 'prev';
  let opacity = 1;
  if (disabled) opacity = 0.2;
  else if (pending) opacity = 0.6;
  return (
    <div className="relative">
      {pending && <div className="absolute animate-spin pointer-events-none rounded-full" style={{ inset: '-3px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.7)' }} aria-hidden="true" />}
      <TooltipBtn tooltip={direction === 'prev' ? 'Previous' : 'Next'}>
        <button onClick={onClick} disabled={disabled}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
          style={{ backgroundColor: btnBg, color: ink, border, opacity, cursor: disabled ? 'default' : undefined, transition: 'opacity 0.2s' }}
          aria-label={direction === 'prev' ? 'Previous' : 'Next'}>
          <Icon size={13} />
        </button>
      </TooltipBtn>
    </div>
  );
}

export function ChromeMediaPlayer({ onRemove, settingsPanel, chromeBgStyle, chromeInk, chromeMute, chromeBtnBg, chromeBtnBorder, chromeTrackAnimKey, activeSession, chromePendingTabId, chromeSkipPending, handleChromePlayPause, handleChromeNext, handleChromePrev }) {
  return (
    <BaseWidget className="relative p-0 flex flex-col" cardStyle={chromeBgStyle} settingsContent={settingsPanel} settingsTitle="Media" onRemove={onRemove}>
      {activeSession?.artwork && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <img src={activeSession.artwork} alt="" className="w-full h-full object-cover opacity-25" style={{ transition: 'opacity 0.4s' }} />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.54)' }} />
        </div>
      )}
      <div className="relative z-10 flex flex-col flex-1 p-4 gap-2 min-h-0">
        <div key={chromeTrackAnimKey} className="flex flex-col gap-2" style={chromeTrackAnimKey > 0 ? { animation: 'spotifyTrackIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both' } : undefined}>
          {activeSession?.artwork && (
            <div className="flex justify-center">
              <img src={activeSession.artwork} alt="" decoding="async" className="rounded-xl shadow-lg object-cover" style={{ width: 80, height: 80, ...chromeArtworkRing(activeSession?.host) }} />
            </div>
          )}
          <div className="flex flex-col gap-0.5 min-w-0 mt-1">
            <div className="truncate text-sm font-semibold" style={{ color: chromeInk }}>{activeSession?.title || 'Playing'}</div>
            <div className="truncate text-xs" style={{ color: chromeMute }}>{activeSession?.artist || activeSession?.host || 'Browser'}</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 pt-1">
          <ChromeSkipBtn direction="prev" session={activeSession} pending={chromeSkipPending?.tabId === activeSession?.tabId && chromeSkipPending?.action === 'prev'} onClick={() => handleChromePrev(activeSession)} btnBg={chromeBtnBg} ink={chromeInk} border={chromeBtnBorder} />
          <ChromePlayPauseBtn session={activeSession} pending={chromePendingTabId === activeSession?.tabId} onClick={() => handleChromePlayPause(activeSession)} />
          <ChromeSkipBtn direction="next" session={activeSession} pending={chromeSkipPending?.tabId === activeSession?.tabId && chromeSkipPending?.action === 'next'} onClick={() => handleChromeNext(activeSession)} btnBg={chromeBtnBg} ink={chromeInk} border={chromeBtnBorder} />
        </div>
      </div>
    </BaseWidget>
  );
}
