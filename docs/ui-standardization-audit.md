# Audit Standarisasi Komponen UI

> Dokumen ini **hanya inventaris/temuan** — belum ada kode yang diubah.
> Tujuannya: memetakan bagian mana dari website yang **belum ter-standarisasi**
> sebelum dilakukan refactor.
>
> Tanggal audit: 2026-06-07
> Cakupan: `src/features/**` dan `src/core/**` (file di `src/shared/components/**`
> dianggap sebagai "sumber standar", tidak diaudit sebagai pelanggaran).

---

## 0. Ringkasan Eksekutif

Aplikasi punya **dua lapis standar yang tumpang-tindih**, dan inilah akar dari
ketidakkonsistenan:

1. **Lapis komponen React** — `Button`, `IconButton`, `Badge`, `Modal`,
   `ConfirmDialog`, `DataTable`, `StatCard`, `Loading`/`ApiLoader`, `Pagination`.
2. **Lapis utility CSS** (di [`src/index.css`](../src/index.css)) — `.btn-primary`,
   `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.input-field`, `.select-field`,
   `.field-label`, `.card`, `.badge-*`, `.tooltip`.

Banyak halaman memakai campuran keduanya, dan sebagian lagi menulis ulang gaya
secara inline (hard-coded Tailwind). Akibatnya: tampilan tombol/badge/input
berbeda-beda, dan perubahan gaya global jadi sulit.

**Prioritas standarisasi (dari dampak tertinggi):**

| Area | Tingkat fragmentasi | Prioritas |
|------|--------------------|-----------|
| Badge / status pill | Tinggi — hanya 2 file pakai `<Badge>`, ~8 file inline | **P1** |
| Form input (input/select/textarea) | Sedang — ~50% pakai `.input-field`, ~50% inline | **P1** |
| Tombol (`<button>` mentah) | Sedang — ~28 instance di ~10 file | **P2** |
| Modal/Dialog buatan tangan | Rendah — sebagian besar sudah pakai `Modal` | **P3** |
| Stat tile / kartu metrik | Rendah — `StatCard` kurang dimanfaatkan | **P3** |
| Loading / empty state | Rendah — sebagian besar sudah konsisten | **P4** |

**Catatan lintas-area:** `src/shared/components/index.ts` hanya meng-export
sebagian komponen (Button, Badge, IconButton, Modal, ConfirmDialog, DataTable,
Loading, Lightbox, ApiLoader). Komponen lain (`StatCard`, `Pagination`,
`ImageUpload`, `QrisUpload`, dll.) di-import via path penuh. Sebaiknya barrel
export dilengkapi agar pola import seragam.

---

## 1. Badge / Status Pill  — **Prioritas P1**

Komponen standar: [`src/shared/components/Badge.tsx`](../src/shared/components/Badge.tsx)
(variant: `success | warning | danger | info | gold | neutral`; size `sm | md`;
dukung `icon`, `bordered`). Ada juga utility CSS `.badge-*`.

**Masalah:** hanya **2 file** yang memakai `<Badge>`. Sisanya membuat `<span>`
ber-`rounded-full` dengan kelas warna inline yang ditulis ulang berkali-kali,
sering dengan padding/ukuran teks yang sedikit berbeda.

### Sudah benar (acuan) ✓
- [`src/features/tenant/pages/TenantPage.tsx`](../src/features/tenant/pages/TenantPage.tsx) — plan badge via `<Badge variant=...>`.
- [`src/features/admin/pages/AdditionalFeaturePage.tsx`](../src/features/admin/pages/AdditionalFeaturePage.tsx) — status aktif/nonaktif via `<Badge>`.

### Perlu di-migrasi ke `<Badge>`
| File | Perkiraan | Merepresentasikan |
|------|-----------|-------------------|
| [`src/features/payment/pages/PaymentPage.tsx`](../src/features/payment/pages/PaymentPage.tsx) | 2+/transaksi | Status pembayaran (settlement/pending/expire/cancel/deny) via fungsi `getStatusBadge()` yang mengembalikan string Tailwind mentah |
| [`src/features/admin/pages/TransactionMonitoringPage.tsx`](../src/features/admin/pages/TransactionMonitoringPage.tsx) | 2/baris | Tipe transaksi (feature/plan) + status |
| [`src/features/admin/pages/CouponPage.tsx`](../src/features/admin/pages/CouponPage.tsx) | 2/baris | Status kupon Aktif/Kadaluarsa |
| [`src/features/tenant/pages/StaffPage.tsx`](../src/features/tenant/pages/StaffPage.tsx) | 2 (desktop+mobile) | Role staff (Penerima Tamu) |
| [`src/features/admin/pages/ManageThemesPage.tsx`](../src/features/admin/pages/ManageThemesPage.tsx) | 2+ | Status publish/draft tema (dengan hover, perlu varian clickable) |
| [`src/features/admin/pages/ArchiveRestorePage.tsx`](../src/features/admin/pages/ArchiveRestorePage.tsx) | 1 | "Review aktif" (juga ada `PlanBadge`/`PaymentBadge` lokal — lihat §6) |
| [`src/features/admin/pages/PlanConfigPage.tsx`](../src/features/admin/pages/PlanConfigPage.tsx) | 3–5/kartu | Label paket premium/pro/basic (warna kustom per paket) |
| [`src/features/admin/pages/MasterQuotesListPage.tsx`](../src/features/admin/pages/MasterQuotesListPage.tsx) | beberapa | Indikator status di sel tabel |
| [`src/features/guest/pages/GuestPage.tsx`](../src/features/guest/pages/GuestPage.tsx) | ~3 | Status RSVP & kategori — saat ini pakai utility `.badge-*` (konsisten, tapi bukan komponen) |

