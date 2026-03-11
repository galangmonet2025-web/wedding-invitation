

```md
# Image Storage System
Wedding Invitation SaaS

Dokumen ini menjelaskan sistem upload, penyimpanan, dan distribusi gambar
untuk platform Wedding Invitation SaaS menggunakan:

- Google Drive → Storage File
- Google Sheets → Metadata Database
- Cloudflare CDN → Cache & Delivery Image

---

# 1. Arsitektur Sistem

Flow utama sistem gambar:

User Upload Image
│
▼
Frontend (React)
│
▼
Backend API
│
▼
Resize + Compress Image
│
▼
Upload ke Google Drive
│
▼
Ambil Public URL
│
▼
Save Metadata ke Google Sheets
│
▼
Guest membuka undangan
│
▼
Cloudflare CDN Cache Image
│
▼
Image tampil di halaman undangan

---

# 2. Struktur Sheet Baru

Untuk mengelola gambar secara fleksibel, diperlukan beberapa sheet tambahan.

---

# Sheet: `Images`

Menyimpan metadata semua gambar yang diupload oleh tenant.

| Field | Tipe | Deskripsi |
|-----|-----|-----|
| id | string | ID unik gambar |
| tenant_id | string | ID tenant pemilik gambar |
| image_type | string | Jenis gambar |
| file_name | string | Nama file |
| drive_file_id | string | ID file Google Drive |
| drive_url | string | URL Google Drive |
| cdn_url | string | URL yang diakses melalui CDN |
| width | number | Lebar gambar |
| height | number | Tinggi gambar |
| size_kb | number | Ukuran file |
| created_at | datetime | Waktu upload |

---

# Image Type

Untuk konsistensi tampilan tema, beberapa tipe gambar perlu didefinisikan.

Contoh:

| image_type | Fungsi |
|------|------|
| hero_cover | cover utama undangan |
| bride_photo | foto mempelai wanita |
| groom_photo | foto mempelai pria |
| gallery | galeri foto |
| story_photo | foto timeline kisah |
| background | background section |

---

# Sheet: `ImageGallery`

Menyimpan urutan foto galeri.

| Field | Deskripsi |
|------|------|
| id | ID |
| tenant_id | tenant pemilik |
| image_id | relasi ke Images |
| sort_order | urutan foto |
| created_at | waktu |

---

# Sheet: `ThemeImageRequirements`

Menentukan gambar apa saja yang diperlukan oleh sebuah tema.

| Field | Deskripsi |
|------|------|
| id | ID |
| theme_id | relasi theme |
| image_type | jenis gambar |
| required | wajib atau tidak |
| max_images | batas jumlah |
| aspect_ratio | rasio gambar yang direkomendasikan |

Contoh data:

| theme_id | image_type | required | max_images |
|------|------|------|------|
| theme_1 | hero_cover | true | 1 |
| theme_1 | bride_photo | true | 1 |
| theme_1 | groom_photo | true | 1 |
| theme_1 | gallery | false | 10 |

---

# 3. Struktur Folder Google Drive

Disarankan struktur seperti berikut:

```

wedding-saas-storage/
tenants/
tenant_001/
hero/
couple/
gallery/
story/
tenant_002/
hero/
couple/
gallery/

```

Contoh file:

```

tenants/tenant_001/hero/hero.jpg
tenants/tenant_001/gallery/photo1.jpg

```

---

# 4. Mekanisme Upload Image

## Step 1 — User Upload

User upload melalui dashboard.

Frontend:

```

React Upload Component

```

File dikirim ke backend:

```

POST /api/upload-image

```

---

# Step 2 — Backend Processing

Backend melakukan:

1. Validasi file
2. Resize
3. Compress

Contoh rules:

| Type | Resolution |
|-----|-----|
| cover | 1920x1080 |
| couple | 800x800 |
| gallery | 1200x1200 |

Tools yang bisa digunakan:

- sharp
- imagemin

Contoh compress:

```

quality: 75%
format: webp

```

---

# Step 3 — Upload ke Google Drive

Backend upload menggunakan:

```

Google Drive API

```

Respon yang didapat:

```

fileId
webViewLink
webContentLink

```

Contoh:

```

[https://drive.google.com/uc?id=FILE_ID](https://drive.google.com/uc?id=FILE_ID)

```

---

# Step 4 — Generate CDN URL

Supaya cepat di-load oleh tamu undangan, gambar akan dilewatkan melalui CDN.

Contoh domain CDN:

```

[https://cdn.yourwedding.com](https://cdn.yourwedding.com)

```

Mapping URL:

```

[https://cdn.yourwedding.com/images/FILE_ID.webp](https://cdn.yourwedding.com/images/FILE_ID.webp)

```

Cloudflare akan cache file ini.

---

# Step 5 — Save Metadata ke Google Sheets

Data disimpan ke sheet `Images`.

Contoh:

| id | tenant_id | image_type | drive_file_id | cdn_url |
|----|----|----|----|----|
| img_001 | tenant_001 | hero_cover | 1aBcD | https://cdn.site.com/1aBcD.webp |

---

# 5. Flow Rendering di Halaman Undangan

Saat guest membuka undangan:

```

guest buka
namadomain.com/galang-dina

```

Flow:

Frontend
│
▼
API get tenant data
│
▼
API get images tenant
│
▼
Load CDN URL
│
▼
Cloudflare serve cached image
│
▼
Image tampil cepat

---

# 6. Strategi CDN (Cloudflare)

Agar performa maksimal, gunakan konfigurasi berikut:

### Cache Rule

Cache:

```

cdn.yourwedding.com/*

```

TTL:

```

1 month

```

---

### Polish

Aktifkan:

```

Cloudflare Polish
Lossy compression

```

---

### WebP

Aktifkan:

```

Auto WebP

```

---

# 7. Best Practice Optimasi Image

Untuk performa terbaik:

### Format

Gunakan:

```

WEBP

```

---

### Ukuran file

Ideal:

| Type | Size |
|-----|-----|
| cover | < 300kb |
| gallery | < 200kb |
| couple | < 150kb |

---

### Lazy Loading

Frontend wajib menggunakan:

```

loading="lazy"

```

---

### Responsive Image

Gunakan:

```

srcset

```

Contoh:

```

hero_480.webp
hero_720.webp
hero_1080.webp

```

---

# 8. Security

Supaya storage aman:

### Limit upload

```

max 5MB

```

---

### Validasi MIME

Hanya izinkan:

```

image/jpeg
image/png
image/webp

```

---

# 9. Cleanup System

Untuk mencegah storage penuh:

Job harian:

```

cek tenant expired
hapus image tenant
hapus file dari drive

```

---

# 10. Estimasi Skala

Jika:

```

1000 tenant
10 foto per tenant

```

Total:

```

10.000 gambar

```

Ukuran:

```

~2GB

```

Masih sangat aman di Google Drive.

---

# Kesimpulan

Arsitektur ini memberikan:

✔ storage gratis (Google Drive)  
✔ database ringan (Google Sheets)  
✔ CDN cepat (Cloudflare)  
✔ scalable untuk ribuan undangan  

Flow utama:

Upload → Compress → Drive → Sheets → CDN → Guest
```

---