# PRD: Reviewii — Ultra Detailed Spec

**Versi:** 3.0 (Ultra Detailed)
**Status:** Ready for Development
**Pemilik Produk:** Naufal
**Tanggal:** 8 Agustus 2026

> Dokumen ini melanjutkan `PRD-Reviewii-Detailed.md` (v2.0) — semua keputusan di sana tetap berlaku (nama: Reviewii, solo/personal, guest access murni, Google Drive storage, biru elektrik, full-scope). Dokumen ini menambahkan level detail teknis & UI yang lebih presisi: API spec, wireframe per layar, error handling, keamanan, struktur repo.

---

## 1. Struktur Folder Repo (Monorepo)

```
reviewii/
├── apps/
│   ├── web/                      # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (main)/feed/
│   │   │   ├── (main)/search/
│   │   │   ├── (main)/upload/
│   │   │   ├── (main)/notifications/
│   │   │   ├── (main)/profile/
│   │   │   ├── project/[id]/
│   │   │   ├── review/[guestToken]/   # halaman guest klien
│   │   │   └── api/                   # route handler ringan (proxy ke backend)
│   │   ├── components/
│   │   │   ├── player/ (VideoPlayer, TimelineScrubber, DrawingCanvas, PinInput)
│   │   │   ├── feed/ (StoryBar, ProjectCard)
│   │   │   ├── comment/ (CommentSheet, CommentItem, VoiceRecorder)
│   │   │   ├── nav/ (BottomNav)
│   │   │   └── ui/ (Button, Badge, Avatar, Modal — design system dasar)
│   │   ├── lib/ (api-client.ts, socket-client.ts, hooks/)
│   │   └── styles/ (tailwind.config.ts dengan token warna custom)
│   └── api/                      # NestJS backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── projects/
│       │   │   ├── versions/
│       │   │   ├── comments/
│       │   │   ├── guest-access/
│       │   │   ├── notifications/
│       │   │   ├── chat/
│       │   │   ├── drive/            # wrapper Google Drive API
│       │   │   ├── media-processing/ # FFmpeg jobs
│       │   │   └── websocket/
│       │   ├── common/ (guards, interceptors, filters)
│       │   └── main.ts
│       └── worker/                 # BullMQ worker process terpisah (FFmpeg jobs)
├── packages/
│   └── shared-types/               # TypeScript types dipakai frontend & backend
├── docker-compose.yml              # Postgres, Redis, backend, worker (untuk dev)
└── .env.example
```

---

## 2. Environment Variables (`.env.example`)

```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/reviewii
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=7d
GUEST_TOKEN_DEFAULT_EXPIRY_DAYS=30

# Google Drive API
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
GOOGLE_DRIVE_ROOT_FOLDER_NAME=Reviewii

# Email
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM=notifikasi@reviewii.app

# App
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
NODE_ENV=development
```

---

## 3. API Endpoint Specification (REST)

### 3.1 Auth (Editor)
| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/auth/register` | `{name, email, password}` | `{user, token}` |
| POST | `/auth/login` | `{email, password}` | `{user, token}` |
| GET | `/auth/google/connect` | — | redirect ke OAuth Google Drive |
| GET | `/auth/google/callback` | query `code` | simpan refresh token, redirect ke `/profile` |

### 3.2 Projects
| Method | Endpoint | Body/Query | Response |
|---|---|---|---|
| GET | `/projects` | query: `status`, `search` | `Project[]` |
| POST | `/projects` | `{client_name, client_contact, title, description, deadline, watermark_enabled, payment_required}` | `Project` (otomatis buat Drive folder) |
| GET | `/projects/:id` | — | `Project` + `versions[]` |
| PATCH | `/projects/:id` | field yang diupdate | `Project` |
| DELETE | `/projects/:id` | — | `204` (hapus juga folder Drive — konfirmasi dulu di FE) |
| POST | `/projects/:id/guest-link` | `{pin_code?, expires_in_days?}` | `{token, url}` |

### 3.3 Versions (Upload)
| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/projects/:id/versions` | multipart file + `file_type` | `Version` (status: `processing`) — trigger job FFmpeg async |
| GET | `/versions/:id` | — | `Version` (termasuk `processing_status`) |
| GET | `/versions/:id/status` | — | polling status: `processing` / `ready` / `failed` |

