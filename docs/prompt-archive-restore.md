# Prompt Fitur: Archive & Restore Data Tenant

> Dokumen ini adalah prompt lengkap untuk membangun fitur **Archive & Restore** data tenant.
> Bagian **A. Konsep & Cara Kerja** adalah brief asli (logika/backend).
> Bagian **B. Spesifikasi UI** menjabarkan tampilan & mekanisme loading agar **konsisten dengan menu yang sudah ada** di project ini.
> Bagian **C. Kontrak API & Data** dan **D. Checklist** untuk implementasi.

---

## A. Konsep & Cara Kerja (brief asli)

Dengan banyaknya data yang masuk, ada kekhawatiran soal limit & performa database saat ini. Oleh karena itu ditambahkan fitur **Archive** dan **Restore** data.

- **Archive berbasis data tenant.** Admin memilih tenant mana yang akan di-archive, lalu data tenant itulah yang dihapus.
- **Sebelum menghapus**, kumpulkan **semua data yang terkait** dengan tenant tersebut, simpan ke dalam sebuah **JSON**. JSON ini dipakai untuk fitur **Restore** — mengembalikan seluruh data tenant yang bersangkutan.
- **Penghapusan bersifat menyeluruh** — perlu cek semua sheet yang ada. Jadi bukan cuma menghapus dari sheet **Tenants**, tetapi juga data lain, misalnya:
  **Users, TenantActiveFeature, Transactions, QuotesVariant, Images, Guests, Wishes, Gifts, ActivityLogs, InvitationContent** (dan sheet relevan lain yang menyimpan baris ber-`tenant_id`).
- Data tenant yang dihapus **ditampung ke sheet baru bernama `ArchiveAndRestore`** dengan kolom:

  | Kolom | Keterangan |
  |---|---|
  | `id` | ID ArchiveAndRestore |
  | `tenant_id` | ID tenant yang diarsip |
  | `slug` | Slug undangan |
  | `wedding_date` | Tanggal pernikahan |
  | `groom_name` | Nama mempelai pria |
  | `bride_name` | Nama mempelai wanita |
  | `plan_type` | Paket (basic/pro/premium) |
  | `status_payment` | Status pembayaran |
  | `tanggal_archive` | Timestamp saat di-archive |
  | `url_json` | URL/lokasi file JSON backup (di Google Drive) |

### Catatan / Aturan bisnis

1. **Guard sebelum archive — cek `ReviewAndRating.flag_show_review`.** Sebelum mulai menyimpan/memproses archive, cek dulu apakah tenant punya `ReviewAndRating.flag_show_review = true`. **Jika `true`, hentikan proses** (jangan lanjut simpan apa pun) dan kembalikan **error message yang jelas**. Pengecekan ini murni guard di awal — tidak ada hubungannya dengan isi JSON backup.
2. **Hanya data di spreadsheet yang dihapus.** Data di **Google Drive jangan dihapus** saat archive, karena masih dipakai jika admin melakukan restore.
3. Pada menu Archive tenants terdapat **tombol hapus (permanen)**. Jika ditekan, action-nya menghapus **semua data** untuk tenant itu, **termasuk** baris di `ArchiveAndRestore`, **folder fisik di Google Drive**, dan **file `url_json`** tempat backup JSON disimpan.
4. Ketika **Restore** data berhasil: bersihkan artefak arsip yang sudah tidak diperlukan lagi — yaitu **hapus file JSON backup di Google Drive** dan **hapus baris tenant tsb dari sheet `ArchiveAndRestore`** (karena datanya sudah dikembalikan, arsip tidak diperlukan lagi). **Restore TIDAK menyentuh sheet `ReviewAndRating`** sama sekali.

---

## B. Spesifikasi UI

### B.0. Keputusan desain (hasil konfirmasi)

| Aspek | Keputusan |
|---|---|
| Struktur menu | **1 menu** dengan **2 tab**: tab **"Tenant Aktif"** (pilih & archive) + tab **"Arsip"** (restore / hapus permanen). |
| Cara pilih tenant utk archive | **Aksi per baris** — tombol Archive di kolom aksi tiap baris (archive satu tenant per klik). |
| Konfirmasi | **`ConfirmDialog` varian `danger`**. Untuk **hapus permanen** wajib **ketik slug** sebagai verifikasi. Archive & Restore cukup konfirmasi biasa (tanpa ketik). |
| Loading | **Background task** (jalan di latar, admin boleh pindah menu, progress tampil di header) — pakai infrastruktur `backgroundTaskStore` + `BackgroundTaskIndicator` + `BackgroundTaskModal` yang **sudah ada** (dipakai import Google Contacts). Plus penanda **per-baris** pada baris yang sedang diproses. |

### B.1. Penempatan menu & routing

- **Sidebar** (`src/core/layout/DashboardLayout.tsx`, array `navItems`): tambahkan entry baru, **role `superadmin`**:
  ```tsx
  {
    to: '/private/archive-restore',
    icon: HiOutlineArchive, // react-icons/hi (HiOutlineArchive / HiOutlineArchiveBox)
    label: t('sidebar.archive_restore', 'Archive & Restore'),
    roles: ['superadmin'],
    desc: t('sidebar.archive_restore_desc', 'Arsipkan & pulihkan data tenant'),
  }
  ```
  Class link mengikuti pola: `className={({ isActive }) => \`sidebar-link ${isActive ? 'active' : ''}\`}`.

