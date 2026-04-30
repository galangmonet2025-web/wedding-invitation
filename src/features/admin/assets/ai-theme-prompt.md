Buatkan saya kode untuk sebuah website SPA (Single Page Application) Undangan Pernikahan yang interaktif, tekankan animasi dan efek visual yang interaktif

Output HANYA boleh berupa 3 file terpisah: index.html, style.css, dan script.js. Tidak perlu penjelasan panjang, langsung berikan kodenya.

### ATURAN INTEGRASI DATA (SANGAT PENTING - BACA BAIK-BAIK)
Website ini akan dikonversi ke sistem Handlebars otomatis milik saya. KAMU WAJIB menggunakan data dummy yang indah agar saya bisa preview desainnya, TAPI kamu WAJIB menambahkan atribut data-var, data-img, data-bg, data-loop, data-if, data-menu-label, atau data-is-sudah secara ketat sesuai daftar di bawah ini.

1. TEKS BIASA (Gunakan data-var="..." pada elemen HTML):
   - Cover & Intro: data-var="guest_name" (Nama Tamu), data-var="nama_tamu" (Alias Nama Tamu), data-var="kode_undangan", data-var="kalimat_pembuka", data-var="quote"
   - Nama Mempelai: data-var="groom_name", data-var="bride_name"
   - Orang Tua Pria: data-var="nama_bapak_laki_laki", data-var="nama_ibu_laki_laki"
   - Orang Tua Wanita: data-var="nama_bapak_perempuan", data-var="nama_ibu_perempuan"
   - Sosial Media (Instagram): data-var="ig_laki_laki", data-var="ig_perempuan"
   - Akad Nikah: data-var="tanggal_akad", data-var="jam_akad", data-var="nama_lokasi_akad", data-var="keterangan_lokasi_akad", data-var="akad_map" (taruh di href tombol maps)
   - Resepsi: data-var="wedding_date" (Tgl Resepsi Format Lokal), data-var="tanggal_resepsi", data-var="jam_resepsi", data-var="nama_lokasi_resepsi", data-var="keterangan_lokasi_resepsi", data-var="resepsi_map" (taruh di href tombol maps)
   - Countdown (pada masing-masing angka): data-var="countdown_hari", data-var="countdown_jam", data-var="countdown_menit", data-var="countdown_detik"
   - Rekening 1: data-var="bank_1", data-var="rek_1", data-var="nama_rek_1"
   - Rekening 2: data-var="bank_2", data-var="rek_2", data-var="nama_rek_2"
   - Kirim Kado Offline: data-var="nama_lokasi_kirim_hadiah_offline", data-var="alamat_lokasi_kirim_hadiah_offline", data-var="map_kirim_hadiah_offline" (taruh di href tombol maps)
   - Penutup: data-var="kalimat_penutup"
   - Teks Kustom: data-var="custom_kalimat_1", data-var="custom_kalimat_2", data-var="custom_kalimat_3", data-var="custom_kalimat_4"
   - Branding: data-var="site_name" (Nama Website), data-var="site_url" (URL), data-var="tagline", data-var="site_description"

2. GAMBAR & BACKGROUND (Gunakan data-img="..." untuk <img>, dan data-bg="..." untuk background-image inline HTML):
   - Background Utama: data-bg="photo_background", data-bg="photo_hero_cover", data-bg="photo_closing"
   - background story (optional): data-bg="photo_story_photo"
   - Foto Pria & Wanita: data-img="photo_groom_photo", data-img="photo_bride_photo"
   - Branding Logo: data-img="site_logo"
   - Foto Tambahan: data-img="photo_story_photo"
   - Gambar QRIS: data-img="gambar_qris_rekening_1", data-img="gambar_qris_rekening_2"

