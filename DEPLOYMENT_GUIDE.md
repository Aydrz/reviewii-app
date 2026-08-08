# 🚀 PANDUAN DEPLOYMENT REVIEWII (GitHub ➔ Vercel / Netlify / Render / VPS)

Dokumen ini berisi panduan langkah demi langkah untuk men-deploy aplikasi **Reviewii** secara penuh dari repositori GitHub ke layanan cloud Hosting (Vercel/Netlify untuk Frontend, dan Render/Railway/VPS untuk Backend NestJS API).

---

## 📋 ARSITEKTUR MONOREPO REVIEWII

- **apps/web**: Frontend Next.js 14 (App Router) + Tailwind CSS + Lucide Icons + TanStack Query.
- **apps/api**: Backend NestJS API + Prisma ORM + Socket.io + Google Drive API SDK + PDFKit.
- **packages/shared-types**: Berbagi tipe TypeScript antara frontend & backend.

---

## 📦 LANGKAH 1: UPLOAD KODEBASE KE GITHUB

1. **Inisialisasi Git & Commit**:
   Buka terminal di folder project `Reviewii`:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit ready for production deployment"
   ```

2. **Buat Repositori di GitHub**:
   - Buka [github.com/new](https://github.com/new)
   - Beri nama repositori, misal: `reviewii-app` (Pilih Private atau Public).
   - Klik **Create repository**.

3. **Push ke GitHub**:
   ```bash
   git remote add origin https://github.com/username-anda/reviewii-app.git
   git branch -M main
   git push -u origin main
   ```

---

## ⚙️ LANGKAH 2: DEPLOY BACKEND API (NestJS) ke Render / Railway / VPS

Backend API harus di-deploy terlebih dahulu agar mendapatkan `BACKEND_URL` publik.

### Opsi A: Deploy di Render.com (Gratis / Disarankan)

1. **Buat Web Service Baru**:
   - Buka [dashboard.render.com](https://dashboard.render.com) → Klik **New +** → **Web Service**.
   - Hubungkan dengan repositori GitHub `reviewii-app` Anda.

2. **Konfigurasi Build & Start**:
   - **Root Directory**: Kosongkan (atau isi `.`)
   - **Environment**: Node
   - **Build Command**: `npm run build:types && npm run build:api`
   - **Start Command**: `npm run start --workspace=apps/api`

3. **Isi Environment Variables di Render**:
   - `NODE_ENV` = `production`
   - `PORT` = `3001` (atau otomatis diset oleh Render)
   - `DATABASE_URL` = `file:./dev.db` (atau URL PostgreSQL dari Render Postgres jika ingin PostgreSQL)
   - `JWT_SECRET` = `kunci_rahasia_jwt_produksi_anda`
   - `JWT_EXPIRES_IN` = `7d`
   - `GOOGLE_CLIENT_ID` = `client_id_google_drive_anda`
   - `GOOGLE_CLIENT_SECRET` = `client_secret_google_drive_anda`
   - `GOOGLE_REFRESH_TOKEN` = `refresh_token_google_drive_anda`
   - `GOOGLE_REDIRECT_URI` = `urn:ietf:wg:oauth:2.0:oob`
   - `GOOGLE_DRIVE_ROOT_FOLDER_NAME` = `Reviewii`
   - `FRONTEND_URL` = `https://nama-app-anda.vercel.app` (URL Vercel Anda nanti)

4. **Deploy**:
   - Klik **Create Web Service**. Setelah build selesai, Anda akan mendapatkan URL Backend, misal: `https://reviewii-api.onrender.com`.

---

## 🎨 LANGKAH 3: DEPLOY FRONTEND WEB (Next.js) ke Vercel

1. **Import Project di Vercel**:
   - Buka [vercel.com/new](https://vercel.com/new)
   - Pilih repositori `reviewii-app` dari GitHub Anda.

2. **Konfigurasi Project di Vercel**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web` (atau pilih Edit -> tentukan folder `apps/web`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

3. **Isi Environment Variables di Vercel**:
   - `NEXT_PUBLIC_BACKEND_URL` = `https://reviewii-api.onrender.com` (URL API Backend dari Langkah 2)

4. **Deploy**:
   - Klik **Deploy**. Vercel akan mengompilasi frontend dan menghasilkan domain seperti `https://reviewii-app.vercel.app`.

---

## 🌐 LANGKAH 4: UPDATE BACKEND FRONTEND_URL & CORS

Setelah Vercel memberikan URL frontend (misal `https://reviewii-app.vercel.app`), update Environment Variable `FRONTEND_URL` di Render Backend menjadi `https://reviewii-app.vercel.app`.

Selesai! Backend API dan Frontend Vercel kini sudah 100% terhubung secara publik dengan enkripsi SSL/HTTPS.

---

## 🔑 KREDENSIAL DEFAULT LOGIN ADMIN

- **URL Dashboard**: `https://nama-app-anda.vercel.app/login`
- **Username**: `Kominfotapin`
- **Password**: `kominfo2017`