- **Router** (`src/core/router/index.tsx`): daftarkan route privat dengan guard role:
  ```tsx
  import { ArchiveRestorePage } from '@/features/admin/pages/ArchiveRestorePage';
  // ...
  {
    path: 'archive-restore',
    element: (
      <ProtectedRoute allowedRoles={['superadmin']}>
        <ArchiveRestorePage />
      </ProtectedRoute>
    ),
  }
  ```

- **Halaman**: `src/features/admin/pages/ArchiveRestorePage.tsx`.

### B.2. Kerangka halaman (`ArchiveRestorePage`)

Bungkus halaman seperti halaman admin lain:

```tsx
<div className="space-y-6 animate-fade-in pb-20">
  {/* 1. Header: judul + tombol refresh */}
  {/* 2. Tab switcher: "Tenant Aktif" | "Arsip" */}
  {/* 3. Search bar */}
  {/* 4. Konten tab (DataTable) */}
  {/* 5. Dialog konfirmasi (archive / restore / hapus permanen) */}
</div>
```

**Header**

```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <div>
    <h1 className="text-lg font-display font-bold text-gray-800 dark:text-white">
      Archive &amp; Restore
    </h1>
    <p className="text-xs text-gray-400 mt-0.5">
      Arsipkan data tenant untuk menghemat database, lalu pulihkan kapan saja.
    </p>
  </div>
  <IconButton
    onClick={() => activeTab === 'active' ? fetchTenants(true) : fetchArchives(true)}
    icon={<HiOutlineRefresh className="w-4 h-4" />}
    spinning={loading}
    title="Refresh Data"
  />
</div>
```

**Tab switcher** (segmented control, pakai warna gold untuk tab aktif):

```tsx
<div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
  {(['active', 'archived'] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${
        activeTab === tab
          ? 'bg-white dark:bg-gray-900 text-gold-600 shadow-sm'
          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
      }`}
    >
      {tab === 'active' ? 'Tenant Aktif' : 'Arsip'}
    </button>
  ))}
</div>
```

**Search bar** (mengikuti pola list page existing):

```tsx
<div className="bg-white dark:bg-wedding-dark-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
  <div className="relative">
    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
      <HiOutlineSearch className="w-4 h-4" />
    </span>
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder={activeTab === 'active' ? 'Cari tenant (nama/slug)...' : 'Cari arsip...'}
      className="input-field pl-9 text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 focus:bg-white dark:focus:bg-gray-900 focus:ring-gold-500 rounded-xl w-full"
    />
  </div>
</div>
```

### B.3. Tab "Tenant Aktif" — kolom & aksi (DataTable)

Pakai `DataTable` (`src/shared/components/DataTable.tsx`), `loading={loading}`, `emptyMessage="Tidak ada tenant aktif"`.

| key | header | render |
|---|---|---|
| `couple` | MEMPELAI | `{groom_name} & {bride_name}` (font-semibold) |
| `slug` | SLUG | mono kecil, `text-gray-500` |
| `wedding_date` | TGL NIKAH | format tanggal lokal |
| `plan_type` | PAKET | `<Badge variant="gold">{plan_type}</Badge>` |
| `status_payment` | BAYAR | Badge: `success` (lunas) / `warning` (pending) / `danger` (gagal) |
| `review` | REVIEW | jika `flag_show_review` → `<Badge variant="info">Review aktif</Badge>`, else `—` |
| `actions` | AKSI | tombol Archive (lihat di bawah) |

**Kolom AKSI — tombol Archive per baris:**

```tsx
{
  key: 'actions',
  header: 'Aksi',
  render: (t: Tenant) => {
    const reviewLocked = isReviewShown(t);            // flag_show_review === true
    const isBusy = archivingId === t.tenant_id;        // baris ini sedang diproses
    return (
      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        {isBusy ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold-600">
            <span className="w-3.5 h-3.5 border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin" />
            Mengarsipkan…
          </span>
        ) : (
          <div className={`tooltip tooltip-top ${reviewLocked ? 'opacity-40 pointer-events-none' : ''}`}>
            <button
              onClick={() => setTenantToArchive(t)}
              disabled={reviewLocked}
              className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:cursor-not-allowed"
            >
              <HiOutlineArchive className="w-4 h-4" />
            </button>
            <span className="tooltip-text">
              {reviewLocked ? 'Review masih tampil — tidak bisa diarsip' : 'Archive tenant'}
            </span>
          </div>
        )}
      </div>
    );
  }
}
```

> **Aturan #1 di UI:** jika `flag_show_review === true`, tombol Archive **dinonaktifkan** (redup + `pointer-events-none`) dengan tooltip penjelas. Backend tetap menolak sebagai pengaman ganda.

**Baris yang sedang diproses** ditandai juga di level baris (selain tombol) — gunakan `onRowClick`/styling kondisional bila perlu, atau cukup andalkan badge "Mengarsipkan…" + indikator background-task di header. Tidak ada loader full-screen (`skipLoader: true`).

### B.4. Tab "Arsip" — kolom & aksi (DataTable)

Data dari sheet `ArchiveAndRestore`. `emptyMessage="Belum ada data yang diarsipkan"`.

| key | header | render |
|---|---|---|
| `couple` | MEMPELAI | `{groom_name} & {bride_name}` |
| `slug` | SLUG | mono kecil |
| `wedding_date` | TGL NIKAH | tanggal |
| `plan_type` | PAKET | `<Badge variant="gold">` |
| `status_payment` | BAYAR | Badge sesuai status |
| `tanggal_archive` | DIARSIP | tanggal + jam |
| `url_json` | BACKUP | ikon link kecil → buka `url_json` di tab baru (atau badge "JSON tersimpan") |
| `actions` | AKSI | **Restore** + **Hapus permanen** |

**Kolom AKSI — Restore & Hapus permanen:**

```tsx
{
  key: 'actions',
  header: 'Aksi',
  render: (a: ArchiveRecord) => {
    const isBusy = processingArchiveId === a.tenant_id;
    if (isBusy) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gold-600">
          <span className="w-3.5 h-3.5 border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin" />
          Memproses…
        </span>
      );
    }
    return (
      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        {/* Restore */}
        <div className="tooltip tooltip-top">
          <button
            onClick={() => setArchiveToRestore(a)}
            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
          >
            <HiOutlineReply className="w-4 h-4" /> {/* atau HiOutlineRefresh / arrow-uturn */}
          </button>
          <span className="tooltip-text">Restore data tenant</span>
        </div>
        {/* Hapus permanen */}
        <div className="tooltip tooltip-top">
          <button
            onClick={() => setArchiveToDelete(a)}
            className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <HiOutlineTrash className="w-4 h-4" />
          </button>
          <span className="tooltip-text">Hapus permanen</span>
        </div>
      </div>
    );
  }
}
```

> Tooltip pakai `tooltip tooltip-top` (muncul **di atas** baris) dan `DataTable` desktop sudah memakai `overflow-x-clip` agar tooltip tidak terpotong.

### B.5. Dialog konfirmasi (`ConfirmDialog`)

Pakai `src/shared/components/ConfirmDialog.tsx`. Tiga state terpisah (`tenantToArchive`, `archiveToRestore`, `archiveToDelete`).

**a) Archive** — danger, **tanpa** ketik teks:

```tsx
<ConfirmDialog
  isOpen={!!tenantToArchive}
  onClose={() => setTenantToArchive(null)}
  onConfirm={handleArchive}
  variant="danger"
  title="Arsipkan Tenant"
  confirmLabel="Ya, Arsipkan"
  message={`Arsipkan data "${tenantToArchive?.groom_name} & ${tenantToArchive?.bride_name}"?`}
  description="Semua data tenant di spreadsheet akan dipindahkan ke arsip (JSON) lalu dihapus dari sheet. File di Google Drive TIDAK dihapus dan tetap aman untuk restore."
