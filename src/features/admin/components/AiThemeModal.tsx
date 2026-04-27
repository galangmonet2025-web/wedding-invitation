import React, { useState, useCallback } from 'react';
import { Modal } from '@/shared/components/Modal';

interface AiThemeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTriggerUpload: () => void;
}

const SUPER_PROMPT = `Buatkan saya kode untuk sebuah website SPA (Single Page Application) Undangan Pernikahan yang interaktif, modern, dan elegan.

Output HANYA boleh berupa 3 file terpisah: index.html, style.css, dan script.js. Tidak perlu penjelasan panjang, langsung berikan kodenya.

### ATURAN INTEGRASI DATA (SANGAT PENTING - BACA BAIK-BAIK)
Website ini akan dikonversi ke sistem Handlebars otomatis milik saya. KAMU WAJIB menggunakan data dummy yang indah agar saya bisa preview desainnya, TAPI kamu WAJIB menambahkan atribut data-var, data-img, data-bg, data-loop, data-if, atau data-menu-label secara ketat sesuai daftar di bawah ini.

1. TEKS BIASA (Gunakan data-var="..." pada elemen HTML):
   - Cover & Intro: data-var="guest_name" (Nama Tamu), data-var="kalimat_pembuka", data-var="quote"
   - Nama Mempelai: data-var="groom_name", data-var="bride_name"
   - Orang Tua Pria: data-var="nama_bapak_laki_laki", data-var="nama_ibu_laki_laki"
   - Orang Tua Wanita: data-var="nama_bapak_perempuan", data-var="nama_ibu_perempuan"
   - Sosial Media (Instagram): data-var="ig_laki_laki", data-var="ig_perempuan"
   - Akad Nikah: data-var="tanggal_akad", data-var="jam_akad", data-var="nama_lokasi_akad", data-var="keterangan_lokasi_akad", data-var="akad_map" (taruh di href tombol maps)
   - Resepsi: data-var="tanggal_resepsi", data-var="jam_resepsi", data-var="nama_lokasi_resepsi", data-var="keterangan_lokasi_resepsi", data-var="resepsi_map" (taruh di href tombol maps)
   - Countdown (pada masing-masing angka): data-var="countdown_hari", data-var="countdown_jam", data-var="countdown_menit", data-var="countdown_detik"
   - Rekening 1: data-var="bank_1", data-var="rek_1", data-var="nama_rek_1"
   - Rekening 2: data-var="bank_2", data-var="rek_2", data-var="nama_rek_2"
   - Kirim Kado Offline: data-var="nama_lokasi_kirim_hadiah_offline", data-var="alamat_lokasi_kirim_hadiah_offline", data-var="map_kirim_hadiah_offline" (taruh di href tombol maps)
   - Penutup: data-var="kalimat_penutup"

2. GAMBAR & BACKGROUND (Gunakan data-img="..." untuk <img>, dan data-bg="..." untuk background-image inline HTML):
   - Background Utama: data-bg="photo_background", data-bg="photo_hero_cover", data-bg="photo_closing"
   - Foto Pria & Wanita: data-img="photo_groom_photo", data-img="photo_bride_photo"
   - Foto Tambahan: data-img="photo_story_photo"
   - Gambar QRIS: data-img="gambar_qris_rekening_1", data-img="gambar_qris_rekening_2"

3. KONDISIONAL / FITUR OPSIONAL (Gunakan data-if="..." pada elemen pembungkus / wrapper-nya):
   - Tampilkan Nama Orang Tua: data-if="flag_tampilkan_nama_orang_tua"
   - Tampilkan Sosial Media: data-if="flag_tampilkan_sosial_media_mempelai"
   - Section Kisah Cinta: data-if="flag_pakai_timeline_kisah"
   - Section Galeri: data-if="is_fitur_gallery"
   - Section Live Streaming Utama: data-if="is_fitur_live_streaming"
     *(Untuk link live streaming gunakan: data-var="link_live_streaming" di href tombolnya)*
   - SECTION GIFT / ANGPAO UTAMA: data-if="tampilkan_amplop_online"
   - Wrapper Rekening ke-2 (jika ada): data-if="flag_pakai_2_rekening"
   - Wrapper QRIS Rekening 1 (jika ada): data-if="flag_pakai_qris_rekening_1"
   - Wrapper QRIS Rekening 2 (jika ada): data-if="flag_pakai_qris_rekening_2"
   - Wrapper Kirim Kado Offline: data-if="flag_kirim_hadiah_offline"

4. LOOPING DATA (ATURAN KHUSUS):
   Gunakan data-loop="..." HANYA di container parent. Lalu, di elemen ITEM/CARD PERTAMA di dalamnya, kamu WAJIB meletakkan variabel dengan prefix this.. *(Element ke-2 dst buat statis biasa)*
   
   A. Gallery Foto:
   - Parent: data-loop="galleries"
   - Gambar anak pertama: data-img="this.url" (WAJIB tambahkan class="lightbox-injection")
   
   B. Kisah Cinta (Timeline):
   - Parent: data-loop="timeline_kisah"
   - Teks anak pertama: data-var="this.tanggal", data-var="this.judul", data-var="this.deskripsi"
   
   C. Ucapan & Doa (Wishes):
   - Parent: data-loop="wishes"
   - Teks anak pertama: data-var="this.guest_initial", data-var="this.name", data-var="this.guest_comment_time", data-var="this.message"

5. NAVIGASI & MENU (PENTING):
    Untuk mengaktifkan fitur navigasi, tambahkan attribut data-menu-label="Nama Menu" pada section-section ini
    - section Mempelai ->  data-menu-label="Mempelai"
    - section Waktu & tempat -> data-menu-label="Waktu & tempat"
    - section Streaming -> data-menu-label="Streaming"
    - section Doa & Ucapan -> data-menu-label="Doa & Ucapan"
    - section Wedding gifts -> data-menu-label="Wedding gifts"
    - section gift -> data-menu-label="Wedding gifts"

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
   - Lightbox Gallery: Setiap tag <img> di dalam galeri WAJIB memiliki class="lightbox-injection" agar bisa diklik.

Semua ID ini harus akurat. Gunakan desain terbaikmu yang paling premium dan mewah. Pastikan bagian Gift benar-benar mematuhi seluruh data-if yang saya berikan.`;

