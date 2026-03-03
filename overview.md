# 🌟 Ringkasan Fitur Aplikasi (Overview)

Aplikasi **Wedding SaaS Platform** ini adalah solusi lengkap dan terpadu untuk membuat, mengelola, dan membagikan undangan pernikahan digital. Aplikasi ini dirancang dengan sistem **Multi-Tenant**, yang berarti satu platform (satu deployment) dapat menampung dan mengelola banyak event pernikahan (penyewa/tenant) secara bersamaan, dengan privasi dan keamanan data yang terisolasi.

Berikut adalah penjelasan detail mengenai fitur-fitur utama yang tersedia:

---

## 👥 1. Sistem Manajemen Multi-Tenant & Otentikasi
Sistem ini memisahkan hak akses menjadi tiga peran utama (Role-Based Access Control):
- **Superadmin**: Memiliki akses penuh ke seluruh sistem. Dapat melihat statistik global, metrik pendapatan, serta membuat, mengedit, menangguhkan (suspend), dan mengaktifkan kembali tenant (klien pernikahan).
- **Tenant Admin (Klien)**: Memiliki akses eksklusif hanya pada data pernikahan mereka sendiri. Mereka dapat mengelola tamu, melihat ucapan, memantau hadiah, dan mengedit detail undangan.
- **Staff (Penerima Tamu)**: Dikhususkan untuk hari H acara. Hanya memiliki akses untuk melakukan scan QR code tamu atau melakukan proses *check-in* manual.

## 💌 2. Kustomisasi Undangan Digital
Penyewa (Tenant) dapat mengatur sendiri isi dari undangan digital mereka secara fleksibel melalui halaman pengaturan:
- **Biodata Mempelai & Keluarga**: Nama mempelai, nama orang tua, serta akun sosial media (Instagram).
- **Jadwal Acara Dinamis**: Pengaturan waktu (jam awal & akhir), tanggal, serta lokasi untuk sesi **Akad** dan **Resepsi** (bisa dipisah atau digabung).
- **Penyesuaian Teks**: Dukungan untuk merubah kalimat pembuka undangan (contoh: *Bismillahirrahmanirrahim* atau penyesuaian untuk agama lain), serta kalimat-kalimat pengantar lainnya sesuai selera.
- **Kisah Cinta (Love Story)**: Fitur *timeline* interaktif yang memungkinkan mempelai menceritakan perjalanan cinta mereka (bisa dinonaktifkan jika tidak diperlukan).
- **Peta Lokasi**: Integrasi tautan Google Maps untuk memudahkan tamu mereview rute menuju lokasi acara.

## 📖 3. Manajemen Tamu (Guest Management)
Aplikasi memfasilitasi kebutuhan administrasi tamu dari sebelum hingga sesaat di hari H:
- **CRUD Tamu**: Tambah, edit, dan hapus data tamu (nama, nomor telepon, kategori relasi, jumlah *pax*/rombongan).
- **Kode Undangan Unik & QR Code**: Setiap tamu otomatis mendapatkan *invitation code* unik dan QR Code untuk keamanan dan validasi.
- **Import/Export Data**: Tambah tamu sekaligus banyak via file CSV, atau ekspor data tamu ke CSV untuk pelaporan.
- **Check-in System**: Validasi kehadiran tamu saat hari H secara real-time untuk mencegah penyusup dan mendata total kehadiran secara presisi.

## 💬 4. Buku Tamu (Wishes) & Amplop Digital (Gifts)
- **RSVP & Ucapan Kehadiran**: Tamu yang diundang dapat mengonfirmasi kehadiran serta menuliskan permohonan doa/ucapan. Ucapan ini akan tampil di bagian buku tamu dalam susunan antarmuka yang elegan.
- **Amplop Digital (Cashless)**: Menyediakan alternatif pemberian hadiah (amplop) secara online. Tenant dapat memasukkan lebih dari satu rekening bank (misal: BCA, Mandiri, DANA). *Dashboard* akan memiliki tab khusus "Gifts" yang merangkum catatan transfer masuk dari tamu dengan fitur kalkulasi total nominal donasi/hadiah secara otomatis.

## 📊 5. Dashboard Analitik
Menyajikan visualisasi data yang mempermudah pemantauan:
- **Metrik Utama (Stat Cards)**: Menampilkan total tamu diundang, tamu hadir, jumlah ucapan masuk, dan pendapatan amplop digital sementara.
- **Grafik Interaktif (Recharts)**: Menampilkan Status RSVP dalam bentuk *Pie Chart* dan Grafik Tren Kehadiran Tamu dalam format *Area Chart*.

## ⏱️ 6. Sistem Log Aktivitas (Activity Logging)
Untuk transparansi pengguna, setiap aksi krusial yang dilakukan dalam *dashboard* (seperti penghapusan tamu, perubahan pengaturan undangan, check-in, dll) akan dicatat permanen di dalam sistem lengkap dengan informasi: Siapa (User), Kapan (Waktu), dan Apa (Deskripsi Aksinya).

## 🚀 7. Teknologi dan Kinerja
Secara teknis, platform ini didukung oleh:
- **Tampilan Premium**: Menggunakan React & Tailwind CSS untuk menciptakan desain yang responsif, *glassmorphism*, fitur *dark mode*, serta animasi interaktif.
- **Keamanan Ketat**: Passwords tidak disimpan mentah melainkan di-hash dengan **SHA-256**. Data dipertukarkan menggunakan sistem token lokal (JWT-like) dengan validasi role yang berjalan ketat di backend server via **Google Apps Script**. Memastikan tidak ada perembesan data (*data leakage*) antar tenant.
