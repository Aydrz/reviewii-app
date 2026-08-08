# AI Prompt — Reviewii (untuk Antigravity)

> Cara pakai: copy seluruh isi di bawah ini (mulai dari "## PROMPT" sampai akhir) ke Antigravity sebagai instruksi awal project. Kalau Antigravity punya fitur upload file/context, lampirkan juga file PRD lengkap (`PRD-Reviewii-Detailed.md`) sebagai referensi tambahan.

---

## PROMPT

Kamu adalah AI coding agent yang akan membangun **Reviewii**, sebuah web app client-review untuk video/foto editor. Aku (owner project) akan pakai ini solo untuk kirim hasil editing ke klien-klienku dan menerima feedback langsung di titik/frame video atau foto tertentu, dengan gaya interaksi terinspirasi Instagram.

### Konteks Produk

Reviewii menyelesaikan masalah: feedback klien yang biasanya berantakan di WhatsApp/email, tidak ada penanda waktu jelas, dan riwayat revisi campur aduk. Solusinya: editor upload draft → sistem generate link unik → klien buka link tanpa perlu daftar akun → klien tap di frame video/foto untuk kasih komentar (teks/suara/gambar) → editor dapat notifikasi real-time dan langsung lompat ke titik komentar itu → editor upload revisi → klien approve.

### Spesifikasi Wajib

**Platform & Skala**
- Web app, responsif penuh (mobile-first, karena mayoritas klien buka dari HP via link WhatsApp), juga nyaman di desktop
- Dipakai solo oleh 1 editor (aku) — 1 workspace saja, TIDAK perlu multi-tenant/multi-user admin
- Klien mengakses via **guest link + token unik** (opsional PIN tambahan) — klien TIDAK PERNAH perlu membuat akun atau login

**Tech Stack**
- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- Backend: Node.js dengan NestJS (REST API + WebSocket gateway)
- Realtime: Socket.io untuk komentar live & notifikasi tanpa refresh
- Database: PostgreSQL untuk data relasional, Redis untuk cache/session guest token/pub-sub realtime
- Storage file: **Google Drive API** (bukan S3, bukan NAS) — tiap project punya folder otomatis di Google Drive milik akun editor; file asli, proxy ringan, thumbnail, watermark version, voice comment, semua disimpan di sana lewat resumable upload API
- Video processing: FFmpeg di backend untuk generate thumbnail, proxy 720p ringan (untuk preview cepat di player), dan versi watermark otomatis
- Queue: BullMQ untuk proses video berat supaya tidak blocking API
- Auth: JWT sederhana untuk editor (aku), token sekali pakai + expiry untuk guest klien

**Desain Visual — Terinspirasi Instagram**
- Palet warna: primary biru elektrik `#2563FF`, primary-dark `#1A46CC`, primary-light `#EAF0FF`, neutral-900 `#0F1115`, neutral-600 `#5C6270`, neutral-200 `#E4E6EB`, neutral-50 `#F7F8FA`, success `#2ECC71`, warning `#F5A623`, danger `#EB5757`
- Font: Inter (Google Fonts)
- Card rounded-2xl dengan shadow-sm, spacing lega
- Bottom navigation 5 tab: Home/Feed, Cari, Upload (tombol tengah lebih besar, aksen biru elektrik), Notifikasi (badge merah unread count), Profil
- Story bar horizontal di atas feed: avatar lingkaran dengan ring gradient biru kalau ada update belum dilihat
- Feed vertikal: tiap card = 1 project, video preview autoplay muted loop, badge status pill (Pending/Revisi/Approved dengan warna berbeda)
- Player fullscreen dengan tap-to-pin comment (tap di titik frame manapun memunculkan pin marker + input komentar di titik itu), timeline scrubber custom dengan dot marker di posisi tiap komentar, double-tap di tengah layar untuk quick-approve dengan animasi heart burst
- Comment sheet: bottom sheet yang muncul dengan swipe-up dari player, avatar inisial (karena guest tidak punya foto profil), reply thread bertingkat, reaction emoji cepat
- Grid galeri 3 kolom (mirip profile grid Instagram) dengan badge status kecil di tiap thumbnail

### Fitur yang Harus Dibangun (Full Scope, Bukan MVP Bertahap)

1. **Core Review & Approval** — upload multi-file, generate guest link + PIN opsional, tap-to-pin comment dengan timestamp otomatis, reply thread, reaction emoji, double-tap approve, version history dengan side-by-side compare (dua player berdampingan)
2. **Annotation Lanjutan** — voice comment (rekam max 60 detik via Web Audio API, tampil sebagai waveform player), drawing annotation (pen/panah/lingkaran overlay di atas frame, warna bisa dipilih, ada undo/clear)
3. **Notifikasi & Komunikasi** — notifikasi in-app realtime via WebSocket + email, chat/DM per project untuk diskusi umum di luar komentar timestamp
4. **Organisasi & Portofolio** — grid galeri dengan filter status, "Approved Collection" sebagai portofolio otomatis di halaman profil, export laporan revisi ke PDF
5. **Proteksi & Struktur Payment (Siapkan Struktur, JANGAN Aktifkan Payment Gateway Dulu)** — watermark dinamis otomatis di file preview (nama klien + tanggal), field `payment_required` dan `payment_status` di database sudah ada tapi belum terhubung ke payment gateway manapun — untuk sekarang tombol download file final langsung aktif tanpa gate, tinggal nanti tambah integrasi Midtrans/Xendit belakangan