### 3.4 Comments
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/versions/:id/comments` | — | `Comment[]` (dengan nested `replies`) |
| POST | `/versions/:id/comments` | `{author_name, timestamp_seconds?, pin_x?, pin_y?, comment_type, content?, voice_url?, drawing_data?}` | `Comment` (broadcast via WebSocket) |
| POST | `/comments/:id/replies` | `{author_name, content}` | `CommentReply` |
| POST | `/comments/:id/reactions` | `{emoji}` | `200` |
| DELETE | `/comments/:id` | — | `204` (hanya editor yang bisa hapus) |

### 3.5 Guest Access
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/guest/:token` | query `pin?` | `Project` + `versions[]` (validasi token & expiry) |
| POST | `/guest/:token/approve` | `{version_id, approved_by}` | `Approval` |
| POST | `/guest/:token/upload-voice` | multipart audio | `{voice_url}` |

### 3.6 Notifications & Chat
| Method | Endpoint | Body | Response |
|---|---|---|---|
| GET | `/notifications` | query `unread_only?` | `Notification[]` |
| PATCH | `/notifications/:id/read` | — | `200` |
| GET | `/projects/:id/chat` | — | `ChatMessage[]` |
| POST | `/projects/:id/chat` | `{content, attachment_url?}` | `ChatMessage` (broadcast WebSocket) |

### 3.7 Export
| Method | Endpoint | Response |
|---|---|---|
| GET | `/projects/:id/export-pdf` | file PDF ringkasan semua komentar per timestamp |

### 3.8 WebSocket Events

```
namespace: /ws/project/:projectId

Client → Server:
  join_project        { projectId }
  typing               { author_name }

Server → Client:
  comment:new           { comment }
  comment:reply          { reply }
  version:new            { version }
  version:status_update  { versionId, status }
  approval:new           { approval }
  chat:new                { message }
  notification:new       { notification }
```

---

## 4. Wireframe & Spesifikasi per Halaman (Teks Detail)

### 4.1 Halaman Feed (`/feed`)

```
┌─────────────────────────────────┐
│ Reviewii            🔔(3)  👤   │  ← header, badge notif merah
├─────────────────────────────────┤
│ ○ ○ ○ ○ ○  →  (scroll horizontal)│  ← StoryBar, ring biru = ada update
│ Klien A  Klien B  Klien C...     │
├─────────────────────────────────┤
│ ┌───────────────────────────┐   │
│ │  [video preview autoplay] │   │
│ │                    🟡Revisi│   │  ← badge status pill pojok kanan atas
│ │  Judul Project — Klien A   │   │
│ │  💬 3 komentar baru · 2j lalu│  │
│ └───────────────────────────┘   │
│ ┌───────────────────────────┐   │
│ │  [foto grid preview]      │   │
│ │                    🟢Approved│  │
│ │  Wedding Teaser — Klien B  │   │
│ └───────────────────────────┘   │
│           ⋮ scroll ⋮            │
├─────────────────────────────────┤
│  🏠    🔍    ➕    🔔    👤     │  ← BottomNav, tombol Upload lebih besar
└─────────────────────────────────┘
```
- Tap ProjectCard → buka `/project/:id`
- Tap StoryBar avatar → fullscreen story-preview mode, auto-advance 5 detik/item
- Pull-to-refresh di paling atas

### 4.2 Halaman Detail Project / Player (`/project/:id`)

