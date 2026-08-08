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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end">
      <div className="bg-[#1E293B] rounded-t-3xl border-t border-white/10 max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Sheet Drag Handle & Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#2563FF]" />
            <h3 className="font-bold text-white text-sm">Catatan Revisi ({comments.length})</h3>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white rounded-full">
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>

        {/* Comments List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {comments.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-8">Belum ada komentar pada versi ini.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="bg-black/30 p-3 rounded-xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">{c.author_name}</span>
                  <button
                    onClick={() => onSeekToTimestamp(c.timestamp_seconds)}
                    className="text-[10px] font-mono text-[#2563FF] bg-[#2563FF]/10 px-2 py-0.5 rounded border border-[#2563FF]/30"
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
                  <div className="pl-3 border-l-2 border-[#2563FF]/30 space-y-1 mt-2">
                    {c.replies.map((r) => (
                      <div key={r.id} className="text-xs">
                        <strong className="text-[#2563FF]">{r.author_name}: </strong>
                        <span className="text-neutral-300">{r.content}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Button */}
                <button
                  onClick={() => setActiveReplyId(activeReplyId === c.id ? null : c.id)}
                  className="text-[11px] text-neutral-400 hover:text-white underline mt-1"
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
                      className="bg-black/50 border border-white/10 rounded-lg px-3 py-1 text-xs text-white flex-1 focus:outline-none focus:border-[#2563FF]"
                    />
                    <button
                      onClick={() => handleSendReply(c.id)}
                      className="bg-[#2563FF] text-white text-xs px-3 py-1 rounded-lg font-medium"
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
        <div className="p-3 bg-[#0F172A] border-t border-white/10 flex items-center gap-2">
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
                className="p-2 text-neutral-400 hover:text-[#2563FF] bg-black/40 rounded-xl border border-white/10"
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
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#2563FF]"
              />
              <button
                onClick={handleSendText}
                className="p-2 bg-[#2563FF] hover:bg-[#1A46CC] text-white rounded-xl shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