### Skema Database (Pakai Struktur Ini)

```sql
users (id, name, email, password_hash, created_at)
projects (id, owner_id, client_name, client_contact, title, description, status, deadline, drive_folder_id, watermark_enabled, payment_required, payment_status, created_at, updated_at)
versions (id, project_id, version_number, file_type, drive_file_id, drive_proxy_file_id, thumbnail_url, duration_seconds, uploaded_at)
comments (id, version_id, author_type, author_name, guest_token_id, timestamp_seconds, pin_x, pin_y, comment_type, content, voice_url, drawing_data, created_at)
comment_replies (id, comment_id, author_type, author_name, content, created_at)
approvals (id, version_id, approved_by, guest_token_id, approved_at)
guest_tokens (id, project_id, token, pin_code, expires_at, last_accessed_at)
notifications (id, user_id, type, ref_project_id, ref_version_id, is_read, created_at)
chat_messages (id, project_id, author_type, author_name, content, attachment_url, created_at)
```

### Alur Google Drive (Ikuti Persis)

1. Editor connect akun Google via OAuth2 sekali di awal (token refresh disimpan encrypted)
2. Saat project baru dibuat, backend otomatis buat folder: `Reviewii/{client_name}/{project_title}`
3. Upload file asli ke folder tsb, lalu FFmpeg generate proxy 720p + thumbnail + watermark version, semua diupload ke subfolder `proxy/`
4. Player streaming dari file **proxy**, bukan file asli (biar cepat load & hemat API quota)
5. File asli HD hanya bisa didownload lewat tombol khusus (setelah approved, atau langsung kalau `payment_required = false`)

### Urutan Pembangunan (Build Bertahap Secara Teknis)

Bangun dalam urutan berikut supaya sistem tetap bisa di-test tiap tahap, meskipun scope produk akhirnya full:

1. Fondasi: setup project Next.js + NestJS + PostgreSQL, auth editor, koneksi Google Drive API dasar (buat folder + upload file berhasil)
2. Core review: upload project, generate guest link, player video/foto dasar, komentar teks dengan timestamp, tombol approve
3. Interaksi ala Instagram: feed, story bar, tap-to-pin, double-tap approve animation, grid galeri, bottom nav
4. Annotation lanjutan: voice comment, drawing canvas, version compare side-by-side
5. Realtime & komunikasi: WebSocket notifikasi live, chat/DM, email notification
6. Proteksi & laporan: watermark otomatis, export PDF laporan revisi, struktur payment (tanpa gateway aktif)

### Referensi Tambahan (Lampirkan File Ini ke Context)

Lampirkan juga `PRD-Reviewii-Ultra-Detailed.md` sebagai context tambahan. File itu berisi:
- Struktur folder repo monorepo lengkap (apps/web, apps/api, apps/worker, packages/shared-types)
- Daftar environment variables (`.env.example`)
- Spesifikasi lengkap semua REST API endpoint (method, path, body, response) untuk auth, projects, versions, comments, guest access, notifications, chat, export
- Daftar event WebSocket (client→server dan server→client)
- Wireframe teks detail untuk tiap halaman (Feed, Player, Comment Sheet, Upload, Guest Client, Notifikasi, Profil)
- Tabel error handling & edge case (token expired, PIN salah, upload gagal, quota Drive habis, dll)
- Spesifikasi keamanan (rate limiting, permission Google Drive, sanitasi input, enkripsi refresh token)
- Pilihan state management: React Query untuk server state, Socket.io untuk realtime, Zustand untuk local UI state
- Checklist testing sebelum rilis

Ikuti spesifikasi di file itu secara presisi — jangan improvisasi struktur database atau endpoint di luar yang sudah didefinisikan, kecuali kamu tanya dulu ke aku.

### Yang Perlu Kamu Tanyakan Balik ke Aku Sebelum Mulai (Kalau Ada yang Kurang Jelas)

- Kredensial Google Cloud Project (Client ID/Secret) untuk OAuth2 Drive API — aku yang akan buat dan kasih
- Preferensi hosting untuk deploy (Vercel untuk frontend? VPS untuk backend NestJS?)
- Provider email untuk notifikasi (Resend/SMTP Gmail/lainnya)

Mulai dari Tahap 1 (Fondasi). Tunjukkan progress tiap tahap sebelum lanjut ke tahap berikutnya.
