'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Share2, FileText, MessageCircle } from 'lucide-react';
import VideoPlayer from '../../../components/player/VideoPlayer';
import CommentSheet from '../../../components/comment/CommentSheet';
import { fetchApi, getFullMediaUrl } from '../../../lib/api-client';
import { Project } from '@reviewii/shared-types';
import { useToast } from '../../../components/Toast';

export default function EditorProjectPage() {
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'chat'>('review');
  const [chatMessage, setChatMessage] = useState('');

  const { data: project, refetch } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => fetchApi<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
    staleTime: 30000,
    gcTime: 300000,
  });

  if (!project) {
    return <div className="p-8 text-center text-neutral-400">Memuat detail project…</div>;
  }

  const versions = project.versions || [];
  const currentVersion = versions[currentVersionIndex] || versions[0];
  const comments = currentVersion?.comments || [];

  const handleExportPdf = () => {
    window.open(getFullMediaUrl(`/projects/${projectId}/export-pdf`), '_blank');
  };

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    try {
      await fetchApi(`/projects/${projectId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          author_name: 'Naufal (Editor)',
          author_type: 'editor',
          content: chatMessage,
        }),
      });
      setChatMessage('');
      refetch();
    } catch (e) {
      toast.error('Gagal mengirim pesan chat.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header Bar */}
      <header className="px-4 py-3 bg-[#0F172A] border-b border-white/10 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Kembali" className="p-1 text-neutral-300 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-sm text-white leading-tight">{project.title}</h1>
            <p className="text-xs text-neutral-400">{project.client_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            title="Export Laporan Revisi PDF"
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-[#2563FF] rounded-xl text-xs flex items-center gap-1 font-semibold"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={() => {
              const guestToken = project.guest_tokens?.[0]?.token;
              const link = guestToken ? `${window.location.origin}/review/${guestToken}` : window.location.href;
              navigator.clipboard.writeText(link);
              toast.success('Guest link disalin!');
            }}
            className="p-2 bg-[#2563FF] hover:bg-[#1A46CC] text-white rounded-xl text-xs flex items-center gap-1 font-bold shadow-md"
          >
            <Share2 className="w-4 h-4" /> Link Klien
          </button>
        </div>
      </header>

      {/* Main Tabs (Review Player vs General Project Chat) */}
      <div className="flex border-b border-white/10 bg-[#0F172A]">
        <button
          onClick={() => setActiveTab('review')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${
            activeTab === 'review' ? 'border-[#2563FF] text-[#2563FF]' : 'border-transparent text-neutral-400'
          }`}
        >
          🎬 Video Player & Review
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-colors ${
            activeTab === 'chat' ? 'border-[#2563FF] text-[#2563FF]' : 'border-transparent text-neutral-400'
          }`}
        >
          💬 Chat Diskusi ({project.chat_messages?.length || 0})
        </button>
      </div>

      {activeTab === 'review' ? (
        <div className="flex-1 flex flex-col justify-center">
          <VideoPlayer
            versions={versions}
            currentVersionIndex={currentVersionIndex}
            onVersionChange={(idx) => setCurrentVersionIndex(idx)}
            onOpenComments={() => setIsCommentSheetOpen(true)}
            onRefreshProject={() => refetch()}
            authorName="Naufal (Editor)"
          />
        </div>
      ) : (
        /* Chat / DM Tab */
        <div className="flex-1 flex flex-col bg-[#0F172A] p-4">
          <div className="flex-1 space-y-3 overflow-y-auto mb-4">
            {project.chat_messages?.length === 0 ? (
              <p className="text-center text-xs text-neutral-500 py-8">Belum ada obrolan umum untuk project ini.</p>
            ) : (
              project.chat_messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-2xl max-w-[80%] text-xs space-y-1 ${
                    msg.author_type === 'editor'
                      ? 'ml-auto bg-[#2563FF] text-white rounded-br-none'
                      : 'bg-neutral-800 text-neutral-200 rounded-bl-none'
                  }`}
                >
                  <span className="font-semibold block text-[11px] opacity-80">{msg.author_name}</span>
                  <p>{msg.content}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Tulis pesan diskusikan project..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
              className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#2563FF]"
            />
            <button onClick={handleSendChatMessage} className="p-2.5 bg-[#2563FF] hover:bg-[#1A46CC] text-white rounded-xl">
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Swipe-up Comment Sheet */}
      {currentVersion && (
        <CommentSheet
          versionId={currentVersion.id}
          comments={comments}
          isOpen={isCommentSheetOpen}
          onClose={() => setIsCommentSheetOpen(false)}
          onSeekToTimestamp={(t) => {
            setIsCommentSheetOpen(false);
          }}
          onRefreshComments={() => refetch()}
          authorName="Naufal (Editor)"
        />
      )}
    </div>
  );
}
