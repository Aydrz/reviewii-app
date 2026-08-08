'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Plus, Copy, FileText, Trash2, ExternalLink, Search, Film,
  CheckCircle2, Clock, AlertCircle, AlertTriangle, Sparkles,
  MessageSquare, Edit3, X, Bell, KeyRound, Share2,
} from 'lucide-react';
import { fetchApi, uploadFileApi, getFullMediaUrl } from '../../lib/api-client';
import { Project, Comment } from '@reviewii/shared-types';
import SimbaIcon from '../../components/SimbaIcon';
import { useToast } from '../../components/Toast';

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

// ── config ───────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:  { label: 'Pending',       cls: 'bg-amber-500/15 text-amber-400  border-amber-500/30',  Icon: Clock         },
  revisi:   { label: 'Perlu Revisi',  cls: 'bg-red-500/15   text-red-400    border-red-500/30',    Icon: AlertCircle   },
  approved: { label: 'Approved',      cls: 'bg-cyan-400/15  text-cyan-400   border-cyan-400/30',   Icon: CheckCircle2  },
} as const;

type StatusKey = keyof typeof STATUS_CFG;

const FILTERS = [
  { id: 'all',      label: 'Semua Status'   },
  { id: 'pending',  label: 'Pending'        },
  { id: 'revisi',   label: 'Perlu Revisi'   },
  { id: 'approved', label: 'Approved'       },
];

const EMPTY_MSG: Record<string, string> = {
  all:      'Belum ada project yang dibuat. Klik "+ Upload Video" untuk memulai.',
  pending:  'Tidak ada project dengan status Pending saat ini.',
  revisi:   'Tidak ada project yang memerlukan Revisi saat ini.',
  approved: 'Belum ada project yang disetujui (Approved).',
};

import Portal from '../../components/Portal';