> **Pertimbangan komponen:** sebelum migrasi, `Badge` mungkin perlu ditambah:
> - varian/warna `purple` (dipakai PlanConfig untuk "premium" & TransactionMonitoring untuk "plan");
> - prop interaktif/clickable yang rapi (ManageThemes badge bisa di-klik untuk toggle publish);
> - opsi ukuran teks `[10px]`/`[11px]` agar cocok dengan badge tabel yang padat.

---

## 2. Form Input (input / select / textarea)  — **Prioritas P1**

**Belum ada komponen React** `Input`/`Select`/`Textarea`/`FormField`. Yang ada
hanya utility CSS `.input-field`, `.select-field`, `.field-label`. Sekitar
separuh halaman memakainya, separuh lagi menulis gaya inline yang divergen
(beda rounding `rounded-lg` vs `rounded-xl`, beda padding `py-2` vs `py-2.5`,
beda warna focus ring `gold-500` vs `violet-500`).

### Konsisten (pakai `.input-field` / `.select-field`) ✓
- [`src/features/guest/pages/GuestPage.tsx`](../src/features/guest/pages/GuestPage.tsx) — 5 input, 2 select.
- [`src/features/admin/pages/AdditionalFeaturePage.tsx`](../src/features/admin/pages/AdditionalFeaturePage.tsx) — input, select, textarea.
- [`src/features/admin/pages/PlanConfigPage.tsx`](../src/features/admin/pages/PlanConfigPage.tsx) — input number.
- [`src/features/admin/pages/TransactionMonitoringPage.tsx`](../src/features/admin/pages/TransactionMonitoringPage.tsx) — search + filter select.

### Divergen (Tailwind inline, perlu diseragamkan)
| File | Perkiraan | Perbedaan kunci |
|------|-----------|-----------------|
| [`src/features/admin/pages/CouponPage.tsx`](../src/features/admin/pages/CouponPage.tsx) | ~8 input, 1 select, 1 textarea | `rounded-xl`, `bg-gray-50`, pola inline sendiri (tidak pakai `.input-field`) |
| [`src/features/tenant/pages/StaffPage.tsx`](../src/features/tenant/pages/StaffPage.tsx) | 2 input | `rounded-lg` + `py-2` + `bg-gray-50/700` (beda dari standar) |
| [`src/features/payment/pages/PaymentPage.tsx`](../src/features/payment/pages/PaymentPage.tsx) | 1 input (kode kupon) | focus ring `violet-500`, `rounded-xl`, `font-mono` |
| [`src/features/invitation/pages/InvitationContentPage.tsx`](../src/features/invitation/pages/InvitationContentPage.tsx) | banyak | File besar, banyak section form — perlu cek menyeluruh (kemungkinan campuran) |
| [`src/features/auth/pages/LoginPage.tsx`](../src/features/auth/pages/LoginPage.tsx) / [`RegisterPage.tsx`](../src/features/auth/pages/RegisterPage.tsx) | beberapa | Input auth dengan gaya khusus halaman login |

> **Rekomendasi:** buat komponen `FormField` + `Input`/`Select`/`Textarea` tipis
> yang membungkus `.input-field`/`.select-field` plus dukungan label, ikon
> prefix/suffix (search, eye-toggle, satuan), dan state error/disabled. Lalu
> migrasikan file divergen lebih dulu.

---

## 3. Tombol (`<button>` mentah)  — **Prioritas P2**

Komponen standar: [`Button`](../src/shared/components/Button.tsx)
(variant `primary|secondary|danger|ghost`, size `sm|md|lg`, `loading`, `icon`,
`iconRight`, `fullWidth`) dan [`IconButton`](../src/shared/components/IconButton.tsx).
Ada ~28 `<button>` mentah / `btn-*` literal di ~10 file.