```
┌─────────────────────────────────┐
│ ←  Judul Project — Klien A   ⋮  │
├─────────────────────────────────┤
│                                  │
│         [ VIDEO FULLSCREEN ]    │
│                                  │
│     • pin marker (tap frame)    │
│                                  │
│  ▶ ────●────────────── 01:32/03:00│ ← scrubber + dot marker komentar
│  ● ●    ●        ●               │ ← dot = posisi komentar
├─────────────────────────────────┤
│  v1   v2 ●   v3                 │ ← swipe kiri/kanan ganti versi
├─────────────────────────────────┤
│  ❤️Approve  💬12  ✏️Revisi  🔖  ↗️│
└─────────────────────────────────┘
```
- Tap di titik manapun pada video → muncul `PinInput` mengambang di titik tap: `[input teks...] 🎤 ✏️ ➤`
- Double-tap tengah layar → animasi heart burst → otomatis panggil `POST /guest/:token/approve`
- Swipe ke atas dari bawah layar → buka `CommentSheet` (bottom sheet, tinggi 70% layar, bisa di-drag full)
- Icon `⋮` di kanan atas: menu "Compare versi", "Download", "Hapus project" (khusus editor)

### 4.3 Comment Sheet (Swipe-up)

```
┌─────────────────────────────────┐
│         ▬▬▬  (drag handle)      │
│  Komentar (12)                  │
├─────────────────────────────────┤
│ 🅰️ Klien A · 0:32          👍❤️  │
│    "Warna kurang terang di sini"│
│    ↳ Reply (2)                  │
├─────────────────────────────────┤
│ 🅴 Naufal · 0:45                │
│    🎤 ▂▄▆▄▂ 0:12  (voice comment)│
├─────────────────────────────────┤
│ 🅰️ Klien A · 1:10                │
│    ✏️ [thumbnail with drawing]  │
├─────────────────────────────────┤
│ [Tulis balasan...]      🎤  ➤   │
└─────────────────────────────────┘
```
- Tap timestamp (`0:32`) pada komentar → player lompat ke detik itu + sheet minimize otomatis
- Avatar inisial: warna background di-generate konsisten dari nama (hash nama → warna)

### 4.4 Halaman Upload (`/upload`)

```
┌─────────────────────────────────┐
│ ←  Project Baru                 │
├─────────────────────────────────┤
│  Nama Klien       [___________] │
│  Kontak (email/WA) [___________]│
│  Judul Project    [___________] │
│  Deskripsi        [___________] │
│  Deadline         [📅 pilih]    │
│  Watermark        [●On  ○Off]   │
│  Perlu Payment?   [○On  ●Off]   │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │  Drag & drop file di sini│   │
│  │  atau tap untuk pilih    │   │
│  └─────────────────────────┘   │
│  [thumbnail preview file...]    │
│  ▓▓▓▓▓▓░░░░ 60% mengupload...   │
├─────────────────────────────────┤
│         [ Buat Project ]        │
└─────────────────────────────────┘
```
- Setelah submit sukses → modal: "Link berhasil dibuat!" + tombol `Copy Link`, `Share via WhatsApp`, `Lihat Project`

### 4.5 Halaman Guest Client (`/review/:token`)

- Sama seperti halaman Player (4.2) tapi:
  - Tanpa BottomNav, tanpa header app (branding minimal: logo Reviewii kecil di pojok)
  - Kalau `pin_code` aktif → tampilkan layar input PIN dulu sebelum masuk
  - First-time: modal singkat 1 layar "Cara pakai" (3 ikon: tap untuk komentar, double-tap untuk approve, swipe atas untuk lihat semua komentar) — muncul sekali, bisa di-skip

### 4.6 Halaman Notifikasi (`/notifications`)

```
┌─────────────────────────────────┐
│  Notifikasi                     │
├─────────────────────────────────┤
│ 🔵 Klien A mengomentari          │
│    "Video_v2" di 0:32 · 5m lalu  │
├─────────────────────────────────┤
│ ⚪ Project "Wedding Teaser"       │
│    telah di-approve · 2j lalu    │
├─────────────────────────────────┤
│ ⚪ Klien B meminta revisi         │
│    di "Company Profile" · 1h lalu│
└─────────────────────────────────┘
```
- 🔵 = belum dibaca, tap → mark as read + navigate ke titik terkait

### 4.7 Halaman Profil (`/profile`)