export function AiThemeModal({ isOpen, onClose, onTriggerUpload }: AiThemeModalProps) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(SUPER_PROMPT).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(() => {
            // Fallback
            const el = document.createElement('textarea');
            el.value = SUPER_PROMPT;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    }, []);

    const handleUploadClick = () => {
        onClose();
        onTriggerUpload();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="✨ Buat Tema dengan AI"
            size="xl"
        >
            <div className="flex flex-col gap-4 text-sm text-gray-700 dark:text-gray-300 h-[65vh] min-h-[400px]">

                <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-lg shrink-0">
                    <h3 className="text-base font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                        🚀 Cara Kerja Auto-Convert AI
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2 text-blue-900 dark:text-blue-200">
                        <li>Salin <strong>Prompt theme builder</strong> di bawah ini.</li>
                        <li>Buka AI favorit Anda (Claude 3.5 Sonnet sangat disarankan, atau ChatGPT Plus).</li>
                        <li>Tempelkan prompt tersebut dan minta AI membuatkan tema undangan.</li>
                        <li>Unduh 3 file hasilnya (<code className="bg-white/50 px-1 rounded">index.html</code>, <code className="bg-white/50 px-1 rounded">style.css</code>, <code className="bg-white/50 px-1 rounded">script.js</code>).</li>
                        <li>Klik tombol <strong>Pilih & Unggah File</strong> di bawah ini, lalu sorot (block) ketiga file tersebut secara bersamaan.</li>
                        <li>Sistem kami akan otomatis mengonversi tag dari AI menjadi sistem <em>Handlebars</em> yang siap pakai!</li>
                    </ol>
                </section>

                <section className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            📝 Prompt theme builder
                        </h3>
                        <button
                            onClick={handleCopy}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${isCopied ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gold-100 text-gold-700 hover:bg-gold-200 border-gold-200'} border`}
                        >
                            {isCopied ? (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    Berhasil Disalin!
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    Salin Prompt
                                </>
                            )}
                        </button>
                    </div>
                    <div className="relative group flex-1 min-h-0">
                        <textarea
                            readOnly
                            value={SUPER_PROMPT}
                            className="w-full h-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-mono text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gold-500 resize-none custom-scrollbar"
                            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        />
                    </div>
                </section>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center mt-2">
                <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                    Tutup
                </button>
                <button
                    onClick={handleUploadClick}
                    className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 text-white text-sm font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Pilih & Unggah File
                </button>
            </div>
        </Modal>
    );
}
