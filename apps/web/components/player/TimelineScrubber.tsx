'use client';

import { useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Sliders } from 'lucide-react';
import { Comment } from '@reviewii/shared-types';

export type VideoQuality = '1080p' | '720p' | '480p' | '360p' | 'Auto';

interface TimelineScrubberProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  comments: Comment[];
  selectedQuality?: VideoQuality;
  onQualityChange?: (quality: VideoQuality) => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
}

export default function TimelineScrubber({
  currentTime,
  duration,
  isPlaying,
  isMuted,
  comments,
  selectedQuality = '1080p',
  onQualityChange,
  onSeek,
  onTogglePlay,
  onToggleMute,
}: TimelineScrubberProps) {
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const formatTime = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-neutral-900/90 backdrop-blur-md p-3 border-t border-white/10 flex flex-col gap-2">
      {/* Scrubber Bar */}
      <div
        className="relative w-full h-3 bg-neutral-800 rounded-full cursor-pointer group flex items-center"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const newTime = (clickX / rect.width) * duration;
          onSeek(newTime);
        }}
      >
        {/* Progress Fill */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-[#2563FF] rounded-full"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Comment Dot Markers */}
        {duration > 0 &&
          comments.map((c) => {
            const leftPercent = (c.timestamp_seconds / duration) * 100;
            return (
              <div
                key={c.id}
                title={`${c.author_name}: ${c.content || 'Komentar'}`}
                className="absolute w-2.5 h-2.5 bg-[#EC4899] rounded-full border border-white transform -translate-x-1/2 hover:scale-150 transition-transform z-10"
                style={{ left: `${leftPercent}%` }}
              />
            );
          })}

        {/* Current Time Handle */}
        <div
          className="absolute w-4 h-4 bg-white rounded-full shadow-md border border-[#2563FF] transform -translate-x-1/2 z-20 group-hover:scale-125 transition-transform"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Control Actions & Time Display */}
      <div className="flex items-center justify-between text-xs text-neutral-300">
        <div className="flex items-center gap-3">
          <button onClick={onTogglePlay} className="p-1.5 hover:text-white transition-colors">
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          <button onClick={onToggleMute} className="p-1.5 hover:text-white transition-colors">
            {isMuted ? <VolumeX className="w-5 h-5 text-[#EB5757]" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <span className="font-mono text-[11px] sm:text-xs">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Video Quality Selector (360p - 1080p) */}
        <div className="relative">
          <button
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-xs font-bold text-cyan-400 border border-cyan-500/30 transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{selectedQuality}</span>
          </button>

          {showQualityMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowQualityMenu(false)} />
              <div className="absolute bottom-full mb-2 right-0 flex flex-col bg-neutral-900/98 border border-white/15 rounded-xl p-1.5 shadow-2xl z-50 min-w-[125px] backdrop-blur-xl animate-fade-in">
                {(['1080p', '720p', '480p', '360p', 'Auto'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      onQualityChange?.(q);
                      setShowQualityMenu(false);
                    }}
                    className={`px-3 py-2 text-left text-xs font-medium rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                      selectedQuality === q ? 'text-cyan-400 bg-cyan-400/15 font-bold' : 'text-neutral-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{q}</span>
                    <span className="text-[9px] text-neutral-400 font-mono">
                      {q === '1080p' ? 'Full HD' : q === '720p' ? 'HD' : q === '360p' ? 'Hemat' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