```
┌─────────────────────────────────┐
│         👤 Naufal                │
│    Editor · 24 project selesai   │
├─────────────────────────────────┤
│  ⭐ Approved Collection          │
│  ○ ○ ○ ○ ○ ○  (highlight circle) │
├─────────────────────────────────┤
│  Semua Project                   │
│  [Pending 3] [Revisi 2] [Done 19]│  ← tab filter
│  ▦ ▦ ▦ ▦ ▦ ▦  (grid 3 kolom)     │
├─────────────────────────────────┤
│  ⚙️ Pengaturan · Google Drive ✅ │
└─────────────────────────────────┘
```

---

## 5. Error Handling & Edge Cases

| Kasus | Penanganan |
|---|---|
| Guest token expired | Halaman khusus: "Link ini sudah kadaluarsa, hubungi editor untuk link baru" |
| PIN salah 5x berturut-turut | Rate limit 15 menit per token (simpan counter di Redis) |
| Upload gagal di tengah jalan | Resumable upload Google Drive API — auto-retry dari byte terakhir, tampilkan tombol "Coba lagi" kalau tetap gagal |
| FFmpeg processing gagal | Status version jadi `failed`, notifikasi ke editor, tombol "Proses ulang" |
| Google Drive API quota habis | Fallback: antre job di queue, retry otomatis tiap X menit, notifikasi ke editor kalau terus gagal >1 jam |
| Klien komentar saat koneksi WebSocket putus | Fallback ke REST POST biasa, sync ulang saat reconnect |
| Voice comment melebihi 60 detik | Auto-stop rekam di detik ke-60, tampilkan preview sebelum kirim |
| Klien buka link di browser tanpa dukungan MediaRecorder (voice) | Sembunyikan tombol mic, tampilkan hanya teks & drawing |
| Dua device buka guest link bersamaan | Diizinkan (tidak ada single-session lock), semua komentar tetap tersimpan dengan `guest_token_id` yang sama |
| Editor hapus project yang sudah ada guest link aktif | Konfirmasi 2 langkah + guest link otomatis nonaktif setelah dihapus |

---

## 6. Keamanan

- Guest token: random string 32-karakter (crypto-safe), tidak bisa ditebak/brute-force praktis
- Rate limiting di endpoint guest (`/guest/:token/*`) — max 60 request/menit per IP
- File Google Drive: permission diset "anyone with link – viewer" hanya untuk file **proxy**, file asli HD tetap private, hanya bisa diakses lewat backend yang generate signed temporary link saat tombol download ditekan
- Input komentar disanitasi (escape HTML) untuk cegah XSS di teks komentar
- Upload file: validasi MIME type & ukuran max (video 2GB, foto 50MB) sebelum diterima backend
- HTTPS wajib di production (redirect otomatis dari HTTP)
- Refresh token Google OAuth disimpan terenkripsi (AES-256) di database, bukan plaintext

---

## 7. State Management Frontend

- **Server state**: React Query (TanStack Query) untuk semua data dari REST API — cache otomatis, revalidate saat WebSocket event masuk
- **Realtime state**: Socket.io client, tiap event masuk → invalidate query terkait di React Query (bukan simpan state manual terpisah, biar single source of truth)
- **Local UI state**: Zustand untuk state ringan (mode komentar aktif: teks/suara/gambar, posisi pin sementara sebelum submit, dsb)

---

## 8. Checklist Testing Sebelum Rilis (untuk 1 orang pemakai)

- [ ] Upload video 500MB+ selesai tanpa timeout
- [ ] Guest link dibuka di Chrome mobile, Safari iOS, dan desktop — semua interaksi (tap-to-pin, double-tap, swipe) berfungsi
- [ ] Voice comment record-preview-kirim berhasil di iOS Safari (sering jadi kendala teknis MediaRecorder)
- [ ] Notifikasi real-time sampai < 3 detik setelah klien komentar
- [ ] Link expired benar-benar memblokir akses setelah tanggal expiry
- [ ] Google Drive quota tidak jebol saat upload beberapa project sekaligus
- [ ] Export PDF laporan revisi hasilnya rapi & lengkap semua komentar+timestamp