/>
```

**b) Restore** — primary/biasa, **tanpa** ketik teks:

```tsx
<ConfirmDialog
  isOpen={!!archiveToRestore}
  onClose={() => setArchiveToRestore(null)}
  onConfirm={handleRestore}
  variant="primary"
  title="Pulihkan Data Tenant"
  confirmLabel="Ya, Pulihkan"
  message={`Pulihkan kembali data "${archiveToRestore?.groom_name} & ${archiveToRestore?.bride_name}"?`}
  description="Data akan dikembalikan dari JSON ke semua sheet terkait. Setelah berhasil, file JSON backup di Google Drive dan baris arsip ini akan otomatis dihapus karena tidak diperlukan lagi."
/>
```

**c) Hapus permanen** — danger, **WAJIB ketik slug** sebagai verifikasi:

```tsx
<ConfirmDialog
  isOpen={!!archiveToDelete}
  onClose={() => setArchiveToDelete(null)}
  onConfirm={handlePermanentDelete}
  variant="danger"
  title="Hapus Permanen"
  confirmLabel="Hapus Permanen"
  message={`Tindakan ini TIDAK BISA dibatalkan. Data "${archiveToDelete?.groom_name} & ${archiveToDelete?.bride_name}" akan hilang selamanya.`}
  description="Termasuk: baris di ArchiveAndRestore, folder fisik di Google Drive, dan file JSON backup. Restore tidak akan mungkin lagi setelah ini."
  requireText={archiveToDelete?.slug}        // user wajib ketik slug (domain_slug) untuk mengaktifkan tombol
  loading={isDeleting}
