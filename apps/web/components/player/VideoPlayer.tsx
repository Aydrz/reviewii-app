'use client';

import { useState, useRef, useEffect } from 'react';
import { Heart, MessageSquare, PenTool, CheckCircle, Columns, Share2, Send, X } from 'lucide-react';
import { Version, Comment } from '@reviewii/shared-types';
import TimelineScrubber, { VideoQuality } from './TimelineScrubber';
import DrawingCanvas from './DrawingCanvas';
import { fetchApi, getFullMediaUrl } from '../../lib/api-client';
import { useToast } from '../Toast';

interface VideoPlayerProps {
  versions: Version[];
  currentVersionIndex: number;
  onVersionChange: (index: number) => void;
  onOpenComments: () => void;
  onRefreshProject: () => void;
  authorName?: string;
  guestToken?: string;
}

export default function VideoPlayer({
  versions,
  currentVersionIndex,
  onVersionChange,
  onOpenComments,
  onRefreshProject,
  authorName = 'Reviewer',
  guestToken,
}: VideoPlayerProps) {
  const { toast } = useToast();
  const currentVersion = versions[currentVersionIndex];
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [pinPosition, setPinPosition] = useState<{ x: number; y: number } | null>(null);
  const [pinText, setPinText] = useState('');
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality>('1080p');

  const handleQualityChange = (q: VideoQuality) => {
    setSelectedQuality(q);
    if (videoRef.current) {
      const prevTime = videoRef.current.currentTime;
      const isVideoPlaying = !videoRef.current.paused;
      toast.success(`Kualitas resolusi diubah ke ${q}`);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = prevTime;
          if (isVideoPlaying) videoRef.current.play();
        }
      }, 50);
    }
  };

  const lastTapTimeRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [currentVersionIndex]);

  const handleMediaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected -> Trigger Quick Approval
      triggerHeartBurstApproval();
    } else {
      // Single tap -> Tap to Pin Comment
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      setPinPosition({ x, y });
    }
    lastTapTimeRef.current = now;
  };

  const triggerHeartBurstApproval = async () => {
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 1000);

    if (currentVersion?.id) {
      try {
        if (guestToken) {
          await fetchApi(`/guest/${guestToken}/approve`, {
            method: 'POST',
            body: JSON.stringify({ version_id: currentVersion.id, approved_by: authorName }),
          });
        }
        onRefreshProject();
      } catch (e) {
        toast.error('Gagal menyetujui versi.');
      }
    }
  };

  const handleSubmitPinComment = async () => {
    if (!pinPosition || !pinText.trim() || !currentVersion?.id) return;
    try {
      await fetchApi(`/versions/${currentVersion.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          author_name: authorName,
          author_type: guestToken ? 'guest' : 'editor',
          timestamp_seconds: currentTime,
          pin_x: pinPosition.x,
          pin_y: pinPosition.y,
          comment_type: 'text',
          content: pinText,
        }),
      });
      setPinPosition(null);
      setPinText('');
      toast.success('Komentar pin berhasil disimpan!');
      onRefreshProject();
    } catch (e) {
      toast.error('Gagal menyimpan komentar pin.');
    }
  };

  const handleSaveDrawing = async (dataUrl: string) => {
    if (!currentVersion?.id) return;
    try {
      await fetchApi(`/versions/${currentVersion.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          author_name: authorName,
          author_type: guestToken ? 'guest' : 'editor',
          timestamp_seconds: currentTime,
          comment_type: 'drawing',
          drawing_data: dataUrl,
        }),
      });
      setIsDrawingMode(false);
      toast.success('Coretan berhasil disimpan!');
      onRefreshProject();
    } catch (e) {
      toast.error('Gagal menyimpan gambar anotasi.');
    }
  };

  if (!currentVersion) {
    return <div className="p-8 text-center text-neutral-400">Project belum memiliki versi file.</div>;
  }

  const mediaUrl = currentVersion.proxy_url || currentVersion.file_url;
  const fullMediaUrl = getFullMediaUrl(mediaUrl);
  const comments = currentVersion.comments || [];

  return (
    <div className="relative w-full bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Compare Side-by-Side View OR Main View */}
      <div className="relative w-full aspect-video max-h-[70vh] bg-black flex items-center justify-center">
        {isCompareMode && versions.length > 1 ? (
          <div className="w-full h-full grid grid-cols-2 gap-1 bg-neutral-900 p-1">
            <div className="relative flex items-center justify-center bg-black border-r border-white/10">
              <span className="absolute top-2 left-2 z-10 bg-[#2563FF] text-white text-[10px] px-2 py-0.5 rounded font-bold">
                v{versions[1].version_number}
              </span>
              <video src={getFullMediaUrl(versions[1].proxy_url || versions[1].file_url)} className="w-full h-full object-contain" />
            </div>
            <div className="relative flex items-center justify-center bg-black">
              <span className="absolute top-2 left-2 z-10 bg-[#EC4899] text-white text-[10px] px-2 py-0.5 rounded font-bold">
                v{currentVersion.version_number} (Terbaru)
              </span>
              <video src={fullMediaUrl} className="w-full h-full object-contain" />
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center cursor-pointer select-none" onClick={handleMediaClick}>
            {currentVersion.file_type === 'photo' ? (
              <img src={fullMediaUrl} alt="Review Media" className="max-w-full max-h-full object-contain" />
            ) : (
              <video
                ref={videoRef}
                src={fullMediaUrl}
                poster={getFullMediaUrl(currentVersion.thumbnail_url)}
                playsInline
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Existing Comment Pin Markers */}
            {comments.map(
              (c) =>
                c.pin_x !== null &&
                c.pin_y !== null && (
                  <div
                    key={c.id}
                    className="absolute w-6 h-6 rounded-full bg-[#EC4899] text-white font-bold text-[10px] flex items-center justify-center shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2 animate-bounce"
                    style={{ left: `${c.pin_x}%`, top: `${c.pin_y}%` }}
                    title={`${c.author_name}: ${c.content}`}
                  >
                    📌
                  </div>
                ),
            )}

            {/* Active Pin Placement Dialog */}
            {pinPosition && (
              <div
                className="absolute z-50 bg-neutral-900/95 border border-[#2563FF] p-2.5 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[220px]"
                style={{ left: `${Math.min(pinPosition.x, 70)}%`, top: `${Math.min(pinPosition.y, 70)}%` }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between text-xs text-[#2563FF] font-semibold">
                  <span>📌 Pin Komentar</span>
                  <button onClick={() => setPinPosition(null)} className="text-neutral-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ketik komentar di frame ini..."
                  value={pinText}
                  onChange={(e) => setPinText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitPinComment()}
                  autoFocus
                  className="bg-neutral-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#2563FF]"
                />
                <button
                  onClick={handleSubmitPinComment}
                  className="bg-[#2563FF] hover:bg-[#1A46CC] text-white py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Simpan Pin
                </button>
              </div>
            )}

            {/* Double Tap Heart Burst Animation Overlay */}
            {showHeartBurst && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                <Heart className="w-28 h-28 text-[#EB5757] fill-current animate-heart-burst drop-shadow-2xl" />
              </div>
            )}
          </div>
        )}

        {/* Drawing Annotation Mode */}
        {isDrawingMode && <DrawingCanvas onSaveDrawing={handleSaveDrawing} onClose={() => setIsDrawingMode(false)} />}
      </div>

      {/* Version Selector Bar */}
      <div className="w-full bg-neutral-900/90 border-t border-white/10 px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 font-medium">Versi:</span>
          {versions.map((ver, idx) => (
            <button
              key={ver.id}
              onClick={() => onVersionChange(idx)}
              className={`px-3 py-1 rounded-full font-bold transition-colors ${
                currentVersionIndex === idx ? 'bg-[#2563FF] text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              v{ver.version_number}
            </button>
          ))}
        </div>

        {versions.length > 1 && (
          <button
            onClick={() => setIsCompareMode(!isCompareMode)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
              isCompareMode ? 'bg-[#EC4899] text-white border-transparent' : 'bg-neutral-800 text-neutral-300 border-white/10'
            }`}
          >
            <Columns className="w-4 h-4" /> Compare Side-by-Side
          </button>
        )}
      </div>

      {/* Scrubber Controls */}
      {currentVersion.file_type === 'video' && (
        <TimelineScrubber
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          isMuted={isMuted}
          comments={comments}
          selectedQuality={selectedQuality}
          onQualityChange={handleQualityChange}
          onSeek={(t) => {
            if (videoRef.current) videoRef.current.currentTime = t;
            setCurrentTime(t);
          }}
          onTogglePlay={() => {
            if (videoRef.current) {
              if (isPlaying) videoRef.current.pause();
              else videoRef.current.play();
              setIsPlaying(!isPlaying);
            }
          }}
          onToggleMute={() => {
            if (videoRef.current) {
              videoRef.current.muted = !isMuted;
              setIsMuted(!isMuted);
            }
          }}
        />
      )}

      {/* Bottom Action Bar */}
      <div className="w-full bg-[#0F172A] px-4 py-3 border-t border-white/10 flex items-center justify-between">
        <button
          onClick={triggerHeartBurstApproval}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#2ECC71]/20 hover:bg-[#2ECC71]/30 text-[#2ECC71] border border-[#2ECC71]/40 rounded-xl font-bold text-xs transition-transform active:scale-95 cursor-pointer"
        >
          <Heart className="w-4 h-4 fill-current" /> Approve (Double Tap)
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDrawingMode(!isDrawingMode)}
            className="flex items-center gap-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            <PenTool className="w-4 h-4 text-[#2563FF]" /> Gambar Anotasi
          </button>

          <button
            onClick={onOpenComments}
            className="flex items-center gap-1 px-4 py-2 bg-[#2563FF] hover:bg-[#1A46CC] text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" /> Komentar ({comments.length})
          </button>
        </div>
      </div>
    </div>
  );
}