export default function AdminDashboardPage() {
  const { toast, confirmModal } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Edit Project Modal state
  const [editProjectTarget, setEditProjectTarget] = useState<Project | null>(null);
  const [editClientName, setEditClientName] = useState<string>('');
  const [editClientContact, setEditClientContact] = useState<string>('');
  const [editEditorPhone, setEditEditorPhone] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [isUpdatingProject, setIsUpdatingProject] = useState<boolean>(false);

  // Notes drawer / modal state
  const [notesProjectId, setNotesProjectId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null); // 'edit-id' | 'reply-id'
  const [editingNoteText, setEditingNoteText] = useState<string>('');
  const [replyText, setReplyText] = useState<string>('');
  const [noteActionBusy, setNoteActionBusy] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);

  useEffect(() => {
    if (localStorage.getItem('show_welcome_banner') === 'true') {
      setShowWelcome(true);
      localStorage.removeItem('show_welcome_banner');
    }
  }, []);

  const { data: projects = [], isLoading, refetch } = useQuery<Project[]>({
    queryKey: ['projects', statusFilter, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (statusFilter !== 'all') p.set('status', statusFilter);
      if (search) p.set('search', search);
      return fetchApi<Project[]>(`/projects?${p.toString()}`);
    },
    refetchInterval: 10000,
  });

  // Calculate revisions count
  const revisiCount = projects.reduce((acc, p) => {
    const comments = p.versions?.[0]?.comments || [];
    return acc + (p.status === 'revisi' || comments.length > 0 ? 1 : 0);
  }, 0);

  const notesProject = projects.find((p) => p.id === notesProjectId);
  const notesComments: Comment[] = notesProject?.versions?.[0]?.comments || [];

  const refetchNotes = async () => {
    if (!notesProjectId) return;
    await refetch();
  };

  const handleSaveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProjectTarget) return;
    setIsUpdatingProject(true);
    try {
      await fetchApi(`/projects/${editProjectTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          client_name: editClientName,
          client_contact: editClientContact,
          editor_phone: editEditorPhone,
          title: editTitle,
        }),
      });
      toast.success('Detail project berhasil diperbarui!');
      setEditProjectTarget(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengedit project.');
    } finally {
      setIsUpdatingProject(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetchApi(`/projects/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success(`Project "${deleteTarget.title}" berhasil dihapus.`);
      setDeleteTarget(null);
      refetch();
    } catch {
      toast.error('Gagal menghapus project.');
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    setNoteActionBusy(true);
    try {
      await fetchApi(`/comments/${commentId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ author_name: 'Editor Kominfotapin', content: replyText, author_type: 'editor' }),
      });
      setReplyText('');
      setEditingNoteId(null);
      toast.success('Balasan berhasil dikirim!');
      await refetchNotes();
      refetch();
    } catch {
      toast.error('Gagal mengirim balasan.');
    } finally {
      setNoteActionBusy(false);
    }
  };

  const handleUpdateNote = async (commentId: string) => {
    if (!editingNoteText.trim()) return;
    setNoteActionBusy(true);
    try {
      await fetchApi(`/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: editingNoteText }),
      });
      setEditingNoteId(null);
      setEditingNoteText('');
      toast.success('Catatan berhasil diperbarui!');
      await refetchNotes();
      refetch();
    } catch {
      toast.error('Gagal memperbarui catatan.');
    } finally {
      setNoteActionBusy(false);
    }
  };

  const handleDeleteNote = async (commentId: string) => {
    if (!confirm('Hapus catatan revisi ini?')) return;
    try {
      await fetchApi(`/comments/${commentId}`, { method: 'DELETE' });
      await refetchNotes();
      refetch();
    } catch { alert('Gagal menghapus catatan.'); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-12 animate-fade-in">

      {/* ── Welcome Banner ─────────────────────────────────────────────── */}
      {showWelcome && (
        <div className="glass-panel p-3 flex items-center justify-between gap-3 border-cyan-400/25 bg-cyan-400/8">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <p className="text-xs text-white font-bold">Selamat datang kembali, <span className="text-cyan-400">Kominfotapin</span>!</p>
          </div>
          <button onClick={() => setShowWelcome(false)} className="text-neutral-500 hover:text-white flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Revision Notification ──────────────────────────────────────── */}
      {revisiCount > 0 && statusFilter !== 'revisi' && (
        <button
          onClick={() => setStatusFilter('revisi')}
          className="w-full flex items-center gap-2.5 p-3 bg-red-500/10 border border-red-500/30 rounded-xl hover:bg-red-500/15 transition-colors text-left"
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse-red flex-shrink-0" />
          <Bell className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs font-bold text-red-300">
            {revisiCount} project memerlukan revisi
          </p>
          <span className="ml-auto text-[10px] text-red-400 font-mono">Lihat &rarr;</span>
        </button>
      )}

      {/* ── Page Header — 1 line, compact, no icon beside title ───────── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-sm font-black text-white tracking-tight">Dashboard Admin Project</h1>
        <Link
          href="/upload"
          className="btn-cyber-primary py-2 px-4 text-[11px] flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Upload Video
        </Link>
      </div>

      {/* ── Search + Filter ────────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari project atau klien (Contoh: Abaalwi)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="cyber-input cyber-input-has-icon py-2.5 text-xs"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setStatusFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap flex-shrink-0 transition-all border ${
                statusFilter === id
                  ? 'bg-cyan-400/15 text-cyan-400 border-cyan-400/35 shadow-[0_0_8px_rgba(0,240,201,0.15)]'
                  : 'bg-white/4 text-neutral-400 hover:text-white border-white/8 hover:bg-white/8'
              }`}
            >
              {label}
              {id === 'revisi' && revisiCount > 0 && (
                <span className="ml-1.5 text-[10px] bg-red-500/25 text-red-400 border border-red-500/30 px-1.5 py-px rounded-full font-mono">
                  {revisiCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Project List ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="text-center py-12 space-y-2">
          <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <p className="text-[11px] text-neutral-500 font-mono">Memuat project...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-panel p-10 text-center space-y-3">
          <Film className="w-9 h-9 text-neutral-600 mx-auto" />
          <p className="text-xs text-neutral-400 font-medium">{EMPTY_MSG[statusFilter]}</p>
          {statusFilter === 'all' && (
            <Link href="/upload" className="btn-cyber-primary py-2 px-5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Upload Sekarang
            </Link>
          )}
          {statusFilter !== 'all' && (
            <button onClick={() => setStatusFilter('all')} className="btn-cyber-secondary py-1.5 px-4 text-xs">
              Lihat Semua Project
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => {
            const ver = project.versions?.[0];
            // Use _count (from findAll) or fall back to comments array length
            const commentsCount = (ver as any)?._count?.comments ?? ver?.comments?.length ?? 0;
            const guestToken = project.guest_tokens?.[0]?.token;
            const guestUrl = guestToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/review/${guestToken}` : '';
            const st = STATUS_CFG[project.status as StatusKey] ?? STATUS_CFG.pending;
            const StatusIcon = st.Icon;
            const mediaUrl = getFullMediaUrl(ver?.proxy_url || ver?.file_url);
            const hasRevisions = commentsCount > 0;

            return (
              <div
                key={project.id}
                className={`glass-panel p-3 flex items-center gap-3 transition-all hover:border-white/15 ${
                  project.status === 'revisi' ? 'border-red-500/20' : ''
                }`}
              >
                {/* Thumbnail */}
                <div className="w-[68px] h-[48px] rounded-lg bg-black/80 overflow-hidden flex-shrink-0 border border-white/8 flex items-center justify-center">
                  {ver?.file_type === 'photo' && mediaUrl ? (
                    <img src={mediaUrl} alt={project.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : mediaUrl ? (
                    <video src={mediaUrl} className="w-full h-full object-cover" preload="none" />
                  ) : (
                    <Film className="w-4 h-4 text-neutral-700" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-white truncate leading-tight">{project.title}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-px rounded-full font-bold border flex-shrink-0 ${st.cls}`}>
                      <StatusIcon className="w-2.5 h-2.5" />{st.label}
                    </span>
                    {project.guest_tokens?.[0]?.pin_code ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 px-2 py-0.5 rounded-md font-mono font-bold">
                        <KeyRound className="w-3 h-3 text-cyan-400" /> PIN: {project.guest_tokens[0].pin_code}
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-500 font-mono">Tanpa PIN</span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 truncate leading-tight">
                    Klien: <strong className="text-neutral-300">{project.client_name}</strong> <span className="text-neutral-700">&bull;</span> <span className="font-mono">{new Date(project.created_at).toLocaleDateString('id-ID')}</span>
                  </p>
                  <button
                    onClick={() => { setNotesProjectId(project.id); setEditingNoteId(null); setReplyText(''); }}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold transition-colors ${
                      hasRevisions ? 'text-pink-400 hover:text-pink-300' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    {commentsCount} Catatan Revisi
                  </button>
                </div>

                {/* Action Icons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditProjectTarget(project);
                      setEditClientName(project.client_name);
                      setEditTitle(project.title);
                      setEditClientContact(project.client_contact || '');
                      setEditEditorPhone(project.editor_phone || '087824006766');
                    }}
                    title="Edit Detail Project & Klien"
                    className="icon-btn text-amber-400 hover:text-amber-300"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (guestUrl) {
                        const pin = project.guest_tokens?.[0]?.pin_code;
                        let text = guestUrl;
                        if (pin) text += `\nKode PIN: ${pin}`;
                        navigator.clipboard.writeText(text);
                        toast.success('Link review & PIN berhasil disalin!');
                      }
                    }}
                    title="Salin Link & PIN"
                    className="icon-btn group"
                  >
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Yth. Bapak/Ibu ${project.client_name || 'Klien'},\n\nSemoga Bapak/Ibu dalam keadaan sehat.\n\nSehubungan dengan penyelesaian project video "${project.title}", kami ingin mengajukan hasil pekerjaan tersebut untuk direviu melalui tautan berikut:\n\nTautan: ${guestUrl}\nKode PIN: ${project.guest_tokens?.[0]?.pin_code || 'Tanpa PIN'}\n\nBapak/Ibu dapat menyalin PIN di atas saat membuka tautan untuk memberikan tanggapan atau saran perbaikan sesuai dengan SOP Review kami.\n\nAtas perhatian dan kerjasamanya, kami ucapkan terima kasih.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Kirim WA Formal ke Klien"
                    className="icon-btn text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border-emerald-500/20"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/projects/${project.id}/export-pdf`}
                    target="_blank" rel="noreferrer"
                    title="Export PDF"
                    className="icon-btn"
                  >
                    <FileText className="w-3.5 h-3.5 text-violet-400" />
                  </a>

                  {guestToken && (
                    <Link href={`/review/${guestToken}`} target="_blank" title="Buka Halaman Reviewer" className="icon-btn">
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                    </Link>
                  )}

                  <button
                    onClick={() => setDeleteTarget({ id: project.id, title: project.title })}
                    title="Hapus Project"
                    className="icon-btn text-neutral-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <footer className="text-center pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-neutral-600">
        <SimbaIcon className="w-3.5 h-3.5" />
        Vibe Coded By <strong className="text-neutral-400">Abaalwi</strong>
      </footer>

      {/* ── MODALS (ALL WRAPPED IN PORTAL TO PREVENT BACKDROP BLUR BUGS) ───── */}
      <Portal>
        {/* ── MODAL: Edit Detail Project & Klien ───────────────────────── */}
        {editProjectTarget && (
          <div
            onClick={() => setEditProjectTarget(null)}
            className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden top-0 left-0 right-0 bottom-0 animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-panel-elevated p-6 max-w-sm w-full space-y-4 border-amber-500/30 shadow-2xl rounded-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" /> Edit Detail Project
                </h3>
                <button onClick={() => setEditProjectTarget(null)} className="text-neutral-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProjectEdit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">Nama Klien</label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    required
                    className="cyber-input py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">Judul Project</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="cyber-input py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">No. WA Klien</label>
                  <input
                    type="text"
                    value={editClientContact}
                    onChange={(e) => setEditClientContact(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="cyber-input py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 mb-1">No. WA Editor (Penerima Notif)</label>
                  <input
                    type="text"
                    value={editEditorPhone}
                    onChange={(e) => setEditEditorPhone(e.target.value)}
                    placeholder="Contoh: 087824006766"
                    className="cyber-input py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button type="button" onClick={() => setEditProjectTarget(null)} className="btn-cyber-secondary py-2 text-xs">
                    Batal
                  </button>
                  <button type="submit" disabled={isUpdatingProject} className="btn-cyber-primary py-2 text-xs">
                    {isUpdatingProject ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── MODAL: Kelola Catatan Revisi ───────────────────────────────── */}
        {notesProject && (
          <div
            onClick={() => { setNotesProjectId(null); setEditingNoteId(null); }}
            className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden top-0 left-0 right-0 bottom-0 animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-panel-elevated max-w-lg w-full max-h-[85vh] flex flex-col border-cyan-400/30 shadow-2xl rounded-2xl"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Catatan Revisi: {notesProject.title}
                  </h3>
                  <p className="text-[11px] text-neutral-400">Klien: {notesProject.client_name}</p>
                </div>
                <button onClick={() => { setNotesProjectId(null); setEditingNoteId(null); }} className="text-neutral-500 hover:text-white ml-4 flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {!notesProject?.versions?.[0]?.comments?.length ? (
                  <div className="py-10 text-center space-y-2">
                    <MessageSquare className="w-8 h-8 text-neutral-700 mx-auto" />
                    <p className="text-xs text-neutral-500">Belum ada catatan revisi dari reviewer.</p>
                  </div>
                ) : (
                  notesComments.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-black/40 border border-white/8 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className="text-white font-semibold">{c.author_name}</strong>
                          {c.category && (
                            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-px rounded font-mono">
                              {c.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 border border-cyan-400/25 px-1.5 py-px rounded">
                            {fmtTime(c.timestamp_seconds)}{c.timestamp_end_seconds ? ` - ${fmtTime(c.timestamp_end_seconds)}` : ''}
                          </span>
                          <button
                            onClick={() => { setEditingNoteId(`edit-${c.id}`); setEditingNoteText(c.content || ''); }}
                            className="p-1 text-neutral-400 hover:text-cyan-400 rounded"
                            title="Edit Catatan"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(c.id)}
                            className="p-1 text-neutral-400 hover:text-red-400 rounded"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => { setEditingNoteId(`reply-${c.id}`); setReplyText(''); }}
                            className="p-1 text-neutral-400 hover:text-white rounded text-[10px] font-bold underline"
                            title="Balas Catatan"
                          >
                            Balas
                          </button>
                        </div>
                      </div>

                      {c.content && <p className="text-neutral-300 leading-relaxed">{c.content}</p>}

                      {/* Drawing Preview */}
                      {c.drawing_data && (
                        <img src={c.drawing_data} alt="Coretan" className="max-w-[180px] rounded-lg border border-white/10" />
                      )}

                      {/* Attachment */}
                      {(() => {
                        const attachments = c.attachment_url ? c.attachment_url.split(',').filter(Boolean) : [];
                        if (attachments.length === 0) return null;
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {attachments.map((attUrl, aIdx) => (
                              <a
                                key={aIdx}
                                href={getFullMediaUrl(attUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-cyan-400 hover:underline font-mono bg-cyan-400/10 border border-cyan-400/25 px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                              >
                                Lampiran #{aIdx + 1} &rarr;
                              </a>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: Konfirmasi Hapus ─────────────────────────────────────── */}
        {deleteTarget && (
          <div
            onClick={() => setDeleteTarget(null)}
            className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden top-0 left-0 right-0 bottom-0 animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-panel-elevated p-6 max-w-xs w-full space-y-4 text-center border-red-500/30 shadow-2xl rounded-2xl"
            >
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-white">Hapus Project?</h3>
                <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                  <span className="font-semibold text-white">"{deleteTarget.title}"</span> akan dihapus permanen beserta semua catatan dan link review kliennya.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDeleteTarget(null)} className="btn-cyber-secondary py-2 text-xs">
                  Batal
                </button>
                <button onClick={confirmDelete} className="py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40 rounded-xl font-bold text-xs">
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </Portal>
    </div>
  );
}