/>
```

> **Prop terverifikasi** dari [`src/shared/components/ConfirmDialog.tsx`](../src/shared/components/ConfirmDialog.tsx): verifikasi teks pakai **`requireText?: string`** (TUNGGAL). Komponen otomatis membuat label `"Ketik <b>{requireText}</b> untuk mengkonfirmasi:"` + placeholder `"Ketik {requireText}..."` — **tidak ada** prop label/placeholder terpisah. Contoh nyata: `TenantPage.tsx` memakai `requireText="DELETE"` untuk hapus tenant. Di sini kita pakai **slug tenant** (`archiveToDelete?.slug`, yaitu `domain_slug`) sebagai teks konfirmasi.
>
> Props lengkap yang tersedia: `isOpen, onClose, onConfirm, title, message, description?, variant?('danger'|'primary'), confirmLabel?, cancelLabel?, loading?, warningTitle?, icon?, requireText?`.

### B.6. Mekanisme loading (PENTING — konsisten dengan import Google Contacts)

Gunakan **infrastruktur background task yang sudah ada**:

- `src/shared/store/backgroundTaskStore.ts` — store global berisi daftar task (`addTask`, `updateTask`, `removeTask`, `clearCompleted`).
- `src/shared/components/BackgroundTaskIndicator.tsx` — tombol di **header** (sudah dimount di `DashboardLayout`) yang menampilkan jumlah task berjalan + ikon berputar; berubah warna gold (running) → green (success) → red (error).
- `src/shared/components/BackgroundTaskModal.tsx` — modal detail berisi progress bar per task.

**Perilaku yang diharapkan:**
1. Saat admin menekan **Archive** / **Restore** / **Hapus permanen** dan menyetujui dialog:
   - Tandai baris terkait sebagai busy (`archivingId` / `processingArchiveId`) → tampil spinner per-baris + teks "Mengarsipkan…/Memproses…".
   - Panggil `addTask({ id, name, total })` agar indikator muncul di header.
   - Jalankan proses **per-langkah/per-sheet** (atau per-chunk jika datanya besar) dengan `apiClient ... { skipLoader: true }` supaya **layar tidak terblokir**.
   - Setiap langkah selesai → `updateTask(id, { progress, successCount, failCount, status })`.
2. **Admin boleh navigasi ke menu lain** selama proses berjalan — task tetap hidup di store global dan progress tetap terlihat di header.
3. Saat selesai: set `status: 'success' | 'error'` + `details`, dan tampilkan `toast.success/error`. Refresh data tab terkait (`fetchTenants(true)` / `fetchArchives(true)`), keduanya silent (`skipLoader`).

**Pola panggilan (meniru `bulkCreateGuests` di `guestStore.ts`):**

```tsx
archiveTenant: async (tenant) => {
  const { addTask, updateTask } = (useBackgroundTaskStore as any).getState();
  const taskId = `archive-${tenant.tenant_id}-${Date.now()}`;
  addTask({ id: taskId, name: `Arsipkan ${tenant.slug}`, total: 100 });
  try {
    // langkah 1: kumpulkan + simpan JSON
    updateTask(taskId, { progress: 30, status: 'running' });
    // langkah 2: tulis ke ArchiveAndRestore
    updateTask(taskId, { progress: 60, status: 'running' });
    // langkah 3: hapus baris dari semua sheet
    const res = await archiveApi.archiveTenant({ tenant_id: tenant.tenant_id }, { skipLoader: true } as any);
    updateTask(taskId, {
      progress: 100,
      successCount: res.success ? 1 : 0,
      failCount: res.success ? 0 : 1,
      status: res.success ? 'success' : 'error',
      details: res.success ? 'Arsip selesai' : (res.message || 'Gagal'),
    });
    return res;
  } catch (e) {
    updateTask(taskId, { progress: 100, status: 'error', failCount: 1, details: 'Gagal' });
    throw e;
  }
}
```

> Catatan: jika backend (Google Apps Script) menyelesaikan archive dalam **satu** request, progress bisa langsung 0→100 dengan satu task. Background-task tetap dipakai supaya admin bisa pindah menu sambil menunggu respons request yang berjalan lama, dan hasil akhir muncul di header + toast.

### B.7. State komponen (ringkas)

```tsx
const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
const [search, setSearch] = useState('');

// dialog targets
const [tenantToArchive, setTenantToArchive] = useState<Tenant | null>(null);
const [archiveToRestore, setArchiveToRestore] = useState<ArchiveRecord | null>(null);
const [archiveToDelete, setArchiveToDelete] = useState<ArchiveRecord | null>(null);

// per-row busy markers
const [archivingId, setArchivingId] = useState<string | null>(null);
const [processingArchiveId, setProcessingArchiveId] = useState<string | null>(null);
const [isDeleting, setIsDeleting] = useState(false);
```

### B.8. Responsif & dark mode

- `DataTable` sudah otomatis menyediakan tampilan **kartu** di mobile (`block md:hidden`) dan tabel di desktop (`hidden md:block`). Cukup definisikan `columns`.
- Semua warna pakai prefiks `dark:` mengikuti pola existing.
- Tab switcher & search bar sudah responsif (lebar penuh di mobile).

---

## C. Kontrak API & Data

### C.1. Endpoints (`src/core/api/endpoints.ts`)

Pakai pola `apiClient.post('', { action, ... }, config)`:

```ts
export const archiveApi = {
  // List tenant aktif (atau pakai tenantApi.getTenants yang sudah ada)
  getActiveTenants: async (config?: any) => {
    const res = await apiClient.post('', { action: 'getTenants' }, config);
    return res.data;
  },
  // List isi sheet ArchiveAndRestore
  getArchives: async (config?: any) => {
    const res = await apiClient.post('', { action: 'getArchives' }, config);
    return res.data;
  },
  // Archive 1 tenant: kumpulkan data -> simpan JSON ke Drive -> tulis ke ArchiveAndRestore -> hapus dari semua sheet
  archiveTenant: async (data: { tenant_id: string }, config?: any) => {
    const res = await apiClient.post('', { action: 'archiveTenant', ...data }, config);
    return res.data;
  },
  // Restore: baca JSON -> tulis balik ke semua sheet -> hapus file JSON di Drive -> hapus baris ArchiveAndRestore (TIDAK menyentuh ReviewAndRating)
  restoreTenant: async (data: { tenant_id: string }, config?: any) => {
    const res = await apiClient.post('', { action: 'restoreTenant', ...data }, config);
    return res.data;
  },
  // Hapus permanen: hapus baris ArchiveAndRestore + folder Drive + file JSON
  deleteArchivePermanent: async (data: { tenant_id: string }, config?: any) => {
    const res = await apiClient.post('', { action: 'deleteArchivePermanent', ...data }, config);
    return res.data;
  },
};
```

> Semua action di atas dipanggil dengan `{ skipLoader: true }` dari store agar tidak memunculkan loader full-screen (loading ditangani via background-task + per-baris).

### C.2. Tipe data (`src/types/index.ts`)

```ts
export interface ArchiveRecord {
  tenant_id: string;
  slug: string;
  wedding_date: string;
  groom_name: string;
  bride_name: string;
  plan_type: 'basic' | 'pro' | 'premium';
  status_payment: string;
  tanggal_archive: string;
  url_json: string;
}
```

### C.3. Store (`src/features/admin/store/archiveStore.ts`)

Mengikuti pola `themeStore`/`masterQuotesStore`:

```ts
interface ArchiveState {
  tenants: Tenant[];
  archives: ArchiveRecord[];
  loading: boolean;
  hasLoaded: boolean;
  lastFetched: number | null;

