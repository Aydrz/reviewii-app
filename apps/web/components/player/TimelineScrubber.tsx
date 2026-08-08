'use client';

import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Comment } from '@reviewii/shared-types';

interface TimelineScrubberProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  comments: Comment[];
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
  onSeek,
  onTogglePlay,
  onToggleMute,
}: TimelineScrubberProps) {
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
          <span className="font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