### Mudah diganti (P2a)
| File | ~Jml | Fungsi |
|------|------|--------|
| [`src/core/layout/DashboardLayout.tsx`](../src/core/layout/DashboardLayout.tsx) | 4 | Toggle dark mode, ganti password, logout (→ `Button ghost` / `IconButton`) |
| [`src/features/auth/pages/LoginPage.tsx`](../src/features/auth/pages/LoginPage.tsx) | 1 | Toggle lihat/sembunyi password (→ `IconButton`) |
| [`src/features/auth/pages/RegisterPage.tsx`](../src/features/auth/pages/RegisterPage.tsx) | 1 | Toggle lihat/sembunyi password (→ `IconButton`) |
| [`src/features/invitation/components/RSVPSuccessModal.tsx`](../src/features/invitation/components/RSVPSuccessModal.tsx) | 2 | Tombol close (X) + "Tutup" (→ `IconButton` + `Button`) |
| [`src/features/admin/components/SimulationModal.tsx`](../src/features/admin/components/SimulationModal.tsx) | 1 | "Selesai" (gradient inline → `Button primary`) |
| [`src/features/guest/components/WhatsAppBlastModal.tsx`](../src/features/guest/components/WhatsAppBlastModal.tsx) | 3 | Nav panah + "Kirim & Lanjut" (pakai `btn-primary` literal → `Button`) |
| [`src/features/guest/components/GoogleContactModal.tsx`](../src/features/guest/components/GoogleContactModal.tsx) | 2 + link | Hapus baris (icon) + link "Buka Google Contacts" (`btn-primary` di `<a>`) |
| [`src/core/router/index.tsx`](../src/core/router/index.tsx) | 2 | `<a class="btn-primary">` halaman Unauthorized (→ `Button as={Link}`) |

### Pola tab/segmented control (P2b — butuh komponen baru)
Beberapa tombol mentah sebenarnya adalah **tab switcher** (active state dengan
`border-b`/background). Sebaiknya dibuat komponen `Tabs`/`SegmentedControl`
tersendiri ketimbang dipaksakan ke `Button`:
- [`src/features/guest/components/GoogleContactModal.tsx`](../src/features/guest/components/GoogleContactModal.tsx) — tab Upload/Panduan.
- [`src/features/admin/components/ThemeGuideModal.tsx`](../src/features/admin/components/ThemeGuideModal.tsx) — tab guide/variables/logic.
- [`src/features/landing/pages/NewLandingPage.tsx`](../src/features/landing/pages/NewLandingPage.tsx) — filter kategori tema + tombol "Preview Tema".
- [`src/features/admin/pages/ArchiveRestorePage.tsx`](../src/features/admin/pages/ArchiveRestorePage.tsx) — switcher tab "Aktif / Arsip" (sudah ada, pola sama).
- [`src/features/admin/components/AiThemeModal.tsx`](../src/features/admin/components/AiThemeModal.tsx) — ~6 tombol, perlu klasifikasi lebih lanjut.

### JANGAN diubah (theme-internal) ⛔
- [`src/features/invitation/components/ThemeWrapper.tsx`](../src/features/invitation/components/ThemeWrapper.tsx) — FAB sistem + tombol dari `dangerouslySetInnerHTML` milik tema tamu.
- `src/features/admin/utils/tema01Payload.ts` (dan payload tema lain) — `<button class="btn-primary">` di dalam string HTML template tema.

---

## 4. Modal / Dialog  — **Prioritas P3**

Sebagian besar **sudah benar** memakai [`Modal`](../src/shared/components/Modal.tsx)
/ [`ConfirmDialog`](../src/shared/components/ConfirmDialog.tsx): AiThemeModal,
SimulationModal, ThemeGuideModal, WhatsAppBlastModal, GoogleContactModal,
BackgroundTaskModal, ChangePasswordModal, dan semua dialog konfirmasi di
ArchiveRestorePage.

### Buatan tangan (`createPortal` / `fixed inset-0`)
| File | Klasifikasi |
|------|-------------|
| [`src/features/invitation/components/RSVPSuccessModal.tsx`](../src/features/invitation/components/RSVPSuccessModal.tsx) | **Kandidat migrasi** ke `Modal` (struktur sederhana: header + detail + 1 tombol) |
| [`src/features/invitation/components/MapTutorialModal.tsx`](../src/features/invitation/components/MapTutorialModal.tsx) | Spesial (iframe video + tab + kontrol YouTube). Migrasi opsional jika tab disederhanakan |
| [`src/shared/components/Lightbox.tsx`](../src/shared/components/Lightbox.tsx) | **Sengaja kustom** (galeri fullscreen) — biarkan |