  fetchTenants: (force?: boolean, silent?: boolean) => Promise<void>;
  fetchArchives: (force?: boolean, silent?: boolean) => Promise<void>;
  archiveTenant: (tenant: Tenant) => Promise<{ success: boolean; message?: string }>;
  restoreTenant: (rec: ArchiveRecord) => Promise<{ success: boolean; message?: string }>;
  deleteArchivePermanent: (rec: ArchiveRecord) => Promise<{ success: boolean; message?: string }>;

  // optimistic helpers (pindah baris antar list secara lokal saat sukses)
  removeTenantLocal: (id: string) => void;
  removeArchiveLocal: (id: string) => void;
}
```

- Caching 5 menit (force untuk refresh), pola sama seperti store lain.
- Setelah `archiveTenant` sukses: hapus dari `tenants` lokal, opsional tambahkan ke `archives`.
- Setelah `restoreTenant`/`deleteArchivePermanent` sukses: hapus dari `archives` lokal.

### C.4. Catatan backend (Google Apps Script) — **terverifikasi dari `backend/Code.gs`**

> Backend ADA di repo: [`backend/Code.gs`](../backend/Code.gs). Sudah ada action `deleteTenant` (baris ~1023) dengan cascading delete, tapi daftar sheet-nya **PARSIAL** (`['Users','Guests','Wishes','Gifts','TenantActiveFeature','ActivityLogs']` + `Images`) — **melewatkan** `Transactions, InvitationContent, ReviewAndRating, QuotesVariant, ImageGallery`. Jangan tiru daftar itu mentah-mentah. Daftar otoritatif diambil dari `setupSpreadsheet()` (baris ~2892).

#### Daftar sheet tenant-scoped (FINAL — kolom kunci selalu `tenant_id`)

| Sheet | tenant_id? | Catatan |
|---|---|---|
| `Tenants` | **tidak** (`id` = tenant id) | Baris induk tenant; relasi anak = `tenant_id`. Slug = `domain_slug`. |
| `Users` | ✅ | akun admin tenant |
| `QuotesVariant` | ✅ (opsional) | sheet campur: global (`tenant_id` kosong) + custom per-tenant. **Hanya hapus baris yang `tenant_id` = tenant ybs**, jangan sentuh quote global. |
| `Guests` | ✅ | |
| `Wishes` | ✅ | |
| `Gifts` | ✅ | |
| `ActivityLogs` | ✅ | |
| `InvitationContent` | ✅ | |
| `Images` | ✅ | kolom: `drive_file_id`, `drive_url` (BUKAN `drive_id`). File fisik di Drive **tidak** dihapus saat archive. |
| `ImageGallery` | ✅ | **mudah terlewat** — relasi galeri (`tenant_id`, `image_id`). Wajib ikut archive/restore. |
| `ReviewAndRating` | ✅ | lihat guard di bawah |
| `TenantActiveFeature` | ✅ | |
| `Transactions` | ✅ | |

> Sheet NON-tenant (JANGAN disentuh): `Themes, MstAdditionalFeature, WebsiteConfig, ThemeImageRequirements`. Re-audit `setupSpreadsheet()` saat implementasi kalau ada sheet baru.

#### 1. Guard archive (`ReviewAndRating.flag_show_review`)
Di awal `archiveTenant`, **sebelum** menulis apa pun: `DB.getByTenant('ReviewAndRating', tenantId)`; jika ada baris `flag_show_review === true` → **batalkan**, kembalikan `{ success:false, message:'Tenant ini masih menampilkan review (flag_show_review aktif). Nonaktifkan tampilan review terlebih dahulu sebelum mengarsipkan.' }`. Murni guard — tidak mempengaruhi isi JSON.

#### 2. Sheet yang disisir saat archive
Kumpulkan **semua** baris ber-`tenant_id` (lihat tabel) ke JSON, lalu hapus dari tiap sheet, plus baris induk di `Tenants` (by `id`). `QuotesVariant`: filter hanya `tenant_id === tenantId`. Helper backend yang sudah ada: `DB.getByTenant(sheetName, tenantId)` (filter `row.tenant_id === tenantId`, baris ~500) & `DB.deleteRow(sheetName, id)` (baris ~543).

#### 3. Format JSON backup
Per-sheet → array of rows, plus metadata (timestamp, header kolom tiap sheet, versi schema) agar tahan perubahan urutan kolom.

#### 4. Lokasi JSON & Drive
- Simpan JSON ke Google Drive (folder arsip khusus), tulis link-nya ke kolom `url_json`.
- Folder media tenant: `{root}/tenants/{tenantId}/{image_type}/...` (lihat baris ~2057). **Saat archive: JANGAN hapus**.

#### 5. Restore (`restoreTenant`)
Baca JSON dari `url_json` → tulis balik semua baris ke sheet masing-masing (termasuk `Tenants`, `ImageGallery`, dst.). Baris `Images` dikembalikan apa adanya — `drive_file_id`/`drive_url` lama tetap valid karena file Drive tidak pernah dipindah. Setelah sukses, **bersihkan artefak arsip**:
   - **Hapus file JSON** di Drive (`url_json`).
   - **Hapus baris** tenant dari `ArchiveAndRestore`.
   - **JANGAN menyentuh `ReviewAndRating`** — review ikut dikembalikan sebagai data biasa, tidak ada langkah khusus.

#### 6. Hapus permanen (`deleteArchivePermanent`)
Hapus baris `ArchiveAndRestore` + **folder fisik tenant di Drive** (`{root}/tenants/{tenantId}`) + **file JSON** (`url_json`). Setelah ini restore tidak mungkin lagi. (Pola hapus Drive: contoh `deleteTenant` baris ~1039 — `Drive.Files.remove(id)` dengan fallback `DriveApp...setTrashed(true)`.)

#### 7. Idempotensi & transaksionalitas
   - Tulis JSON **dulu** (sumber kebenaran) sebelum menghapus apa pun.
   - Jika gagal di tengah, sediakan cara aman mengulang tanpa duplikasi.

#### 8. Bonus: action existing yang bisa diperbaiki
`deleteTenant` yang ada **parsial** & punya bug kolom (`img.drive_id`, padahal kolomnya `drive_file_id`). Pertimbangkan memperbaikinya sekalian, atau minimal pastikan `deleteArchivePermanent` baru tidak mewarisi bug yang sama.

---

## D. Checklist Implementasi

**Frontend**
- [ ] `src/types/index.ts` — tambah `ArchiveRecord` (+ tipe request bila perlu).
- [ ] `src/core/api/endpoints.ts` — tambah `archiveApi` (getArchives, archiveTenant, restoreTenant, deleteArchivePermanent).
- [ ] `src/features/admin/store/archiveStore.ts` — store baru (state + actions + caching + optimistic).
- [ ] `src/features/admin/pages/ArchiveRestorePage.tsx` — halaman: header, tab, search, 2× `DataTable`, 3× `ConfirmDialog`.
- [ ] Integrasi **background task** (`addTask`/`updateTask`) + spinner per-baris; semua API `skipLoader: true`.
- [ ] `src/core/router/index.tsx` — route `archive-restore` (role `superadmin`).
- [ ] `src/core/layout/DashboardLayout.tsx` — entry sidebar baru.
- [ ] i18n keys: `sidebar.archive_restore`, `sidebar.archive_restore_desc`, label tab, pesan dialog, toast.
- [ ] Toast sukses/gagal untuk archive, restore, hapus permanen.
- [ ] `npx tsc --noEmit` lulus.

**Backend (Apps Script)**
- [ ] Buat sheet `ArchiveAndRestore` dengan kolom sesuai §A.
- [ ] Action `archiveTenant`: **guard di awal** — tolak jika `ReviewAndRating.flag_show_review = true` dengan error message jelas. Lalu kumpulkan data dari **SEMUA 13 sheet tenant-scoped** (lihat tabel §C.4; `QuotesVariant` hanya baris ber-`tenant_id`) → tulis JSON ke Drive → isi `ArchiveAndRestore` → hapus baris dari semua sheet + induk `Tenants`. **Jangan** hapus Drive. ⚠️ Jangan tiru daftar parsial `deleteTenant` existing.
- [ ] Action `restoreTenant`: baca JSON → tulis balik ke semua sheet → hapus file JSON di Drive → hapus baris `ArchiveAndRestore`. **TIDAK menyentuh `ReviewAndRating`.**
- [ ] Action `deleteArchivePermanent`: hapus baris `ArchiveAndRestore` + folder fisik Drive + file `url_json`.
- [ ] Action `getArchives`: kembalikan isi sheet `ArchiveAndRestore`.

**Aturan bisnis (uji)**
- [ ] Tenant dengan `flag_show_review = true` → tombol Archive disabled + backend menolak.
- [ ] Archive **tidak** menghapus Google Drive.
- [ ] Hapus permanen **menghapus** Drive + JSON + baris arsip.
- [ ] Restore mengembalikan seluruh data + menghapus file JSON & baris `ArchiveAndRestore` (TIDAK menyentuh `ReviewAndRating`).
- [ ] Admin bisa pindah menu saat proses berjalan; progress terlihat di header; toast saat selesai.

---

## E. Referensi pola di codebase (verbatim, untuk konsistensi)

| Kebutuhan | Contoh di project | File |
|---|---|---|
| Halaman list (header, search, DataTable, toast) | `MasterQuotesListPage`, `ManageThemesPage` | `src/features/admin/pages/*` |
| Tabel + skeleton + mobile card | `DataTable` | `src/shared/components/DataTable.tsx` |
| Konfirmasi danger + ketik teks | `ConfirmDialog` | `src/shared/components/ConfirmDialog.tsx` |
| Loading per-baris (savingRowId + spinner) | Master Quotes toggle | `src/features/admin/pages/ManageThemesPage.tsx` |
| Background task (navigasi bebas, progress di header) | Import Google Contacts | `backgroundTaskStore.ts`, `BackgroundTaskIndicator.tsx`, `BackgroundTaskModal.tsx`, `guestStore.bulkCreateGuests` |
| Store Zustand (state + CRUD + cache) | `themeStore`, `masterQuotesStore` | `src/features/admin/store/*` |
| Endpoint pattern | semua `*Api` | `src/core/api/endpoints.ts` |
| Tombol/badge/tooltip/warna | komponen + `index.css` | `src/shared/components/*`, `src/index.css` |

---

## F. Verifikasi Otomatis (jangan cek manual)

> **Konteks tooling (terverifikasi dari `package.json`):** project ini **belum punya** framework test (tidak ada vitest/jest, tidak ada script `test`). Yang tersedia: `tsc` (type-check), `eslint`, `vite build`. Backend Apps Script juga tanpa test runner. Maka verifikasi otomatis dibagi 2: **(F.1) yang bisa langsung jalan tanpa instalasi**, dan **(F.2) yang butuh setup ringan (opsional)**. Tujuannya: setelah implementasi, kebenaran fitur dicek lewat **perintah/script yang dijalankan**, bukan inspeksi mata di spreadsheet/Drive/UI.

### F.1. Cek otomatis yang LANGSUNG bisa (gunakan ini minimal)

Jalankan berurutan; semua harus lulus sebelum dianggap selesai:

```bash
# 1. Type-check seluruh project (paling penting — menangkap salah tipe/props)
npx tsc --noEmit -p tsconfig.json        # harus exit 0

# 2. Lint (gaya & error statis)
npm run lint                             # harus tanpa error

# 3. Build penuh (memastikan tidak ada yang putus saat bundling)
npm run build                            # harus sukses
```

- [ ] **F.1.1** `tsc --noEmit` exit 0 — tidak ada error tipe (mis. `ArchiveRecord`, props `ConfirmDialog`, signature store).
- [ ] **F.1.2** `npm run lint` bersih untuk file baru (`ArchiveRestorePage.tsx`, `archiveStore.ts`, `endpoints.ts`).
- [ ] **F.1.3** `npm run build` sukses.

### F.2. Self-check Backend Apps Script (OTOMATIS via fungsi GAS)

Karena GAS tidak punya unit-test runner, buat **satu fungsi self-test** di `backend/` yang dijalankan sekali dari editor Apps Script (atau via `clasp run`). Fungsi ini memverifikasi integritas tanpa kamu membuka spreadsheet/Drive manual. **Tulis sebagai bagian dari implementasi.**

```js
/**
 * Jalankan manual dari editor Apps Script: pilih fungsi -> Run.
 * Mengembalikan/log laporan PASS/FAIL untuk tiap cek. Tidak mengubah data.
 */
