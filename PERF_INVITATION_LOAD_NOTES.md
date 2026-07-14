# Catatan Performa: Kenapa Buka Undangan Loadingnya Lama

Status: **SUDAH DIIMPLEMENTASI di `backend/Code.gs`** (2026-07-14). Perlu **deploy ulang Web App** agar aktif. Bagian 1–2 di bawah = diagnosis awal; Bagian 4 = apa yang benar-benar diubah + cara verifikasi.

---

## 1. Kondisi sekarang

Loading lama saat buka undangan publik (`/#/:slug?guestid=...`) berasal dari **backend Google Apps Script + Google Sheets**, bukan dari frontend.

### Yang SUDAH baik (bukan sumber masalah)
Caching gambar di frontend sudah solid dan masih aktif:
- `src/shared/utils/imageCacheDB.ts` — cache base64 di **IndexedDB** (kuota besar, tak seperti localStorage yang jebol ~5MB).
- `src/shared/components/ProxyImage.tsx` — hydrate IndexedDB → memory map (sync), fallback berlapis (memory → IndexedDB → network).
- `InvitationPage.tsx` — **progressive render**: halaman muncul dulu, gambar nyusul; tidak lagi menunggu `Promise.all` semua gambar.
- Router — **code-splitting**: tamu tidak ikut download bundle admin.

Konsekuensi: pada kunjungan berulang, **gambar seharusnya sudah dari cache**. Jadi keluhan "tiap buka tetap lambat" **hampir pasti bukan gambar**.

### Sumber lambat utama — request `getInvitation` TIDAK PERNAH di-cache
File: `backend/Code.gs` → `PublicService.getInvitation` (sekitar baris **1962**).

Setiap kali undangan dibuka, fungsi ini melakukan **10+ pembacaan Google Sheets PENUH** tanpa cache apa pun:

| Pemanggilan | Sheet dibaca | Catatan |
|---|---|---|
| `DB.findOne('Tenants', ...)` | Tenants (full) | |
| `DB.getByTenant('Wishes', ...)` | Wishes (full) | |
| `DB.findOne('InvitationContent', ...)` | InvitationContent (full) | |
| `DB.getAll('MstAdditionalFeature')` | MstAdditionalFeature (full) | |
| `DB.getByTenant('TenantActiveFeature', ...)` | TenantActiveFeature (full) | |
| `DB.getAll('WebsiteConfig')` | WebsiteConfig (full) | |
| `DB.findOne('Themes', ...)` | **Themes (full)** | **paling mahal** — tiap baris berisi HTML/CSS/JS tema (ratusan KB), dibaca penuh hanya untuk ambil 1 tema |
| `DB.getByTenant('Guests', ...)` | Guests (full) | |
| `DB.getByTenant('Images', ...)` | Images (full) | |
| `QuotesVariantService.resolveQuotes(...)` | Quotes (full) | |

**Akar teknis:** di `DB` helper (`Code.gs` ~baris 526–539), `getByTenant()` dan `findOne()` keduanya memanggil `getAll()`, dan `getAll()` selalu `sheet.getDataRange().getValues()` = baca **seluruh** sheet lalu filter di memory. Tidak ada indeks, tidak ada cache.

**Kenapa "tiap buka tetap lambat":** data undangan nyaris statis, tapi setiap tamu setiap kali buka memicu semua pembacaan di atas dari nol. Apps Script juga punya cold-start dan `getValues()` yang inherently lambat + respons **tidak bisa di-cache CDN/browser**.

### Sumber lambat sekunder — imageProxy base64 (kunjungan PERTAMA saja)
Foto Drive di-serve via `?action=imageProxy&id=...` yang mengembalikan **base64 text** (~33% lebih besar) lewat Apps Script, tak bisa di-cache CDN. Berkat cache IndexedDB, ini hanya menyakitkan di kunjungan pertama; kunjungan berikutnya dari cache.

---

## 2. Saran perbaikan + risiko

Diurutkan dari dampak tertinggi. Semua di sisi backend (`Code.gs`) kecuali disebut lain → **perlu deploy ulang Web App** setelah diubah.

### Saran A — Cache respons `getInvitation` dengan `CacheService` (DAMPAK TERBESAR)
Bungkus hasil `getInvitation` di `CacheService.getScriptCache()` (pola sudah dipakai di `RateLimiter`, `Code.gs` ~baris 453). Data statis (tenant, content, images, quotes, konfigurasi webconfig/fitur) di-cache per `slug`.

