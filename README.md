# 🎬 Reviewii — Platform Review & Approval Video/Foto Client

Reviewii adalah platform manajemen dan kolaborasi review hasil karya editor video dan foto untuk klien secara profesional, instan, dan aman.

![Reviewii Banner](simba-logo.png)

---

## 🌟 FITUR UTAMA

- 🎥 **Frame-Accurate Video Player**: Pemutar video tingkat tinggi dengan dukungan per-frame stepping (maju/mundur 1 frame), time-range selection (mm:ss), dan scrubbing interaktif.
- 🎨 **Coretan Frame Video (Interactive Drawing)**: Menangkap frame video saat dipause secara otomatis, melapiskan coretan garis di atas gambar frame asli, dan menyimpannya sebagai 1 berkas gambar PNG utuh.
- ☁️ **Google Drive API Cloud Storage**: Penyimpanan otomatis ke Google Drive milik Anda (mendukung upload file jumbo hingga 10GB per berkas) dengan auto-delete saat project dihapus.
- 📎 **Multi-Attachment Revision Notes**: Klien dapat melampirkan banyak berkas sekaligus (foto, video referensi, dokumen, audio musik) dalam 1 catatan revisi.
- 📄 **Export PDF Report**: Mengunduh rangkuman seluruh catatan revisi klien dalam format dokumen PDF berdesain Cyber-Glassmorphism modern.
- 🔔 **Notifikasi Revisi Real-time**: Indikator counter & notifikasi langsung di dashboard editor jika ada project yang membutuhkan tindakan revisi.
- 📑 **SOP Integrasi Klien**: Modal SOP terpadu untuk mengarahkan klien dalam melakukan review video dan janji pengambilan file mentah (*raw files*).
- 🛡️ **Keamanan & Autentikasi Pro**: Proteksi login bcrypt, token JWT, header keamanan Helmet, dan sanitasi input.

---

## 🛠️ TEKNOLOGI YANG DIGUNAKAN

### Frontend (`apps/web`)
- Next.js 14 (App Router)
- React 18 & TypeScript
- Tailwind CSS (Cyber-Glassmorphism UI System)
- TanStack Query (React Query)
- Lucide Icons & Canvas API

### Backend (`apps/api`)
- NestJS (Express Adapter)
- Prisma ORM (SQLite / PostgreSQL)
- Google APIs SDK (`googleapis` v3)
- PDFKit (PDF Document Generator)
- Helmet (Security HTTP Headers) & Bcrypt

---

## 🚀 STRUKTUR PROYEK (MONOREPO)

```
Reviewii/
├── apps/
│   ├── api/             # NestJS REST API Server & Socket Gateway
│   └── web/             # Next.js 14 Frontend Application
├── packages/
│   └── shared-types/    # Shared TypeScript Interfaces & DTOs
├── simba-logo.png       # Branding Logo Asset
├── DEPLOYMENT_GUIDE.md  # Panduan Lengkap Deploy (Vercel / Render / Netlify)
└── .env.example         # Template Environment Variables
```

---

## ⚡ CARA MENJALANKAN LOKAL

### 1. Install Dependensi
```bash
npm install
```

### 2. Jalankan Mode Development
```bash
# Jalankan Backend API (Port 3001)
npm run dev:api

# Jalankan Frontend Web (Port 3000)
npm run dev:web
```

---

## 📖 PANDUAN DEPLOYMENT

Untuk panduan deploy langkah demi langkah dari **GitHub ➔ Vercel / Netlify / Render**, silakan baca dokumen [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

---

### 👤 CREATOR & CREDITS
Vibe Coded By **Abaalwi** & Antigravity AI (Google DeepMind Team).
Built for seamless Vercel & Supabase Cloud Deployment.