function selfCheckArchiveRestore() {
  var report = [];
  function check(name, cond) { report.push((cond ? 'PASS' : 'FAIL') + ' - ' + name); }

  // 1. Sheet ArchiveAndRestore ada + kolom sesuai spesifikasi
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sh = ss.getSheetByName('ArchiveAndRestore');
  check('Sheet ArchiveAndRestore ada', !!sh);
  if (sh) {
    var headers = sh.getDataRange().getValues()[0] || [];
    ['id','tenant_id','slug','wedding_date','groom_name','bride_name','plan_type','status_payment','tanggal_archive','url_json']
      .forEach(function(col){ check('Kolom ArchiveAndRestore.' + col, headers.indexOf(col) !== -1); });
  }

  // 2. Daftar 13 sheet tenant-scoped semuanya punya kolom tenant_id (kecuali Tenants pakai id)
  var tenantSheets = ['Users','QuotesVariant','Guests','Wishes','Gifts','ActivityLogs',
    'InvitationContent','Images','ImageGallery','ReviewAndRating','TenantActiveFeature','Transactions'];
  tenantSheets.forEach(function(name){
    var s = ss.getSheetByName(name);
    var h = s ? (s.getDataRange().getValues()[0] || []) : [];
    check(name + ' punya kolom tenant_id', h.indexOf('tenant_id') !== -1);
  });
  check('Tenants pakai kolom id', (ss.getSheetByName('Tenants').getDataRange().getValues()[0] || []).indexOf('id') !== -1);

  // 3. Semua action terdaftar di router doPost (cek string action di handler)
  ['archiveTenant','restoreTenant','deleteArchivePermanent','getArchives']
    .forEach(function(a){ check('Action terdaftar: ' + a, typeof ArchiveService !== 'undefined' && typeof ArchiveService[a] === 'function'); });

  Logger.log(report.join('\n'));
  return report;
}
```

- [ ] **F.2.1** Buat `selfCheckArchiveRestore()` (atau sejenis) di backend; semua baris laporan **PASS**.
- [ ] **F.2.2** Cek otomatis mencakup: sheet `ArchiveAndRestore` + 10 kolomnya, 12 sheet anak punya `tenant_id`, `Tenants` punya `id`, dan 4 action terdaftar.

### F.3. Test round-trip Archive→Restore di backend (OTOMATIS, pakai tenant dummy)

Fungsi GAS kedua yang **benar-benar menjalankan** archive lalu restore pada **tenant dummy** dan memverifikasi data kembali utuh — sehingga kamu tidak perlu membandingkan baris manual.

```js
/**
 * Buat tenant dummy + beberapa baris anak -> archive -> restore -> bandingkan.
 * Bersihkan dummy di akhir. Log PASS/FAIL.
 */
