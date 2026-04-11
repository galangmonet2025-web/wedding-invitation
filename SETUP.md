# 🛠️ Setup Guide — Wedding SaaS Platform

Panduan lengkap untuk menjalankan project di **local development** dan **deploy ke GitHub Pages**.

---

## 📋 Prasyarat

Pastikan sudah terinstal di komputer kamu:

| Tools     | Versi Minimum | Cek Versi           |
|-----------|---------------|---------------------|
| **Node.js** | v18+          | `node -v`           |
| **npm**     | v9+           | `npm -v`            |
| **Git**     | v2+           | `git -v`            |

> [!TIP]
> Download Node.js di [https://nodejs.org](https://nodejs.org) (versi LTS direkomendasikan).

---

## 📁 Struktur Project

```
wedding-invitation/
├── backend/
│   └── Code.gs              # Google Apps Script backend
├── src/
│   ├── core/                 # Router, API client, layout, guards
│   ├── features/             # Fitur utama (auth, guest, dashboard, dll)
│   ├── shared/               # Komponen & utilitas bersama
│   ├── types/                # TypeScript type definitions
│   ├── App.tsx               # Root component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles
├── .env                      # Environment variables (JANGAN di-commit)
├── .env.example              # Template environment variables
├── index.html                # HTML entry point
├── package.json              # Dependencies & scripts
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # TailwindCSS configuration
├── tsconfig.json             # TypeScript configuration
└── postcss.config.js         # PostCSS configuration
```

---

## 🚀 Setup Local Development

### 1. Clone Repository

```bash
git clone https://github.com/GalangSetiawan/wedding-invitation.git
cd wedding-invitation
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi Environment Variables

Salin file `.env.example` menjadi `.env`:

```bash
# Windows (CMD)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit file `.env` dan isi dengan URL deployment Google Apps Script kamu:

```env
VITE_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

> [!IMPORTANT]
> Ganti `YOUR_DEPLOYMENT_ID` dengan Deployment ID asli dari Google Apps Script kamu. Lihat bagian [Setup Backend](#-setup-backend-google-apps-script) di bawah.

### 4. Jalankan Development Server

```bash
npm run dev
```

Aplikasi akan terbuka otomatis di browser pada **http://localhost:5173**.

### 5. Build untuk Produksi (Opsional)

```bash
npm run build
```

Hasil build akan tersimpan di folder `dist/`.

### 6. Preview Build Produksi (Opsional)

```bash
npm run preview
```

---

## ☁️ Setup Backend (Google Apps Script)

Backend menggunakan **Google Apps Script** dengan **Google Sheets** sebagai database.

### 1. Buat Google Spreadsheet Baru

1. Buka [Google Sheets](https://sheets.google.com) dan buat spreadsheet baru.
2. Buat sheet (tab) berikut sesuai kebutuhan backend:
   - `users`
   - `tenants`
   - `guests`
   - `wishes`
   - `gifts`
   - `activity_logs`

### 2. Buka Apps Script Editor

1. Di Google Sheets, klik **Extensions** → **Apps Script**.
2. Hapus kode default di editor.
3. Salin seluruh isi file `backend/Code.gs` ke editor tersebut.
4. Klik **Save** (💾).

### 3. Deploy sebagai Web App

1. Klik **Deploy** → **New deployment**.
2. Klik ikon ⚙️ (gear) di sebelah "Select type" → pilih **Web app**.
3. Isi konfigurasi:
   - **Description**: `Wedding SaaS API`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Klik **Deploy**.
5. **Salin URL** deployment yang muncul — ini adalah `VITE_API_URL` kamu.

### 4. Update File `.env`

Tempel URL deployment ke file `.env`:

```env
VITE_API_URL=https://script.google.com/macros/s/ABCDEF.../exec
```

> [!NOTE]
> Setiap kali mengubah kode `Code.gs`, kamu perlu membuat **New deployment** atau **Manage deployments → Edit** agar perubahan berlaku.

---

## 🌐 Deploy ke GitHub Pages

### Langkah 1: Konfigurasi `vite.config.ts`

Tambahkan `base` path sesuai nama repository:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    base: '/wedding-invitation/', // ← tambahkan ini
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        open: true,
    },
});
```

> [!WARNING]
> Pastikan value `base` sesuai dengan nama repository GitHub kamu. Formatnya: `/<nama-repo>/`.

### Langkah 2: Handle SPA Routing di GitHub Pages

GitHub Pages tidak mendukung client-side routing secara default. Kita perlu menggunakan **Hash Router** atau menambahkan **404.html fallback**.

#### Opsi A: Ganti ke HashRouter (Direkomendasikan)

Ubah `src/core/router/index.tsx`, ganti `createBrowserRouter` menjadi `createHashRouter`:

```diff
- import { createBrowserRouter } from 'react-router-dom';
+ import { createHashRouter } from 'react-router-dom';

  // ... (semua route tetap sama)

- export const router = createBrowserRouter([
+ export const router = createHashRouter([
```

> [!NOTE]
> Dengan HashRouter, URL akan berformat `https://username.github.io/wedding-invitation/#/dashboard` (ada tanda `#`).

#### Opsi B: Tambahkan 404.html Redirect

Buat file `public/404.html` di root project:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Wedding SaaS Platform</title>
    <script>
        // Redirect semua path ke index.html dengan query parameter
        var pathSegmentsToKeep = 1; // 1 untuk project page, 0 untuk user page
        var l = window.location;
        l.replace(
            l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
            l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
            l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
            (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
            l.hash
        );
    </script>
</head>
<body></body>
</html>
```

Dan tambahkan script redirect di `index.html`, sebelum tag `</head>`:

```html
<script>
    // Handle redirect dari 404.html
    (function(l) {
        if (l.search[1] === '/') {
            var decoded = l.search.slice(1).split('&').map(function(s) {
                return s.replace(/~and~/g, '&')
            }).join('?');
            window.history.replaceState(null, null,
                l.pathname.slice(0, -1) + decoded + l.hash
            );
        }
    }(window.location))
</script>
```

### Langkah 3: Setup Auto-Deploy (GitHub Actions)

Aplikasi ini sudah diprogram untuk bisa melakukan **Auto Deploy** setiap kali ada perubahan yang di-push ke branch `main`.

1. Pastikan file workflow sudah di-commit di `.github/workflows/deploy.yml`.
2. Buka repository GitHub kamu di browser.
3. Masuk ke tab **Settings** → **Secrets and variables** → **Actions**.
4. Klik **New repository secret**.
   - Name: `VITE_API_URL`
   - Secret: Isikan URL deployment backend Google Apps Script kamu.
5. Klik **Add secret**.

### Langkah 4: Aktifkan GitHub Actions Read & Write Permissions

1. Di repository GitHub, masuk ke **Settings** → **Actions** → **General**.
2. Scroll ke bawah pada bagian **Workflow permissions**.
3. Pilih **Read and write permissions**.
4. Centang _Allow GitHub Actions to create and approve pull requests_ (opsional, untuk amannya centang saja).
5. Klik **Save**.

### Langkah 5: Trigger Deploy! 🚀

Kamu hanya perlu menyimpan/commit pekerjaanmu dan mem-pushnya ke branch `main`.
```bash
git add .
git commit -m "Update konfigurasi dan konten"
git push origin main
```
Tunggu beberapa menit, GitHub Actions akan otomatis melakukan kompilasi proyek dan memasukkan hasilnya ke branch `gh-pages`.
*(Pengecekan proses deploy ini bisa dilihat di menu Actions pada repo Github)*

### Langkah 6: Aktifkan GitHub Pages di Repository

1. Pada Repo GitHubmu pilih **Settings** → **Pages**.
2. Pada tab **Build and deployment**, perhatikan letak **Source**. Bila sebelumnya terpilih secara spesifik pastikan diganti menjadi `Deploy from a branch`.
3. Lalu ganti Branch menjadi `gh-pages` serta folder `/(root)`.
4. Klik **Save**.
5. Tunggu proses aktif, dan coba akses: **https://<username-github>.github.io/<nama-repo>/**

---

## 🔄 Workflow Deploy Berkelanjutan

Hanya **cukup koding, commit, dan push**.

Setiap kali ada fitur atau data baru, ketikkan:

```bash
git add .
git commit -m "Teks deskripsi perubahan"
git push origin main
```
Sistem akan membuild dan mendeploy otomatis! Tidak perlu deploy manual.

---

## 🔧 Perintah yang Tersedia

| Perintah            | Fungsi                                    |
|---------------------|-------------------------------------------|
| `npm run dev`       | Jalankan development server (localhost)    |
| `npm run build`     | Build project untuk produksi              |
| `npm run preview`   | Preview hasil build produksi              |
| `npm run lint`      | Cek kualitas kode dengan ESLint           |
| `npm run deploy`    | Build & deploy ke GitHub Pages            |

---

## ❓ Troubleshooting

### Halaman blank setelah deploy ke GitHub Pages
- Pastikan `base` di `vite.config.ts` sudah benar: `/wedding-invitation/`.
- Pastikan sudah menggunakan **HashRouter** atau **404.html fallback**.
- Cek Console browser untuk error.

### API tidak bisa diakses
- Pastikan `VITE_API_URL` di `.env` sudah benar.
- Pastikan deployment Google Apps Script masih aktif.
- Cek apakah ada error CORS — pastikan setting **Who has access** adalah `Anyone`.

### `npm run build` error TypeScript
- Jalankan `npx tsc --noEmit` untuk melihat error detail.
- Pastikan semua type sudah sesuai.

### `gh-pages` gagal push
- Pastikan kamu punya akses push ke repository.
- Coba hapus cache: `rm -rf node_modules/.cache/gh-pages` lalu deploy ulang.
