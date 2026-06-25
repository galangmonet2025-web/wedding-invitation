# Variabel Dinamis — Daftar Resmi

> **Sumber kebenaran:** tab "Variabel Tema" di
> [`ThemeGuideModal.tsx`](src/features/admin/components/ThemeGuideModal.tsx).
> File ini ringkasannya. Bila ragu, buka file aslinya. **Jangan mengarang nama variabel** —
> variabel tak dikenal diganti string kosong oleh [`templateParser.ts`](src/utils/templateParser.ts).

## Cara binding (penting)

- `{{var}}` → teks/URL biasa. **Sudah ter-render di DOM sebelum JS tema jalan.** Baca teks
  rendered, BUKAN atribut `data-var` (tidak ada substitusi atribut runtime).
- `{{#if flag}} … {{else}} … {{/if}}` — truthy jika non-kosong; `"false"`/`"0"`/`""`/array
  kosong = false. Dukung `==`, `!=`, dan modulo `@index % n == r`.
- `{{#unless flag}} … {{/unless}}` — kebalikan if.
- `{{#each list}} … {{this.field}} … {{/each}}` — loop array. Metadata: `{{@index}}`,
  `{{@index_plus_1}}`, `{{@first}}`, `{{@last}}`, `{{@even}}`, `{{@odd}}`.

---

## 🖼️ Foto & Media
- `{{photo_hero_cover}}` — foto sampul hero (URL)
- `{{photo_groom_photo}}`, `{{photo_bride_photo}}` — foto mempelai pria/wanita
- `{{photo_background}}` — background undangan
- `{{photo_closing}}` — foto penutup
- `{{photo_story_photo}}` — foto kisah
- `{{#each photo_gallery}} {{this.url}} {{/each}}` — album galeri (alias: `galleries`)
- `{{link_backsound_music}}` — URL musik (TAPI host yang memutar, lihat host-contract)
- `{{link_live_streaming}}` — URL live streaming
- Variabel gambar dinamis tambahan: ada `imageTypes` (key gambar khusus per-tenant) — render `{{<imgType>}}`.

## 🤵 Data Pengantin
- `{{groom_name}}`, `{{groom_nickname}}`, `{{bride_name}}`, `{{bride_nickname}}`
- `{{religion}}`
- `{{nama_bapak_laki_laki}}`, `{{nama_ibu_laki_laki}}`, `{{nama_bapak_perempuan}}`, `{{nama_ibu_perempuan}}`
- `{{ig_laki_laki}}`, `{{ig_perempuan}}` (akun sosmed; isi tanpa `@`)

## 📅 Detail Acara
- `{{wedding_date}}` (format lokal Indonesia), `{{wedding_date_iso}}` (ISO untuk countdown JS)
- Akad: `{{tanggal_akad}}`, `{{jam_akad}}`, `{{nama_lokasi_akad}}`, `{{keterangan_lokasi_akad}}`, `{{akad_map}}`
- Resepsi: `{{tanggal_resepsi}}`, `{{jam_resepsi}}`, `{{nama_lokasi_resepsi}}`, `{{keterangan_lokasi_resepsi}}`, `{{resepsi_map}}`

## ⏱️ Countdown (live, di-update host)
- `{{countdown_hari}}`, `{{countdown_jam}}`, `{{countdown_menit}}`, `{{countdown_detik}}`
- Host meng-update otomatis elemen ber-ID: `#tm-countdown-days/hours/minutes/seconds`
  (di-auto-wrap). Boleh juga JS sendiri pakai `{{wedding_date_iso}}`.

## 🎁 Amplop & Kado
- `{{#if tampilkan_amplop_online}}` — section amplop aktif
- `{{bank_1}}`, `{{rek_1}}`, `{{nama_rek_1}}`
- `{{#if flag_pakai_2_rekening}}` → `{{bank_2}}`, `{{rek_2}}`, `{{nama_rek_2}}`
- `{{#if flag_pakai_qris_rekening_1}}` → `{{gambar_qris_rekening_1}}` (idem `_2`)
- `{{#if flag_kirim_hadiah_offline}}` → `{{nama_lokasi_kirim_hadiah_offline}}`, `{{alamat_lokasi_kirim_hadiah_offline}}`, `{{map_kirim_hadiah_offline}}`

## 📝 Teks Kustom
- `{{kalimat_pembuka}}`, `{{kalimat_penutup}}`
- `{{custom_kalimat_1}}` … `{{custom_kalimat_4}}`
- `{{quote}}` (alias `quote_1`) + `{{quote_by}}` (alias `quote_by_1}}`); `{{quote_1}}`…`{{quote_7}}` + `{{quote_by_1}}`…`{{quote_by_7}}`

## 👥 Tamu & RSVP
- `{{guest_name}}` / `{{nama_tamu}}` (alias), `{{kode_undangan}}`
- Boolean tamu: `{{#if is_sudah_isi_konfirmasi_kehadiran}}`, `{{#if is_sudah_isi_ucapan}}`,
  `{{#if is_sudah_kirim_hadiah}}`, `{{#if flag_konfirmasi_kehadiran_dari_tamu}}`,
  `{{#if is_link_umum_and_not_for_spesific_guest}}`
- Ucapan: `{{#each wishes}} {{this.guest_name}} {{this.guest_message}} {{this.guest_comment_time}} {{this.guest_initial}} {{/each}}`

## 🔄 Flag Fitur & Loop
- `{{#if flag_pakai_timeline_kisah}}` + `{{#each timeline_kisah}} {{this.tanggal}} {{this.judul}} {{this.deskripsi}} {{/each}}`
- `{{#if has_gallery}}` / `{{#if is_fitur_gallery}}` + `{{#each galleries}} {{this.url}} {{/each}}`
- `{{#if flag_lokasi_akad_dan_resepsi_berbeda}}`
- `{{#if flag_tampilkan_nama_orang_tua}}`, `{{#if flag_tampilkan_sosial_media_mempelai}}`
- `{{#if is_fitur_live_streaming}}`

## 📸 Balasan Instagram (additional feature)
- `{{#if flag_pakai_additional_feature_story_balasan_instagram}}`
- `{{frame_balasan_instagram}}` (PNG frame), `{{link_balasan_instagram}}`
- `{{sample_story_1}}`, `{{sample_story_2}}`, `{{sample_story_3}}`

## 🌐 Branding Website
- `{{site_name}}`, `{{site_url}}`, `{{site_logo}}`, `{{tagline}}`, `{{site_description}}`
- Sosmed webconfig: `{{#if flag_use_tiktok_webconfig}}`/`{{url_tiktok_webconfig}}` (idem youtube/instagram/whatsapp)