- **Dampak:** menghilangkan mayoritas 10+ baca-Sheets untuk sebagian besar hit → buka undangan bisa turun dari detik ke ratusan ms pada cache hit.
- **Risiko:**
  - Data statis bisa "basi" selama TTL (mis. tenant baru ganti konten/foto belum langsung tampil). Mitigasi: **invalidasi cache** (hapus key slug) di `updateInvitationContent`, ganti tema, upload foto, dsb.
  - Batas `CacheService` = **100KB per value** & ~ total terbatas. Respons memuat kode tema yang bisa >100KB → **tidak muat** kalau tema ikut di-cache dalam satu value. Lihat Saran B.
  - **Wishes & guest harus diperlakukan khusus** (lihat Saran C) supaya ucapan/RSVP baru tidak ketutup cache.

### Saran B — Cache tema TERPISAH per `theme_id` (KEPUTUSAN: dipilih)
Sheet `Themes` adalah bagian termahal (baris besar berisi HTML/CSS/JS). Cache tema dengan key sendiri (mis. `theme_v1_<theme_id>`), dipecah jadi beberapa chunk kalau >100KB, lalu digabung saat baca.

- **Dampak:** banyak tamu berbagi cache tema yang sama → sheet Themes yang besar tak dibaca ulang tiap buka. Ini penghematan terbesar kedua setelah Saran A.
- **Risiko:**
  - Perlu **chunking** manual (split/join) karena 1 tema sering >100KB. Menambah kompleksitas & titik bug.
  - Saat tenant/admin **edit tema**, cache tema harus di-invalidasi (`updateTheme`/inject tema), kalau tidak tema lama tetap tampil.
  - Total kuota CacheService terbatas; kalau banyak tema besar di-cache bisa saling menggusur (LRU) — cache miss jadi lebih sering. Perlu TTL wajar.

### Saran C — Pisahkan data "harus fresh": wishes & guest
Ucapan (`wishes`) dan data `guest` tidak boleh terkunci cache statis.

- **Opsi C1 (rekomendasi UX):** wishes di-fetch/hitung terpisah tanpa cache (atau TTL sangat pendek), data statis tetap di-cache. Ucapan baru langsung muncul. Sedikit lebih kompleks.
- **Opsi C2 (simpel):** cache semuanya 60 detik. Ucapan baru telat maks 1 menit. Paling mudah, risiko UX kecil.
- **Opsi C3:** cache 5 menit. Paling ngebut & hemat, tapi ucapan/RSVP baru bisa telat sampai 5 menit terlihat.
- **Risiko umum:** kalau lupa invalidasi saat `submitPublicWish`/`submitPublicRSVP`, tamu kirim ucapan lalu refresh tapi belum muncul → terlihat seperti bug.

> **TTL belum diputuskan.** Perlu dipilih C1/C2/C3 sebelum implementasi.

### Saran D — Kurangi pembacaan sheet yang tak perlu (murah, low-risk)
- `MstAdditionalFeature`, `WebsiteConfig`, `Quotes` jarang berubah → cache lama (mis. 10–30 menit) dengan key global (bukan per-slug). Aman & mengurangi beban tiap buka.
- **Risiko:** rendah; ketiganya jarang berubah. Tetap sediakan cara clear cache (mis. saat admin ubah WebsiteConfig).

### Saran E — (Opsional, frontend) URL gambar langsung dari Drive/CDN, bukan imageProxy base64
Ganti sumber gambar ke `https://drive.google.com/thumbnail?id=...` (sudah dipakai sebagai fallback `driveRenderUrl` di `InvitationPage.tsx`) supaya bisa di-cache browser/CDN dan tak lewat Apps Script.

- **Dampak:** kunjungan pertama lebih cepat; hilang ketergantungan pada imageProxy yang lambat.
- **Risiko:** perlu foto Drive **publik/anyone-with-link**; ada kemungkinan rate-limit/format berbeda; mengubah perilaku yang sekarang sudah "cukup" berkat cache IndexedDB. Sebelumnya user memilih **tidak** mengambil jalan ini (frontend-only, caching base64 saja).

---

## 3. Rencana eksekusi yang diusulkan (saat sudah di-ACC)

Urutan aman, tiap langkah bisa dites terpisah:
1. **Saran D** dulu (paling aman, cepat terasa): cache global MstAdditionalFeature/WebsiteConfig/Quotes.
2. **Saran B**: cache tema per `theme_id` + chunking + invalidasi saat edit tema.
3. **Saran A + C**: cache respons statis per slug + strategi wishes/guest sesuai TTL yang dipilih + invalidasi di semua titik tulis (updateInvitationContent, ganti tema, upload foto, submitPublicWish, submitPublicRSVP).
4. Deploy ulang Web App, verifikasi dengan buka undangan nyata (ukur waktu request `getInvitation` sebelum vs sesudah).