### Overlay/focus mode (sengaja kustom, biarkan) ⛔
- [`ThemeEditorPage.tsx`](../src/features/admin/pages/ThemeEditorPage.tsx) & [`WebsiteConfigPage.tsx`](../src/features/admin/pages/WebsiteConfigPage.tsx) — mode fokus editor fullscreen.
- [`InvitationPage.tsx`](../src/features/invitation/pages/InvitationPage.tsx) — tampilan undangan publik + QR modal.
- [`ManageThemesPage.tsx`](../src/features/admin/pages/ManageThemesPage.tsx) — preview tema fullscreen (mirip Lightbox).

---

## 5. Kartu / Panel / Stat Tile  — **Prioritas P3**

Pemakaian kelas `.card` sudah **konsisten** di banyak halaman (WishesPage,
ActivityPage, CouponPage, ArchiveRestorePage, ManageThemesPage, router error
page). Tidak ada duplikasi wrapper kartu yang parah.

**Temuan:** [`StatCard`](../src/shared/components/StatCard.tsx) **kurang
dimanfaatkan** — stat/metrik di halaman admin (mis. CouponPage, PaymentPage)
masih dibuat manual sebagai kartu gradient. Pertimbangkan menyeragamkan semua
tile metrik ke `StatCard`.

---

## 6. Helper/Komponen lokal yang menduplikasi standar  — **Prioritas P3**

Beberapa file mendefinisikan helper kecil yang seharusnya jadi komponen bersama:

- [`src/features/admin/pages/ArchiveRestorePage.tsx`](../src/features/admin/pages/ArchiveRestorePage.tsx) — `PlanBadge`, `PaymentBadge`, `RowSpinner` didefinisikan lokal. `PlanBadge`/`PaymentBadge` overlap dengan `<Badge>`; pola "plan badge" & "payment badge" juga muncul di TenantPage/PaymentPage/TransactionMonitoring → kandidat komponen bersama (`PlanBadge`, `PaymentStatusBadge`).
- [`src/features/payment/pages/PaymentPage.tsx`](../src/features/payment/pages/PaymentPage.tsx) & [`TransactionMonitoringPage.tsx`](../src/features/admin/pages/TransactionMonitoringPage.tsx) — fungsi `getStatusBadge()` yang mengembalikan string kelas Tailwind; logika status transaksi ini diduplikasi → satukan jadi satu util/komponen status transaksi.

---

## 7. Loading / Empty State  — **Prioritas P4**

Sebagian besar **sudah konsisten**: `PageLoader`/`LoadingSpinner`/`LoadingOverlay`
([`Loading.tsx`](../src/shared/components/Loading.tsx)), [`ApiLoader`](../src/shared/components/ApiLoader.tsx),
dan empty-state bawaan [`DataTable`](../src/shared/components/DataTable.tsx).

Catatan kecil:
- Spinner inline di tombol (mis. CouponPage) bisa dihapus karena `Button`
  sudah punya prop `loading` — pakai itu setelah tombol dimigrasi (§3).
- [`InvitationPage.tsx`](../src/features/invitation/pages/InvitationPage.tsx)
  punya layar loading multi-pesan **sengaja kustom** (UX publik) — biarkan.

---

## 8. Usulan Urutan Pengerjaan

1. **Pra-syarat:** lengkapi barrel export `src/shared/components/index.ts`
   (tambah StatCard, Pagination, ImageUpload, QrisUpload, dll.) + (opsional)
   tambah varian `purple`/clickable ke `Badge`, dan buat komponen
   `FormField`/`Input`/`Select`/`Textarea`.
2. **P1 — Badge:** migrasi 9 file di §1 ke `<Badge>`; ekstrak `PlanBadge` &
   `PaymentStatusBadge` bersama (§6).
3. **P1 — Input:** seragamkan file divergen di §2 ke `.input-field`/komponen baru.
4. **P2 — Button:** ganti `<button>` mudah (§3 P2a); buat `Tabs`/`SegmentedControl`
   lalu migrasi tab switcher (§3 P2b).
5. **P3 — Modal/StatCard:** migrasi `RSVPSuccessModal` ke `Modal`; pakai `StatCard`
   untuk tile metrik admin.
6. **P4 — pembersihan:** hapus spinner tombol manual setelah Button dipakai.

> **Catatan keamanan refactor:** jangan menyentuh tombol/markup di
> `ThemeWrapper.tsx` dan file payload tema (`tema01Payload.ts`, dll.) — itu HTML
> tema tamu, bukan UI admin, dan punya kontrak class/id sendiri.
</content>
</invoke>