function testArchiveRestoreRoundTrip() {
  var auth = { role: 'superadmin' };            // sesuaikan dgn bentuk auth internal
  var report = [];
  function check(n, c){ report.push((c?'PASS':'FAIL')+' - '+n); }

  // a. SETUP dummy: 1 Tenant + N baris di tiap sheet anak (flag_show_review = false)
  var tenantId = 'TEST_' + Utilities.getUuid();
  // ... insert dummy rows via DB.insert(...) ...
  var before = snapshotTenantRowCounts_(tenantId);   // helper: {sheet: jumlahBaris}

  // b. GUARD: set ReviewAndRating.flag_show_review=true -> archive HARUS ditolak
  // ... set flag true ...
  var blocked = ArchiveService.archiveTenant(auth, { tenant_id: tenantId });
  check('Archive ditolak saat flag_show_review=true', blocked && blocked.success === false);
  // ... set flag false lagi ...

  // c. ARCHIVE -> semua baris di sheet harus 0, baris ArchiveAndRestore harus ada, url_json terisi, file Drive tetap ada
  var arc = ArchiveService.archiveTenant(auth, { tenant_id: tenantId });
  check('archiveTenant success', arc && arc.success === true);
  check('Semua sheet anak kosong utk tenant', allTenantRowsZero_(tenantId));
  check('Baris ArchiveAndRestore dibuat', !!DB.findOne('ArchiveAndRestore','tenant_id',tenantId));
  check('Folder Drive tenant MASIH ada', driveTenantFolderExists_(tenantId));

  // d. RESTORE -> jumlah baris tiap sheet harus sama dgn 'before', JSON & baris arsip terhapus, ReviewAndRating tidak disentuh khusus
  var res = ArchiveService.restoreTenant(auth, { tenant_id: tenantId });
  check('restoreTenant success', res && res.success === true);
  var after = snapshotTenantRowCounts_(tenantId);
  check('Jumlah baris identik sebelum vs sesudah restore', JSON.stringify(before) === JSON.stringify(after));
  check('Baris ArchiveAndRestore terhapus stlh restore', !DB.findOne('ArchiveAndRestore','tenant_id',tenantId));

  // e. CLEANUP dummy (archive lalu deleteArchivePermanent, atau hapus langsung)
  // ... cleanup ...
  check('Drive folder dummy terhapus stlh deletePermanent', !driveTenantFolderExists_(tenantId));

  Logger.log(report.join('\n'));
  return report;
}
```

- [ ] **F.3.1** Round-trip dummy: archive → semua sheet anak 0 baris, `ArchiveAndRestore` terisi, `url_json` valid, **folder Drive tetap ada**.
- [ ] **F.3.2** Restore → jumlah baris tiap sheet **identik** dengan sebelum archive; JSON + baris arsip terhapus; `ReviewAndRating` tidak diperlakukan khusus.
- [ ] **F.3.3** Guard: archive ditolak saat `flag_show_review=true`.
- [ ] **F.3.4** `deleteArchivePermanent` → folder Drive + JSON + baris arsip benar-benar hilang.
- [ ] **F.3.5** Test memakai **tenant dummy** & membersihkan dirinya sendiri (idempoten, aman diulang).

### F.4. (Opsional) Unit test frontend dengan Vitest

Kalau mau cek otomatis logika frontend (bukan cuma tipe), pasang Vitest (ringan, native untuk Vite):

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
```
Tambah ke `package.json`: `"test": "vitest run"`, lalu tulis test untuk:
- [ ] **F.4.1** `archiveStore`: `archiveTenant` sukses → tenant hilang dari list lokal & masuk ke `archives`; gagal → revert (optimistic).
- [ ] **F.4.2** Helper `isReviewShown(tenant)` benar untuk `true/'true'/'TRUE'/false`.
- [ ] **F.4.3** `ConfirmDialog` hapus permanen: tombol confirm tetap **disabled** sampai input == `requireText` (slug).

> Jika tidak ingin menambah dependency, **F.1 + F.2 + F.3 sudah cukup** sebagai jaring pengaman otomatis. F.4 hanya nilai tambah.

### F.5. Definisi "Selesai" (semua harus tercentang)

- [ ] F.1.1–F.1.3 lulus (tsc, lint, build).
- [ ] F.2 self-check backend semua **PASS**.
- [ ] F.3 round-trip backend semua **PASS**.
- [ ] Aturan bisnis di §D (uji) terverifikasi lewat F.2/F.3 — **bukan** cek manual.
