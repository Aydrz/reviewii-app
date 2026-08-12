'use client';

import { useState } from 'react';
import { Send, Mic, Heart, ThumbsUp, MessageSquare, ChevronDown } from 'lucide-react';
import { Comment } from '@reviewii/shared-types';
import VoiceRecorder from './VoiceRecorder';
import { fetchApi, getFullMediaUrl } from '../../lib/api-client';
import { useToast } from '../Toast';

interface CommentSheetProps {
  versionId: string;
  comments: Comment[];
  isOpen: boolean;
  onClose: () => void;
  onSeekToTimestamp: (timestamp: number) => void;
  onRefreshComments: () => void;
  authorName?: string;
  guestToken?: string;
}

import Portal from '../Portal';

export default function CommentSheet({
  versionId,
  comments,
  isOpen,
  onClose,
  onSeekToTimestamp,
  onRefreshComments,
  authorName = 'Reviewer',
  guestToken,
}: CommentSheetProps) {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  if (!isOpen) return null;

  const handleSendText = async () => {
    if (!content.trim()) return;
    try {
      await fetchApi(`/versions/${versionId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          author_name: authorName,
          author_type: guestToken ? 'guest' : 'editor',
          comment_type: 'text',
          content,
          timestamp_seconds: 0,
        }),
      });
      setContent('');
      toast.success('Komentar berhasil dikirim!');
      onRefreshComments();
    } catch (e) {
      toast.error('Gagal mengirim komentar.');
    }
  };

  const handleVoiceRecorded = async (voiceUrl: string) => {
    try {
      await fetchApi(`/versions/${versionId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          author_name: authorName,
          author_type: guestToken ? 'guest' : 'editor',
          comment_type: 'voice',
          voice_url: voiceUrl,
          timestamp_seconds: 0,
        }),
      });
      setShowVoiceRecorder(false);
      toast.success('Pesan suara berhasil dikirim!');
      onRefreshComments();
    } catch (e) {
      toast.error('Gagal menyimpan komentar suara.');
    }
  };

  const handleSendReply = async (commentId: string) => {
    if (!replyContent.trim()) return;
    try {
      await fetchApi(`/comments/${commentId}/replies`, {
        method: 'POST',
        body: JSON.stringify({
          author_name: authorName,
          author_type: guestToken ? 'guest' : 'editor',
          content: replyContent,
        }),
      });
      setReplyContent('');
      setActiveReplyId(null);
      toast.success('Balasan berhasil dikirim!');
      onRefreshComments();
    } catch (e) {
      toast.error('Gagal mengirim balasan.');
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex flex-col justify-end">
        <div className="bg-[#0f172a] rounded-t-3xl border-t border-white/15 max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
          {/* Sheet Drag Handle & Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-white text-sm">Catatan Revisi ({comments.length})</h3>
            </div>
            <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white rounded-full">
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>

          {/* Comments List */}
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-8">Belum ada komentar pada versi ini.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{c.author_name}</span>
                    <button
                      onClick={() => onSeekToTimestamp(c.timestamp_seconds)}
                      className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/30"
                    >
                      {Math.floor(c.timestamp_seconds / 60)}:
                      {(Math.floor(c.timestamp_seconds % 60) < 10 ? '0' : '') + Math.floor(c.timestamp_seconds % 60)}
                    </button>
                  </div>

                  {c.content && <p className="text-xs text-neutral-300">{c.content}</p>}

                  {c.comment_type === 'voice' && c.voice_url && (
                    <audio controls src={getFullMediaUrl(c.voice_url)} className="w-full h-8 max-w-xs my-1" />
                  )}

                  {c.drawing_data && (
                    <img src={c.drawing_data} alt="Coretan" className="max-w-[180px] rounded-lg border border-white/10 my-1" />
                  )}

                  {/* Replies List */}
                  {c.replies && c.replies.length > 0 && (
                    <div className="pl-3 border-l-2 border-cyan-400/30 space-y-1 mt-2">
                      {c.replies.map((r) => (
                        <div key={r.id} className="text-xs">
                          <strong className="text-cyan-400">{r.author_name}: </strong>
                          <span className="text-neutral-300">{r.content}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Button */}
                  <button
                    onClick={() => setActiveReplyId(activeReplyId === c.id ? null : c.id)}
                    className="text-[11px] text-neutral-400 hover:text-cyan-400 underline mt-1 cursor-pointer"
                  >
                    Balas
                  </button>

                  {/* Reply Input Form */}
                  {activeReplyId === c.id && (
                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        placeholder="Tulis balasan..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-3 py-1 text-xs text-white flex-1 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={() => handleSendReply(c.id)}
                        className="bg-cyan-400 text-black font-bold text-xs px-3 py-1 rounded-lg hover:brightness-110"
                      >
                        Kirim
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input Bar Footer */}
          <div className="p-3 bg-[#0c1017] border-t border-white/10 flex items-center gap-2">
            {showVoiceRecorder ? (
              <VoiceRecorder
                guestToken={guestToken}
                onVoiceRecorded={handleVoiceRecorded}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            ) : (
              <>
                <button
                  onClick={() => setShowVoiceRecorder(true)}
                  className="p-2 text-neutral-400 hover:text-cyan-400 bg-black/40 rounded-xl border border-white/10"
                  title="Komentar Suara"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Tulis catatan revisi..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendText();
                  }}
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleSendText}
                  className="p-2.5 bg-cyan-400 hover:bg-cyan-300 text-black font-bold rounded-xl shadow-md"
                >
                  <Send className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