**Keputusan yang masih perlu diambil sebelum mulai:**
- TTL / strategi kesegaran wishes & RSVP (C1 / C2 / C3).
- Konfirmasi boleh menambah logika invalidasi cache di semua endpoint tulis terkait.

**Catatan:** jangan `npm run build`/`tsc` hanya untuk verifikasi frontend (user menolak, lambat). Perubahan backend `Code.gs` diverifikasi lewat deploy Web App + buka undangan nyata.

---

## 4. Yang SUDAH diimplementasikan (2026-07-14, `backend/Code.gs`)

Semua di backend. **Frontend tidak disentuh.** TTL dipilih: **wishes & guest SELALU real-time (opsi C1)** — tidak pernah di-cache.

### Komponen baru: `PublicCache` (setelah `RateLimiter`)
Wrapper `CacheService.getScriptCache()` dengan:
- `getJSON/putJSON` + **chunking otomatis** (value >95KB dipecah jadi `<key>__c<i>`, digabung saat baca; kalau ada chunk hilang → dianggap miss, sumber dibaca ulang). Ini mengatasi batas ~100KB/value CacheService untuk tema besar.
- `del`, key-builder (`staticKey`/`themeKey`/`refKey`), `invalidateSlug`, `invalidateTheme`.

### `PublicService.getInvitation` dipecah jadi 3 jalur
1. **Blok STATIS per-slug** (`_buildStaticBlock`) — tenant subset + content (semua flag IG/webconfig) + images + quotes + `theme_id`. Di-cache **5 menit** (`STATIC_TTL`). 404 TIDAK di-cache.
2. **TEMA per `theme_id`** (`_getThemeCached`) — di-cache **15 menit** (`THEME_TTL`), chunked. Dibagi semua tamu → sheet Themes yang besar tak dibaca ulang. Path preview (`theme_code`) resolve langsung (jarang dipakai).
3. **wishes & guest** — dibaca **fresh** tiap request (tak di-cache).
- Referensi global `MstAdditionalFeature` & `WebsiteConfig` via `_getRefSheet` (cache **30 menit**, `REF_TTL`).

### Invalidasi cache (semua titik tulis terkait)
| Aksi | Yang di-invalidate |
|---|---|
| `updateInvitationContent` (update & insert) | `invalidateSlug` |
| `updateTenant` (theme_id / nama / tanggal) | `invalidateSlug` |
| `uploadImage` | `invalidateSlug` |
| `deleteImage`, `deleteImages` | `invalidateSlug` |
| `updateTheme` (termasuk jalur `__chunked`) | `invalidateTheme(id)` |
| `updateTenantFeature`, `deleteTenantFeature` | `invalidateSlug` |
| `updateWebsiteConfig` | `del refKey('WebsiteConfig')` |
| `updateMstFeature`, `deleteMstFeature` | `del refKey('MstAdditionalFeature')` |

### Efek yang diharapkan
- **Cache hit** (buka undangan ke-2 dst dalam 5 menit, oleh siapapun): dari 10+ baca-Sheets → ~2 baca-Sheets (wishes + guest saja). Ini yang menjawab keluhan "tiap buka tetap lambat".
- **Cache miss** (pertama / sesudah TTL / sesudah edit): ~sama seperti sebelumnya, plus sedikit overhead tulis cache.
- Tema besar tak lagi dibaca penuh tiap tamu.

### Risiko / batas yang diterima
- Konten yang di-edit **langsung** ke-invalidate (tak nunggu TTL). Perubahan **WebsiteConfig / master fitur** hanya clear ref-cache; blok statis per-slug baru ikut segar setelah TTL-nya habis (**maks 5 menit**).
- CacheService total terbatas & LRU: banyak tema besar bisa saling menggusur → sekadar cache miss (aman, tak error).
- Kalau `CacheService` down/penuh, `getJSON` return null → jalur lama (baca Sheets) tetap jalan → **tidak ada regresi fungsional**, hanya kembali lambat.

### Verifikasi (belum dilakukan — perlu user)
1. **Deploy ulang Web App** (`clasp push` / paste ke editor Apps Script, lalu Deploy > New/Manage deployment).
2. Buka undangan nyata 2×; ukur waktu request `getPublicInvitation` di Network tab (buka ke-2 harus jauh lebih cepat).
3. Uji invalidasi: edit konten/ganti tema/upload foto → buka undangan → perubahan langsung muncul (tak nunggu 5 menit).
4. Uji real-time: kirim ucapan dari tamu lain → refresh → ucapan langsung muncul.
5. Cek tema besar (mis. game) tetap tampil normal (chunking tema jalan).
