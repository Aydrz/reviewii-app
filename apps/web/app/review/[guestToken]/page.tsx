'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Play, Pause, Volume2, VolumeX, CheckCircle2, Clock, Send,
  MessageSquare, AlertCircle, Sparkles, Paperclip, X, Image as ImageIcon,
  PenTool, ShieldAlert, Download, Music, HelpCircle, FileText, Check,
  ChevronLeft, ChevronRight, File as FileIcon, KeyRound,
} from 'lucide-react';
import { fetchApi, uploadFileApi, getFullMediaUrl } from '../../../lib/api-client';
import { Project, Comment } from '@reviewii/shared-types';
import DrawingCanvas from '../../../components/player/DrawingCanvas';
import SimbaIcon from '../../../components/SimbaIcon';
import { useToast } from '../../../components/Toast';
import Portal from '../../../components/Portal';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtMmSs(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function parseMmSs(str: string): number {
  const parts = str.split(':');
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  return parseFloat(str) || 0;
}

function getAttachmentUrls(url?: string | null): string[] {
  if (!url) return [];
  if (url.startsWith('[')) {
    try { return JSON.parse(url); } catch { return [url]; }
  }
  return url.split(',').filter(Boolean);
}

// ── component ─────────────────────────────────────────────────────────────────
export default function DedicatedReviewerPage() {
  const { toast } = useToast();
  const params = useParams();
  const guestToken = params.guestToken as string;

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Revision form state
  const [commentText, setCommentText] = useState('');
  const [category, setCategory] = useState('Lainnya');
  const [isOverallNote, setIsOverallNote] = useState(false);
  const [useTimeRange, setUseTimeRange] = useState(false);
  const [startMmSs, setStartMmSs] = useState('0:00');
  const [endMmSs, setEndMmSs] = useState('0:05');
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const [musicFile, setMusicFile] = useState<File | null>(null);

  // Drawing canvas
  const [showDrawing, setShowDrawing] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [drawingData, setDrawingData] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSop, setShowSop] = useState(true);
  const [showRevList, setShowRevList] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showUnsavedWarn, setShowUnsavedWarn] = useState(false);

  // PIN Verification State
  const [pinInput, setPinInput] = useState('');
  const [activePin, setActivePin] = useState('');

  const { data: guestData, error, isLoading, refetch } = useQuery<{ guestTokenId: string; project: Project }>({
    queryKey: ['reviewer-project', guestToken, activePin],
    queryFn: () => {
      const q = activePin ? `?pin=${encodeURIComponent(activePin)}` : '';
      return fetchApi<{ guestTokenId: string; project: Project }>(`/guest/${guestToken}${q}`);
    },
    retry: false,
  });

  // ── Video event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => { if (!isScrubbing) setCurrentTime(video.currentTime); };
    const onMeta = () => setDuration(video.duration);
    const onEnded = () => setIsPlaying(false);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('ended', onEnded);
    };
  }, [guestData, isScrubbing]);

  // ── Scrubbing logic (real-time drag) ─────────────────────────────────────
  const getTimeFromEvent = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const bar = scrubberRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0]?.clientX : (e as MouseEvent).clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }, [duration]);

  const seekTo = useCallback((time: number, shouldPlay = false) => {
    const video = videoRef.current;
    if (!video) return;
    const t = Math.max(0, Math.min(time, duration));
    video.currentTime = t;
    setCurrentTime(t);
    if (shouldPlay) video.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [duration]);

  const handleScrubStart = (e: React.MouseEvent | React.TouchEvent) => {
    const wasPlaying = !videoRef.current?.paused;
    if (wasPlaying) { videoRef.current?.pause(); setIsPlaying(false); }
    setIsScrubbing(true);
    const t = getTimeFromEvent(e as any);
    seekTo(t);

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const t2 = getTimeFromEvent(ev);
      seekTo(t2);
    };
    const onUp = (ev: MouseEvent | TouchEvent) => {
      setIsScrubbing(false);
      const t3 = getTimeFromEvent(ev);
      seekTo(t3, wasPlaying);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
  };

  // ── Per-frame step ────────────────────────────────────────────────────────
  const stepFrame = (dir: 1 | -1) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    const fps = 30;
    const t = Math.max(0, Math.min(video.currentTime + dir * (1 / fps), duration));
    seekTo(t);
  };

  // ── Misc helpers ──────────────────────────────────────────────────────────
  const hasUnsaved = commentText.trim() || drawingData || attachFiles.length > 0 || musicFile;

  const handleTogglePlay = () => {
    if (hasUnsaved && !isPlaying) { setShowUnsavedWarn(true); return; }
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) { video.pause(); setIsPlaying(false); }
    else { video.play().then(() => setIsPlaying(true)).catch(() => {}); }
  };

  const handleOpenDrawing = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedFrame(canvas.toDataURL('image/jpeg', 0.95));
      }
    } catch { setCapturedFrame(null); }
    setShowDrawing(true);
  };

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !drawingData && attachFiles.length === 0 && !musicFile) return;
    const versionId = guestData?.project.versions?.[0]?.id;
    if (!versionId) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('author_name', guestData!.project.client_name || 'Reviewer');
      fd.append('author_type', 'guest');
      const ts = isOverallNote ? 0 : parseMmSs(startMmSs);
      fd.append('timestamp_seconds', String(ts));
      if (useTimeRange && !isOverallNote) fd.append('timestamp_end_seconds', String(parseMmSs(endMmSs)));
      fd.append('category', isOverallNote ? 'Keseluruhan Video' : category);
      fd.append('comment_type', drawingData ? 'drawing' : 'text');
      if (commentText) fd.append('content', commentText);
      if (drawingData) fd.append('drawing_data', drawingData);
      
      // Multiple attachments support
      if (attachFiles.length > 0) {
        attachFiles.forEach((file) => fd.append('attachments', file));
      }
      if (musicFile) {
        fd.append('attachments', musicFile);
      }

      await uploadFileApi(`/versions/${versionId}/comments`, fd);
      setCommentText(''); setDrawingData(null); setAttachFiles([]); setMusicFile(null);
      setUseTimeRange(false); setIsOverallNote(false);
      toast.success('Catatan revisi berhasil dikirim!');
      refetch();
    } catch {
      toast.error('Gagal mengirim catatan revisi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    const versionId = guestData?.project.versions?.[0]?.id;
    if (!versionId) return;
    try {
      await fetchApi(`/guest/${guestToken}/approve`, {
        method: 'POST',
        body: JSON.stringify({ version_id: versionId, approved_by: guestData!.project.client_name }),
      });
      setShowApproveConfirm(false);
      toast.success('Video berhasil disetujui (Approved)!');
      refetch();
    } catch {
      toast.error('Gagal menyetujui video.');
    }
  };

  // ── Stamp current video position to mm:ss ─────────────────────────────────
  const stampCurrentTime = () => {
    setStartMmSs(fmtMmSs(currentTime));
    if (useTimeRange) setEndMmSs(fmtMmSs(Math.min(currentTime + 5, duration)));
  };

  // ── Download without auto-open ────────────────────────────────────────────
  const handleDownload = async () => {
    const url = mediaUrl;
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${project?.title || 'video'}.${blob.type.split('/')[1] || 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch { window.open(url, '_blank'); }
  };

  // Finish Review State
  const [showFinishReviewModal, setShowFinishReviewModal] = useState(false);
  const [finalReviewNote, setFinalReviewNote] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinishReview = async () => {
    const versionId = guestData?.project.versions?.[0]?.id;
    if (!versionId || !guestData?.project) return;
    setIsFinishing(true);
    try {
      if (finalReviewNote.trim()) {
        const fd = new FormData();
        fd.append('author_name', guestData.project.client_name);
        fd.append('author_type', 'guest');
        fd.append('timestamp_seconds', String(currentTime));
        fd.append('comment_type', 'text');
        fd.append('category', 'Catatan Akhir');
        fd.append('content', `[Catatan Akhir Reviewer]: ${finalReviewNote.trim()}`);
        await uploadFileApi(`/versions/${versionId}/comments`, fd);
      }

      await fetchApi(`/projects/${guestData.project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'revisi' }),
      });

      setShowFinishReviewModal(false);
      toast.success('Review selesai! Mengalihkan ke WhatsApp editor...');

      const editorPhone = guestData.project.editor_phone || '087824006766';
      const cleanPhone = editorPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `Halo Editor,\n\nSaya telah selesai melakukan review untuk project:\n• Project: ${guestData.project.title}\n• Klien: ${guestData.project.client_name}\n• Link Review: ${window.location.href}\n\nStatus: Selesai Review (Ada Revisi)\nEstimasi Pengerjaan: 1x24 jam - 1 minggu.\n\n${finalReviewNote ? `Catatan Akhir Reviewer:\n"${finalReviewNote}"\n\n` : ''}Terima kasih.`
      )}`;

      setTimeout(() => {
        window.open(waUrl, '_blank');
        refetch();
      }, 800);
    } catch {
      toast.error('Gagal menyelesaikan review.');
    } finally {
      setIsFinishing(false);
    }
  };

  // ── Render loading / error / PIN Modal ─────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-xs text-neutral-500 font-mono animate-pulse">Memuat video review...</p>
    </div>
  );

  if (error || !guestData?.project) {
    const errMsg = (error as Error)?.message || '';
    const isPinErr = errMsg.includes('PIN_REQUIRED') || errMsg.includes('PIN_INVALID');

    if (isPinErr) {
      return (
        <div className="max-w-md mx-auto my-12 glass-panel-elevated p-6 border-cyan-400/40 text-center space-y-4 shadow-2xl animate-scale-in">
          <div className="w-12 h-12 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center mx-auto text-cyan-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Masukkan Kode PIN (4-Digit)</h1>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Link review ini dilindungi oleh <strong>Kode PIN 4-digit</strong>. Masukkan PIN untuk membuka video.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pinInput.length !== 4) {
                toast.error('Masukkan 4 angka Kode PIN.');
                return;
              }
              setActivePin(pinInput);
            }}
            className="space-y-3"
          >
            <input
              type="password"
              maxLength={4}
              placeholder="• • • •"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
              autoFocus
              className="cyber-input text-center text-2xl font-mono font-black tracking-widest py-3 bg-black/60 border-cyan-400/30 focus:border-cyan-400"
            />

            {errMsg.includes('PIN_INVALID') && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-left space-y-2 animate-shake">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Kode PIN Salah!</span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Kode PIN telah dikirimkan melalui WhatsApp. Jika Anda belum menerima PIN, silakan hubungi editor di WhatsApp.
                </p>
                <a
                  href={`https://wa.me/6287824006766?text=${encodeURIComponent(
                    `Halo Editor, saya membutuhkan Kode PIN akses untuk review project.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold rounded-lg text-xs transition-colors shadow-lg shadow-emerald-500/20"
                >
                  💬 Minta PIN ke WA Editor (087824006766)
                </a>
              </div>
            )}

            <button type="submit" className="btn-cyber-primary py-2.5 text-xs w-full">
              Buka Review Video
            </button>
          </form>

          {/* SOP Guide Box inside PIN Screen */}
          <div className="pt-3 border-t border-white/10 text-left space-y-2">
            <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> SOP Penggunaan Aplikasi:
            </span>
            <ul className="text-[11px] text-neutral-400 space-y-1 list-disc pl-4 leading-relaxed">
              <li>Tonton video sampai selesai sebelum memberi catatan.</li>
              <li>Klik posisi timeline untuk memberi catatan revisi detik spesifik.</li>
              <li>Klik tombol <strong>Selesai Review</strong> setelah memberikan catatan agar editor langsung menerima notifikasi WA.</li>
            </ul>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-sm mx-auto my-16 glass-panel-elevated p-6 border-red-500/40 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h1 className="text-sm font-black text-red-400">Link Tidak Valid / Project Dihapus</h1>
        <p className="text-xs text-neutral-400">Link review ini sudah tidak aktif. Hubungi editor untuk informasi lebih lanjut.</p>
      </div>
    );
  }

  const project = guestData.project;
  const ver = project.versions?.[0];
  const comments = ver?.comments || [];
  const mediaUrl = getFullMediaUrl(ver?.proxy_url || ver?.file_url);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-16 px-2 sm:px-4 animate-fade-in">
      {/* ── Mobile-First Header Capsule ───────────────────────────────────── */}
      <header className="sticky top-2 z-40 bg-[#0c1017]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-black text-sm text-white truncate leading-tight">{project.title}</h1>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 flex-shrink-0 ${
                project.status === 'approved'
                  ? 'bg-cyan-400/15 text-cyan-400 border-cyan-400/40'
                  : project.status === 'revisi'
                  ? 'bg-red-500/15 text-red-400 border-red-500/40'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/40'
              }`}
            >
              {project.status === 'approved' ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : project.status === 'revisi' ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
              <span>{project.status === 'approved' ? 'Approved' : project.status === 'revisi' ? 'Perlu Revisi' : 'Menunggu'}</span>
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
            Reviewer: <strong className="text-neutral-200">{project.client_name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowSop(true)}
            className="p-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs border border-white/10 flex items-center gap-1 font-bold"
            title="SOP Review"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">SOP</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-2 bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 rounded-xl text-xs flex items-center gap-1 font-bold"
            title="Download Video"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {project.status !== 'approved' && (
            <>
              <button
                onClick={() => setShowFinishReviewModal(true)}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="hidden xs:inline">Selesai</span>
              </button>

              <button
                onClick={() => setShowApproveConfirm(true)}
                className="px-3 py-2 bg-cyan-400 hover:bg-cyan-300 text-black rounded-xl text-xs font-black flex items-center gap-1 shadow-lg shadow-cyan-400/20 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden xs:inline">Approve</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Video Player & Mobile Scrubber Controls ──────────────────────── */}
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {ver?.file_type === 'photo' ? (
            <img src={mediaUrl} alt={project.title} className="max-w-full max-h-full object-contain" />
          ) : (
            <video
              ref={videoRef}
              src={mediaUrl}
              crossOrigin="anonymous"
              poster={getFullMediaUrl(ver?.thumbnail_url)}
              playsInline
              preload="metadata"
              className="max-w-full max-h-full object-contain"
            />
          )}

          {ver?.file_type !== 'photo' && !showDrawing && (
            <div className="absolute inset-0 cursor-pointer" onClick={handleTogglePlay} />
          )}

          {showDrawing && (
            <DrawingCanvas
              frameImageUrl={capturedFrame}
              onSaveDrawing={(dataUrl) => {
                setDrawingData(dataUrl);
                setShowDrawing(false);
              }}
              onClose={() => setShowDrawing(false)}
            />
          )}
        </div>

        {ver?.file_type !== 'photo' && (
          <div className="bg-[#0c1017] border-t border-white/10 p-3 space-y-3">
            {/* Timeline Scrubber Bar */}
            <div
              ref={scrubberRef}
              className="relative w-full h-3 bg-neutral-800/80 rounded-full cursor-pointer select-none border border-white/5"
              onMouseMove={(e) => {
                const rect = scrubberRef.current!.getBoundingClientRect();
                setHoverTime(Math.max(0, Math.min(((e.clientX - rect.left) / rect.width) * duration, duration)));
              }}
              onMouseLeave={() => setHoverTime(null)}
              onMouseDown={handleScrubStart}
              onTouchStart={handleScrubStart}
            >
              {hoverTime !== null && !isScrubbing && (
                <div
                  className="absolute -top-7 font-mono text-[10px] text-cyan-400 bg-black/90 border border-cyan-400/40 px-1.5 py-0.5 rounded pointer-events-none transform -translate-x-1/2 z-30 shadow-md"
                  style={{ left: `${(hoverTime / duration) * 100}%` }}
                >
                  {fmtMmSs(hoverTime)}
                </div>
              )}

              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(0,240,201,0.5)]"
                style={{ width: `${progress}%` }}
              />

              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-400 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 transition-transform hover:scale-125 z-20"
                style={{ left: `${progress}%` }}
              />

              {comments.map((c) => (
                <div
                  key={c.id}
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-pink-500 rounded-full border-2 border-white cursor-pointer hover:scale-150 transition-transform z-10 -translate-x-1/2 shadow-md"
                  style={{ left: `${duration > 0 ? (c.timestamp_seconds / duration) * 100 : 0}%` }}
                  title={`${fmtMmSs(c.timestamp_seconds)} - ${c.content || 'Catatan'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasUnsaved) seekTo(c.timestamp_seconds);
                    else setShowUnsavedWarn(true);
                  }}
                />
              ))}
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                  <button onClick={() => stepFrame(-1)} title="Mundur 1 Frame" className="p-1.5 text-neutral-300 hover:text-white rounded-lg">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={handleTogglePlay} className="p-1.5 text-white hover:text-cyan-400">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                  </button>
                  <button onClick={() => stepFrame(1)} title="Maju 1 Frame" className="p-1.5 text-neutral-300 hover:text-white rounded-lg">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }
                    }}
                    className="p-2 bg-white/5 border border-white/10 rounded-xl text-neutral-300"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-neutral-300" />}
                  </button>
                  <span className="font-mono text-xs text-cyan-400 font-bold bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-1 rounded-xl">
                    {fmtMmSs(currentTime)} / {fmtMmSs(duration)}
                  </span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenDrawing}
                  className="flex-1 sm:flex-initial py-2 px-3 bg-cyan-400/15 text-cyan-400 border border-cyan-400/35 hover:bg-cyan-400/25 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <PenTool className="w-4 h-4" />
                  <span>Coretan</span>
                </button>
                <button
                  onClick={() => setShowRevList(true)}
                  className="flex-1 sm:flex-initial py-2 px-3 bg-white/5 text-pink-400 border border-pink-500/30 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Catatan ({comments.length})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Double-Bezel Mobile Revision Form Card ──────────────────────── */}
      <form onSubmit={handleSubmitNote} className="rounded-2xl border border-white/10 bg-[#0c1017]/95 shadow-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/10 pb-2.5">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-cyan-400" /> Tambah Catatan Revisi
          </span>
          {!isOverallNote && (
            <button
              type="button"
              onClick={stampCurrentTime}
              className="font-mono text-[11px] font-bold bg-cyan-400/15 text-cyan-400 border border-cyan-400/35 px-3 py-1 rounded-full hover:bg-cyan-400/25 transition-all"
            >
              🎯 Patok Posisi: {fmtMmSs(currentTime)}
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer bg-white/5 p-2.5 rounded-xl border border-white/5">
          <input
            type="checkbox"
            checked={isOverallNote}
            onChange={(e) => setIsOverallNote(e.target.checked)}
            className="w-4 h-4 accent-cyan-400 rounded"
          />
          <span className="font-medium">Catatan Keseluruhan Video (tanpa timestamp)</span>
        </label>

        {!isOverallNote && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 mb-1">Kategori Revisi</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="cyber-input py-2 text-xs bg-black/60 border-white/15 focus:border-cyan-400"
              >
                <option value="Lainnya">Lainnya (Default)</option>
                <option value="Musik">Musik & Audio</option>
                <option value="Transisi">Cut & Transisi</option>
                <option value="Teks">Teks & Grafis</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-neutral-400">Rentang Waktu (Durasi)</label>
                <input
                  type="checkbox"
                  checked={useTimeRange}
                  onChange={(e) => {
                    setUseTimeRange(e.target.checked);
                    if (e.target.checked) {
                      setStartMmSs(fmtMmSs(currentTime));
                      setEndMmSs(fmtMmSs(Math.min(currentTime + 5, duration)));
                    }
                  }}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </div>
              {useTimeRange ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={startMmSs}
                    onChange={(e) => setStartMmSs(e.target.value)}
                    placeholder="0:00"
                    className="cyber-input py-1.5 text-xs font-mono text-center w-full"
                  />
                  <span className="text-xs text-neutral-500 font-bold flex-shrink-0">-</span>
                  <input
                    type="text"
                    value={endMmSs}
                    onChange={(e) => setEndMmSs(e.target.value)}
                    placeholder="0:30"
                    className="cyber-input py-1.5 text-xs font-mono text-center w-full"
                  />
                </div>
              ) : (
                <div className="p-2 bg-black/40 border border-white/10 rounded-xl font-mono text-xs text-cyan-400 text-center font-bold">
                  Titik Spesifik: {fmtMmSs(currentTime)}
                </div>
              )}
            </div>
          </div>
        )}

        {category === 'Musik' && !isOverallNote && (
          <div className="p-3 bg-cyan-400/10 border border-cyan-400/30 rounded-xl space-y-1.5">
            <label className="text-xs font-bold text-white flex items-center gap-1.5">
              <Music className="w-4 h-4 text-cyan-400" /> Upload Audio Referensi
            </label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => e.target.files && setMusicFile(e.target.files[0])}
              className="w-full text-xs text-neutral-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-400 file:text-black cursor-pointer"
            />
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-neutral-400 mb-1">Instruksi Catatan *</label>
          <input
            type="text"
            placeholder="Tulis instruksi perbaikan video secara rinci..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="cyber-input py-2.5 text-xs bg-black/60 border-white/15 focus:border-cyan-400"
          />
        </div>

        {/* Attachments preview grid */}
        <div className="flex items-center gap-2 flex-wrap">
          {drawingData && (
            <div className="relative">
              <img src={drawingData} alt="Coretan" className="w-20 h-14 object-cover rounded-xl border border-cyan-400 shadow-[0_0_12px_rgba(0,240,201,0.3)]" />
              <button
                type="button"
                onClick={() => setDrawingData(null)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-1 text-white shadow-md"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {attachFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-1.5 bg-black/60 border border-white/15 px-3 py-1.5 rounded-xl text-xs font-mono text-neutral-300">
              <ImageIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="truncate max-w-[120px]">{file.name}</span>
              <button
                type="button"
                onClick={() => setAttachFiles((prev) => prev.filter((_, i) => i !== idx))}
                className="ml-1 text-neutral-500 hover:text-white flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {category !== 'Musik' && (
            <label className="py-2 px-3 bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors">
              <Paperclip className="w-4 h-4 text-cyan-400" />
              <span>+ Lampirkan File ({attachFiles.length})</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files) {
                    setAttachFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
                className="hidden"
              />
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || (!commentText.trim() && !drawingData && attachFiles.length === 0 && !musicFile)}
          className="btn-cyber-primary py-3 text-xs w-full font-black flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'Mengirim Catatan...' : 'Kirim Catatan Revisi'}</span>
        </button>
      </form>

      {/* Footer */}
      <footer className="text-center pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-neutral-500">
        <SimbaIcon className="w-4 h-4" />
        <span>Vibe Coded By <strong>Abaalwi</strong></span>
      </footer>

      {/* ── MODALS (ALL WRAPPED IN PORTAL TO PREVENT BACKDROP BLUR BUGS) ───── */}
      <Portal>
        {/* ── Modal: SOP ──────────────────────────────────────────────────── */}
        {showSop && (
          <div onClick={() => setShowSop(false)} className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden top-0 left-0 right-0 bottom-0">
            <div onClick={(e) => e.stopPropagation()} className="glass-panel-elevated w-full max-w-sm space-y-4 p-5 relative rounded-2xl shadow-2xl">
              <button onClick={() => setShowSop(false)} className="absolute top-3.5 right-3.5 text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <h2 className="text-sm font-bold text-white">SOP Review & Revisi Project</h2>
              </div>
              <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
                {[
                  ['1. Tonton Penuh Dulu', 'Tonton seluruh video dari awal hingga akhir sebelum memberi catatan revisi.'],
                  ['2. Catatan Berbasis Detik (Timestamp)', 'Tentukan bagian video yang ingin direvisi dengan menandai detik posisi video agar tim editor dapat menemukan adegan secara presisi.'],
                  ['3. Lampiran & Catatan Tambahan', 'Unggah referensi foto/musik pendukung jika diperlukan dalam satu kali pengiriman revisi.'],
                  ['4. Konfirmasi Approval Final', 'Jika seluruh potongan video sudah sesuai dan disetujui, klik tombol "Approve" sebagai tanda pekerjaan selesai.'],
                  ['5. Permintaan File Mentah (RAW/Master)', 'Untuk meminta file mentah, silakan buat janji temu atau konfirmasi langsung dengan tim editor.'],
                ].map(([title, desc]) => (
                  <div key={title}>
                    <strong className="text-cyan-400 block font-semibold">{title}</strong>
                    <p className="text-neutral-400 text-[11px] mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowSop(false)} className="btn-cyber-primary py-2.5 text-xs">
                <Check className="w-3.5 h-3.5" /> Paham, Mulai Review
              </button>
            </div>
          </div>
        )}

        {/* ── Modal: Revision List Pop-up ──────────────────────────────────── */}
        {showRevList && (
          <div onClick={() => setShowRevList(false)} className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-hidden top-0 left-0 right-0 bottom-0">
            <div onClick={(e) => e.stopPropagation()} className="glass-panel-elevated w-full sm:max-w-lg max-h-[85vh] my-auto flex flex-col rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                <h3 className="font-bold text-sm text-white">Catatan Revisi ({comments.length})</h3>
                <button onClick={() => setShowRevList(false)} className="text-neutral-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {comments.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-6 text-center">Belum ada catatan.</p>
                ) : comments.map((c) => {
                  const attachments = getAttachmentUrls(c.attachment_url);
                  return (
                    <div key={c.id} className="bg-black/50 p-3 rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setShowRevList(false); if (!hasUnsaved) seekTo(c.timestamp_seconds); else setShowUnsavedWarn(true); }}
                            className="font-mono text-[11px] text-cyan-400 bg-cyan-400/15 border border-cyan-400/30 px-2 py-0.5 rounded-full font-bold hover:bg-cyan-400/25"
                          >
                            {fmtMmSs(c.timestamp_seconds)}{c.timestamp_end_seconds ? ` - ${fmtMmSs(c.timestamp_end_seconds)}` : ''}
                          </button>
                          {c.category && <span className="text-[10px] text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{c.category}</span>}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${c.author_type === 'editor' ? 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                          {c.author_type === 'editor' ? 'Ditanggapi' : 'Perlu Revisi'}
                        </span>
                      </div>

                      {c.content && <p className="text-xs text-neutral-200">{c.content}</p>}

                      {c.drawing_data && <img src={c.drawing_data} alt="Coretan" className="max-w-[180px] rounded border border-white/10" />}

                      {/* Render multiple attachments */}
                      {attachments.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold text-neutral-400 block">Lampiran ({attachments.length}):</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {attachments.map((attUrl, aIdx) => (
                              <a
                                key={aIdx}
                                href={getFullMediaUrl(attUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-cyan-400 hover:underline font-mono bg-cyan-400/10 border border-cyan-400/20 px-2 py-1 rounded-lg inline-flex items-center gap-1"
                              >
                                <FileIcon className="w-3 h-3" /> Lampiran #{aIdx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Unsaved Warning ──────────────────────────────────────── */}
        {showUnsavedWarn && (
          <div onClick={() => setShowUnsavedWarn(false)} className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden top-0 left-0 right-0 bottom-0">
            <div onClick={(e) => e.stopPropagation()} className="glass-panel-elevated p-5 max-w-sm w-full space-y-4 text-center border-red-500/40 rounded-2xl shadow-2xl">
              <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-white">Catatan Belum Dikirim!</h3>
                <p className="text-xs text-neutral-300 mt-1.5">Kirim atau hapus catatan revisi yang sedang Anda isi sebelum melanjutkan video.</p>
              </div>
              <button onClick={() => setShowUnsavedWarn(false)} className="btn-cyber-primary py-2.5 text-xs">Mengerti</button>
            </div>
          </div>
        )}

        {/* ── Modal: Finish Review ────────────────────────────────────────── */}
        {showFinishReviewModal && (
          <div onClick={() => setShowFinishReviewModal(false)} className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden top-0 left-0 right-0 bottom-0">
            <div onClick={(e) => e.stopPropagation()} className="glass-panel-elevated p-6 max-w-sm w-full space-y-4 border-red-500/40 shadow-2xl rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white">Selesai Melakukan Review?</h3>
                <p className="text-xs text-neutral-300 leading-relaxed bg-red-950/20 border border-red-500/20 p-2.5 rounded-xl text-left">
                  ⏱️ <strong>Estimasi Pengerjaan Revisi:</strong><br />
                  Paling cepat <strong>1x24 jam</strong> dan paling lambat <strong>1 minggu</strong> setelah catatan dikirim.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1 text-left">Catatan Akhir / Pesan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  value={finalReviewNote}
                  onChange={(e) => setFinalReviewNote(e.target.value)}
                  placeholder="Tulis instruksi tambahan atau pesan untuk editor..."
                  className="cyber-input py-2 text-xs w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button onClick={() => setShowFinishReviewModal(false)} className="btn-cyber-secondary py-2.5 text-xs">
                  Batal
                </button>
                <button
                  onClick={handleFinishReview}
                  disabled={isFinishing}
                  className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1"
                >
                  {isFinishing ? 'Mengirim...' : 'Kirim WA Editor'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Approve Confirmation ─────────────────────────────────── */}
        {showApproveConfirm && (
          <div onClick={() => setShowApproveConfirm(false)} className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden top-0 left-0 right-0 bottom-0">
            <div onClick={(e) => e.stopPropagation()} className="glass-panel-elevated p-6 max-w-sm w-full space-y-4 text-center border-cyan-400/40 rounded-2xl shadow-2xl">
              <CheckCircle2 className="w-12 h-12 text-cyan-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-white">Konfirmasi Approval Final</h3>
                <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                  Apakah video ini sudah sesuai dan siap di-approve sebagai persetujuan final? Jika belum, silakan tekan tombol <strong>Selesai Review</strong> saja.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={() => {
                    setShowApproveConfirm(false);
                    setShowFinishReviewModal(true);
                  }}
                  className="py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-xl text-xs font-bold"
                >
                  Selesai Review
                </button>
                <button onClick={handleApprove} className="btn-cyber-primary py-2.5 text-xs font-black">
                  Ya, Approve Final
                </button>
              </div>
            </div>
          </div>
        )}
      </Portal>
    </div>
  );
}