3. KONDISIONAL / FITUR OPSIONAL (Gunakan data-if="..." pada elemen pembungkus / wrapper-nya):
   - Tampilkan Nama Orang Tua: data-if="flag_tampilkan_nama_orang_tua"
   - Tampilkan Sosial Media: data-if="flag_tampilkan_sosial_media_mempelai"
   - Section Kisah Cinta: data-if="flag_pakai_timeline_kisah"
   - Section Galeri: data-if="is_fitur_gallery"
   - Minimal 1 Foto Galeri: data-if="has_gallery"
   - Lokasi Akad & Resepsi Berbeda: data-if="flag_lokasi_akad_dan_resepsi_berbeda"
   - Section Live Streaming Utama: data-if="is_fitur_live_streaming"
     *(Untuk link live streaming gunakan: data-var="link_live_streaming" di href tombolnya)*
   - SECTION GIFT / ANGPAO UTAMA: data-if="tampilkan_amplop_online"
   - Wrapper Rekening ke-2 (jika ada): data-if="flag_pakai_2_rekening"
   - Wrapper QRIS Rekening 1 (jika ada): data-if="flag_pakai_qris_rekening_1"
   - Wrapper QRIS Rekening 2 (jika ada): data-if="flag_pakai_qris_rekening_2"
   - Wrapper Kirim Kado Offline: data-if="flag_kirim_hadiah_offline"
   - Status Tamu RSVP: data-if="is_sudah_isi_konfirmasi_kehadiran"
   - Status Tamu Ucapan: data-if="is_sudah_isi_ucapan"
   - Status Tamu Kado: data-if="is_sudah_kirim_hadiah"
   - Status WhatsApp: data-if="flag_sudah_kirim_undangan_via_whatsapp"
   - Konfirmasi Kehadiran (Hadir): data-if="flag_konfirmasi_kehadiran_dari_tamu"
   - Bukan Link Tamu Spesifik: data-if="is_link_umum_and_not_for_spesific_guest"

4. NEGASI & IF-ELSE (PENTING):
   - Jika ingin kondisi "JIKA TIDAK", gunakan: data-unless="nama_variabel"
   - Jika ingin kondisi "IF-ELSE", gunakan elemen berurutan:
     <div data-if="kondisi">Konten A</div>
     <div data-else>Konten B (else)</div>

5. LOOPING DATA (ATURAN KHUSUS):
   Gunakan data-loop="..." HANYA di container parent. Lalu, di elemen ITEM/CARD PERTAMA di dalamnya, kamu WAJIB meletakkan variabel dengan prefix this.. *(Element ke-2 dst buat statis biasa)*
   
   A. Gallery Foto:
   - Parent: data-loop="galleries"
   - Gambar anak pertama: data-img="this.url" (WAJIB tambahkan class="lightbox-injection")
   
   B. Kisah Cinta (Timeline):
   - Parent: data-loop="timeline_kisah"
   - Teks anak pertama: data-var="this.tanggal", data-var="this.judul", data-var="this.deskripsi"
   
   C. Ucapan & Doa (Wishes):
   - Parent: data-loop="wishes"
   - Teks anak pertama: data-var="this.guest_initial", data-var="this.guest_name", data-var="this.guest_comment_time", data-var="this.guest_message"

6. KONDISI STATUS TAMU (Gunakan data-if="..." untuk menyembunyikan form jika sudah mengisi):
   - Tamu sudah isi ucapan: data-if="is_sudah_isi_ucapan"
   - Tamu sudah kirim hadiah: data-if="is_sudah_kirim_hadiah"
   - Tamu sudah konfirmasi kehadiran: data-if="is_sudah_isi_konfirmasi_kehadiran"
   - Gunakan untuk menampilkan pesan terima kasih atas konfirmasi hadir/tidak haadir: data-if="flag_konfirmasi_kehadiran_dari_tamu"

7. NAVIGASI & MENU (PENTING):
   Untuk mengaktifkan fitur navigasi, tambahkan attribut data-menu-label="Nama Menu" pada section-section ini
   - section Mempelai ->  data-menu-label="Mempelai"
   - section Waktu & tempat -> data-menu-label="Waktu & tempat"
   - section Streaming -> data-menu-label="Streaming"
   - section Doa & Ucapan -> data-menu-label="Doa & Ucapan"
   - section Wedding gifts -> data-menu-label="Wedding gifts"

