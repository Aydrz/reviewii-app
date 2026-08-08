'use client';

import { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, Copy, Share2, ExternalLink, ShieldCheck, KeyRound, Clock, Zap } from 'lucide-react';
import { fetchApi, uploadFileApi, UploadProgressInfo } from '../../lib/api-client';
import { Project } from '@reviewii/shared-types';
import SimbaIcon from '../../components/SimbaIcon';
import { useToast } from '../../components/Toast';

function buildWaText(clientName: string, title: string, url: string, pin?: string | null) {
  return `Yth. Bapak/Ibu ${clientName || 'Klien'},

Semoga Bapak/Ibu dalam keadaan sehat.

Sehubungan dengan penyelesaian project video "${title}", kami ingin mengajukan hasil pekerjaan tersebut untuk direviu melalui tautan berikut:

Tautan: ${url}
Kode PIN: ${pin || 'Tanpa PIN'}

Bapak/Ibu dapat menyalin PIN di atas saat membuka tautan untuk memberikan tanggapan atau saran perbaikan sesuai dengan SOP Review kami.

Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.`;
}

export default function AdminUploadPage() {
  const { toast } = useToast();
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [title, setTitle] = useState('');
  const [enablePin, setEnablePin] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [createdResult, setCreatedResult] = useState<{ url: string; pin?: string | null } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('editor_token');
    if (!token) {
      window.location.href = '/login';
    }
  }, []);

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !title || !selectedFile) {
      toast.error('Nama klien, judul project, dan file wajib diisi!');
      return;
    }
    setIsSubmitting(true);
    setUploadProgress({ loaded: 0, total: selectedFile.size, percentage: 0, speedBps: 0, remainingSec: 0 });

    try {
      const project = await fetchApi<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify({
          client_name: clientName,
          client_contact: clientContact,
          title,
          enable_pin: enablePin,
        }),
      });

      const fileType = selectedFile.type.startsWith('image/') ? 'photo' : 'video';
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('file_type', fileType);

      await uploadFileApi(`/projects/${project.id}/versions`, formData, (prog) => {
        setUploadProgress(prog);
      });

      const guestTokenObj = project.guest_tokens?.[0];
      const guestUrl = guestTokenObj?.token ? `${window.location.origin}/review/${guestTokenObj.token}` : '';
      setCreatedResult({
        url: guestUrl,
        pin: guestTokenObj?.pin_code,
      });
      toast.success('Project & video berhasil diunggah!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengupload project.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const copyLinkAndPin = () => {
    if (!createdResult?.url) return;
    let textToCopy = createdResult.url;
    if (createdResult.pin) {
      textToCopy += `\nKode PIN Review: ${createdResult.pin}`;
    }
    navigator.clipboard.writeText(textToCopy);
    toast.success('Link review & Kode PIN berhasil disalin!');
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-base sm:text-lg font-black text-white">Upload Video / Project Baru</h1>
        <p className="text-xs text-neutral-400 mt-0.5">Upload draft video/foto, dapatkan link review & PIN opsional untuk dikirim ke klien.</p>
      </div>

      {!createdResult ? (
        <form onSubmit={handleSubmit} className="glass-panel-elevated p-4 sm:p-5 space-y-4 relative">
          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-300 mb-1">Nama Klien *</label>
              <input
                type="text"
                placeholder="Contoh: Abaalwi"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="cyber-input py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-300 mb-1">Kontak (WA/Email)</label>
              <input
                type="text"
                placeholder="Contoh: 08123456789"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                className="cyber-input py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-300 mb-1">Judul Project *</label>
            <input
              type="text"
              placeholder="Contoh: Commercial Video Draft v1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="cyber-input py-2 text-xs"
            />
          </div>

          {/* Optional PIN Protection Toggle */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Proteksi Kode PIN (4-Digit)</span>
                <span className="text-[10px] text-neutral-400 block">Klien wajib memasukkan Kode PIN 4-digit acak sebelum membuka video.</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={enablePin}
                onChange={(e) => setEnablePin(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-400"></div>
            </label>
          </div>

          {/* Dropzone */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-300 mb-1">File Video / Foto *</label>
            <label
              className={`relative block rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                isDragging ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/15 hover:border-cyan-400/60 bg-black/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f); }}
            >
              {previewUrl && selectedFile ? (
                <div className="p-3 space-y-2">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-white/10">
                    {selectedFile.type.startsWith('image/') ? (
                      <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <video src={previewUrl} className="max-w-full max-h-full object-contain" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-300">
                    <span className="font-semibold truncate">{selectedFile.name}</span>
                    <span className="font-mono text-neutral-500 flex-shrink-0">({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-2">
                  <UploadCloud className="w-8 h-8 text-cyan-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">Klik atau seret file ke sini</p>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5">MP4, MOV, WebM, JPG, PNG — Max 10GB</p>
                  </div>
                </div>
              )}
              <input type="file" accept="video/*,image/*" onChange={(e) => e.target.files && handleFileChange(e.target.files[0])} className="hidden" />
            </label>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-cyber-primary py-3 text-xs w-full">
            <UploadCloud className="w-4 h-4" />
            {isSubmitting ? 'Mengunggah & Memproses…' : 'Buat Link Review Klien'}
          </button>
        </form>
      ) : (
        <div className="glass-panel-elevated p-5 space-y-4 text-center border-cyan-400/30">
          <CheckCircle2 className="w-12 h-12 text-cyan-400 mx-auto" />
          <div>
            <h2 className="text-base font-bold text-white">Link Review Berhasil Dibuat!</h2>
            <p className="text-xs text-neutral-400 mt-1">Kirimkan link berikut beserta Kode PIN ke klien Anda.</p>
          </div>

          {/* Link Box */}
          <div className="bg-black/60 border border-white/10 p-3 rounded-xl space-y-2 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-cyan-400 truncate flex-1">{createdResult.url}</span>
              <button onClick={copyLinkAndPin} className="p-2 bg-cyan-400 text-black rounded-lg hover:brightness-110 flex-shrink-0" title="Salin Link & PIN">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Display PIN Code if active */}
            {createdResult.pin && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Kode PIN Akses:
                </span>
                <span className="font-mono font-black text-sm text-cyan-400 tracking-wider bg-cyan-400/10 border border-cyan-400/30 px-2.5 py-0.5 rounded-md">
                  {createdResult.pin}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                buildWaText(clientName, title, createdResult.url, createdResult.pin)
              )}`}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Share2 className="w-3.5 h-3.5" /> Kirim Formal WA
            </a>
            <a href={createdResult.url} target="_blank" rel="noreferrer" className="btn-cyber-secondary py-2.5 text-xs flex items-center justify-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Buka Link
            </a>
          </div>

          <button
            onClick={() => {
              setCreatedResult(null);
              setClientName('');
              setTitle('');
              setSelectedFile(null);
              setPreviewUrl(null);
              setEnablePin(false);
            }}
            className="text-xs text-neutral-500 hover:text-white underline font-mono pt-2 block mx-auto"
          >
            + Upload Project Lainnya
          </button>
        </div>
      )}

      {/* ── REALTIME UPLOAD LOADING MODAL OVERLAY ────────────────────────────── */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden top-0 left-0 right-0 bottom-0">
          <div className="glass-panel p-6 max-w-sm w-full text-center space-y-4 border-cyan-400/40 shadow-2xl animate-scale-in">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-400/20 border-t-cyan-400 animate-spin" />
              <UploadCloud className="w-7 h-7 text-cyan-400 animate-pulse" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Mengunggah Video & Sinkronisasi Drive</h3>
              <p className="text-xs text-neutral-400 mt-1">Mohon tidak menutup atau merefresh halaman ini.</p>
            </div>

            {/* Realtime Upload Metrics */}
            <div className="space-y-2 bg-black/50 p-3 rounded-xl border border-white/10 text-left font-mono">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-cyan-400">Progress Upload</span>
                <span className="text-white font-black text-sm">{uploadProgress?.percentage || 0}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden border border-white/10">
                <div
                  className="bg-cyan-400 h-full transition-all duration-200 rounded-full shadow-[0_0_12px_rgba(0,240,201,0.5)]"
                  style={{ width: `${uploadProgress?.percentage || 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                <span>
                  {((uploadProgress?.loaded || 0) / (1024 * 1024)).toFixed(1)} MB / {((uploadProgress?.total || 0) / (1024 * 1024)).toFixed(1)} MB
                </span>
                <span className="text-cyan-400 font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {((uploadProgress?.speedBps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                </span>
              </div>

              <div className="text-[10px] text-neutral-500 flex items-center gap-1 border-t border-white/5 pt-1.5 mt-1">
                <Clock className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                <span>
                  {uploadProgress?.remainingSec && uploadProgress.remainingSec > 0
                    ? `Estimasi tersisa: ${uploadProgress.remainingSec} detik`
                    : 'Memproses ke Google Drive Cloud Storage...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-neutral-500">
        <SimbaIcon className="w-4 h-4" />
        <span>Vibe Coded By <strong>Abaalwi</strong></span>
      </footer>
    </div>
  );
}
