# User Manual – Wedding Invitation SaaS

Selamat datang di panduan penggunaan aplikasi Wedding Invitation SaaS. Aplikasi ini dirancang untuk memudahkan manajemen pembuatan undangan pernikahan digital (tenant) secara efisien dengan berbagai fitur kustomisasi.

## Hak Akses (Role) & Akun Demo

Aplikasi ini memiliki 3 level hak akses. Anda dapat mengakses sistem ini menggunakan akun-akun demo berikut ini (harap pastikan Anda telah memasukkan data ini ke sistem/database / Google Sheet):

1. **Superadmin**
   - **Username**: superadmin
   - **Password**: admin123
   - **Fungsi**: Dapat mengakses dasbor utama (Global Dashboard), mengelola seluruh data tenant, melihat statistik keseluruhan aplikasi, dan memiliki kendali penuh atas sistem.

2. **Tenant Admin**
   - **Username**: tenantadmin
   - **Password**: admin123
   - **Fungsi**: Dapat mengakses halaman dashboard penyewa (tenant), mengatur konten undangan (Mempelai, Acara, Cerita Cinta, dan Hadiah), serta melihat buku tamu dan daftar RSVP untuk undangan spesifik milik mereka.

3. **Staff**
   - **Username**: staffadmin
   - **Password**: admin123
   - **Fungsi**: Berfungsi untuk membantu operasional seperti manajemen daftar tamu, konfirmasi RSVP, dan check-in tamu pada hari-H.

---

## Panduan Penggunaan Fitur

### 1. Tenant Management (Bagi Superadmin)
Halaman ini berguna untuk membuat dan mengatur penyewa (klien undangan).
- **Pembuatan Tenant**: Klik tombol **"New Tenant"**. Masukkan nama mempelai, tanggal pernikahan, slug domain (misal: romeo-juliet), tipe paket, serta username dan password admin untuk tenant tersebut. Sistem akan otomatis memvalidasi agar tidak ada `domain_slug` yang sama pada tenant yang aktif.
- **Pengaturan & Pembayaran**: Klik icon pensil (Edit) pada baris tenant untuk memperbarui data mempelai, slug, paket (Free/Pro/Premium), status akun (Active/Suspended), serta status dan tenggat pembayaran (Menunggu pembayaran / Sudah dibayar).

### 2. Invitation Content Settings (Bagi Tenant Admin)
Halaman ini adalah pusat kustomisasi untuk tampilan undangan Anda. Data sudah disesuaikan agar otomatis mengisi form (pre-fill) sesuai dengan data akun Anda. Halaman terbagi menjadi 4 bagian:
- **Mempelai & Keluarga**: Mengatur nama mempelai utama, tanggal pernikahan, serta opsional untuk menampilkan nama kedua orang tua dan akun sosial media (Instagram) mempelai.
- **Teks & Acara**: Mengatur waktu pelaksanaan akad dan resepsi. Anda juga dapat menentukan lokasi secara spesifik menggunakan integrasi **Google Maps** (klik ikon peta untuk mencari dan mematok lokasi secara akurat). Tersedia juga kustomisasi teks pembuka/penutup dan pengingat protokol.
- **Cerita Cinta**: Timeline khusus yang dapat ditambahkan tanpa batas untuk menceritakan kisah perjalanan asmara Anda (contoh: Pertemuan Pertama, Lamaran, dll).
- **Amplop Digital**: Mengelola hingga 2 informasi rekening bank untuk memfasilitasi hadiah tanpa kontak (cashless/online) bagi undangan yang berhalangan hadir.

---

## Tanya Jawab (QnA) - Pandangan Pebisnis SaaS

**Q: Apa keuntungan utama menggunakan platform ini untuk bisnis undangan digital saya?**
A: Anda dapat mengelola ratusan klien (tenant) dalam satu platform (multi-tenant architecture). Anda tinggal membuatkan akun, dan biarkan klien menyesuaikan sendiri informasi undangan mereka (self-service), yang sangat menghemat waktu operasional Anda.

**Q: Bagaimana jika ada klien yang ingin menggunakan nama link (domain slug) yang sama?**
A: Sistem telah dibekali validasi yang ketat. Selama akun tersebut berstatus 'Active', sistem tidak akan mengizinkan orang lain menggunakan `domain_slug` yang sama.

**Q: Bagaimana saya memonitor pembayaran klien?**
A: Pada halaman **Tenant Management**, terdapat indikator visual mengenai status pembayaran (Menunggu pembayaran / Sudah dibayar) beserta tenggat waktunya (Deadline), sehingga Anda dapat menagih atau menonaktifkan akun yang menunggak secara efisien.

**Q: Apakah sistem terintegrasi langsung dengan Maps untuk lokasi acara?**
A: Ya! Klien Anda tidak perlu lagi copy-paste embed code yang rumit. Mereka cukup mengklik tombol peta, mencari lokasi, dan sistem otomatis menyimpan data titik ordinat serta URL peta tersebut, sehingga undangan akan terlihat lebih profesional dan meminimalisir tamu tersasar.

**Q: Bisakah saya menjual dalam berbagai tingkatan harga?**
A: Ya, sistem mendukung `Plan Type` (Free, Pro, Premium) yang dapat Anda atur. Anda dapat memberlakukan batasan kuota tamu undangan atau fitur berdasarkan paket yang dibeli oleh klien Anda.
