1. pada halaman **Invitation Content Settings**
    - saya ingin dihalaman ini dia bisa memanipulasi data yang ada di sheet **Tenants** [bride_name, groom_name, wedding_date]
    - selain itu dia juga bisa memanipulasi data yang ada di sheet Tenants **InvitationContent** [tanggal_akad, jam_awal_akad, jam_akhir_akad, jam_awal_resepsi, jam_akhir_resepsi, flag_lokasi_akad_dan_resepsi_berbeda, akad_map, nama_lokasi_akad, keterangan_lokasi_akad, resepsi_map, nama_lokasi_resepsi, keterangan_lokasi_akad, flag_tampilkan_nama_orang_tua, nama_bapak_laki_laki, nama_ibu_laki_laki, nama_bapak_perempuan, nama_ibu_perempuan, flag_tampilkan_sosial_media_mempelai, account_media_sosial_laki_laki, account_media_sosial_perempuan, flag_pakai_timeline_kisah, timeline_kisah, tampilkan_amplop_online, nama_bank_1, nama_rekening_bank_1, nomor_rekening_bank_1, nama_bank_2, nama_rekening_bank_2, nomor_rekening_bank_2, custom_kalimat_1, custom_kalimat_2, custom_kalimat_3, custom_kalimat_4, flag_pakai_kalimat_pembuka_custom, kalimat_pembuka_undangan, flag_pakai_kalimat_penutup_custom, kalimat_penutup_undangan, link_backsound_music]
    - kelompokan inputnya dan susun dalam bentuk tab.
    - saya ingin integrasi dengan google map untuk mengisi data [akad_map, nama_lokasi_akad, keterangan_lokasi_akad, resepsi_map, nama_lokasi_resepsi, keterangan_lokasi_akad]
    buat sebuah button dengan icon map dan tooltip buka map, ketika di klik maka akan muncul modal yang disana kita bisa mencari lokasi by keyword, menggeser titik dan klik OK, ketika klik OK modal akan tertutup dan data map tersebut tersalin ke form input
    - ketika halaman **Invitation Content Settings** dibuka get data dari sheet **Tenants & InvitationContent**  dan isi form input yang ada dengan existing value yang ada di sheet tersebut
    
2. Pada halaman **Tenant management** 
saya ingin dihalaman itu dia bisa melihat daftar semua tenant dan bisa merubah data [bride_name, groom_name, wedding_date, domain_slug, plan_type, status_account, payment_deadline, status_payment]
Perlu ditambahkan validasi boleh ada domain_slug yang sama asalkan cuma 1 yang status_account nya aktif

1. saya ingin kamu membuat user manual & penjelasan atas semua fitur yang ada diprogram ini, buatkan juga akun dengan masing-masing role dengan username & password sebagai berikut
    - superadmin = [superadmin, admin123]
    - tenant_admin = [tenantadmin, admin123]
    - staf= [staffadmin, admin123]
    
    data diatas adalah data sungguhan, jadi kamu perlu menambahkannya ke google sheet
    
    didalam nya buatkan juga sebuah QnA dari sudut pandang sebagai orang yang membeli aplikasi ini untuk bisnis undangan online nya.
    outputnya dalam format file .md