### ATURAN TEKNIS & UI/UX
1. Layout Khusus Mobile: Container utama MAKSIMAL selebar 480px, posisikan di tengah layar (margin: 0 auto; box-shadow).
2. Animasi Interaktif: Berikan efek (fade-in, slide-up) saat di-scroll ke suatu section.
3. Struktur ID & Class yang Wajib Ada Persis:
   - Tombol Buka Undangan: id="btn-open-invitation"
   - Halaman Cover: id="theme-cover"
   - Halaman Utama (awalnya hidden): id="main-content"
   - Container Tombol Melayang (FAB): id="theme-fab-container"
   - Tombol Menu Navigasi: id="btn-show-menu"
   - Tombol Musik (Play/Pause): id="btn-toggle-music" (Di dalamnya wajib ada tag <i> untuk icon)
   - Tombol QR Code Tamu: id="btn-show-qr"
   - Form RSVP: id="rsvp-code", id="rsvp-status", id="rsvp-guests"
   - Tombol Submit RSVP: id="btn-submit-kehadiran"
   - Alert RSVP: id="alert-submit-kehadiran"
   - Form Ucapan: id="wish-name", id="wish-message"
   - Tombol Submit Ucapan: id="btn-submit-ucapan"
   - Alert Ucapan: id="alert-submit-ucapan"
   - Form Konfirmasi Hadiah: id="gift-name", id="gift-amount", id="gift-bank"
   - Tombol Submit Hadiah: id="btn-submit-hadiah"
   - Alert Hadiah: id="alert-submit-hadiah"
   - Lightbox Gallery: Setiap tag <img> di dalam galeri WAJIB memiliki class="lightbox-injection" agar bisa diklik.
4. Semua ID ini harus akurat.
5. Mekanisme pada saat tamu sudah mengisi data konfirmasi kehadiran dan ucapan:
   - hide input form konfirmasi kehadiran dan ucapan
   - switch tampilan dari form konfirmasi kehadiran & ucapan menjadi semacam ucapan terima kasih atas kehadiran/ tidak hadir nya, dan terima kasih atas doa / ucapan yang sudah di berikan
   - kondisi switch tampilan ini menggunakan dynamic variabel sebagai berikut:
     - is_sudah_isi_konfirmasi_kehadiran → untuk form konfirmasi kehadiran
     - is_sudah_isi_ucapan_dan_doa → untuk form ucapan & doa
   - Value dynamic variabel:
     - nilai default variabel "is_sudah_isi_konfirmasi_kehadiran" adalah false, dan bernilai true jika tamu sudah mengisi form kehadiran
     - nilai default variabel "is_sudah_isi_ucapan_dan_doa" adalah false, dan bernilai true jika tamu sudah mengisi form ucapan & doa
6. Pada data nomor rekening tambahkan fungsi salin, jika di klik maka akan muncul toast cantik yang menampilkan tulisan nomor rekening sudah di salin dan nomor rekening akan tersalin ke clipboard.
7. Cari referensi design website undangan yang ada di indonesia sebagai inspirasi design website undangan ini.


### STRUKRUR WEBSITE
- Cover page
berisikan kata2 kpd yth nama tamu  yang di undang, dan button buka undangan, buka QC code
- Section 1
Hero page (nama, tanggal, quotes, background gambar hero)
- Section 2
perkenalan pasangan (nama, nama orang tua, akun sosmed)
- section 3
count down, input form konfirmasi kehadiran
- Section 4
waktu & tempat untuk akad & resepsi
- section 5
Section untuk live streaming
- Section 6
Timeline kisah
- Section 7
gallery foto
- Section 8
Form input ucapan & list ucapan di bawahnya, data ucapan dari tamu undangan bisa sangat bayak, jika lebih dari 8 ucapan maka selebihnya bisa diakses via scroll kotak ucapannya
- Section 9
amplop online, berisikan no rekening / qris & alamat tempat untuk pengiriman kado
- Section 10
Kata penutup bisa berisi informasi undangan by website ini
