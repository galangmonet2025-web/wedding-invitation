import { Modal } from '@/shared/components/Modal';
import { useState, useCallback } from 'react';
import { Tenant } from '@/types';

interface ThemeGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    previewTenant?: Tenant | null;
    imageTypes?: string[];
    activeTab: 'guide' | 'variables' | 'logic';
    onTabChange: (tab: 'guide' | 'variables' | 'logic') => void;
}

export function ThemeGuideModal({ isOpen, onClose, previewTenant, imageTypes = [], activeTab, onTabChange }: ThemeGuideModalProps) {
    const [copiedTag, setCopiedTag] = useState<string | null>(null);

    const copyToClipboard = useCallback((tag: string) => {
        navigator.clipboard.writeText(tag).then(() => {
            setCopiedTag(tag);
            setTimeout(() => setCopiedTag(null), 1500);
        }).catch(() => {
            // Fallback for browsers without clipboard API
            const el = document.createElement('textarea');
            el.value = tag;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopiedTag(tag);
            setTimeout(() => setCopiedTag(null), 1500);
        });
    }, []);

    const t = previewTenant || {
        bride_name: 'Fiona',
        groom_name: 'Galang',
        wedding_date: new Date().toISOString()
    } as any;

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const imageVariables = imageTypes.map(imgType => ({
        tag: `{{${imgType}}}`,
        desc: `(Dinamis) URL Gambar: ${imgType}`,
        value: 'https://images.unsplash... (dummy)',
        type: 'URL String',
        code: `<img src="{{${imgType}}}" alt="${imgType}" />`
    }));

    const variables = [
        ...imageVariables,
        // === Variabel Foto Standar ===
        { tag: '{{photo_hero_cover}}', desc: 'URL Foto Sampul Utama', value: 'https://cdn...(auto)', type: 'URL String', code: '<img src="{{photo_hero_cover}}" alt="Hero Cover" />' },
        { tag: '{{photo_groom_photo}}', desc: 'URL Foto Pengantin Pria', value: 'https://cdn...(auto)', type: 'URL String', code: '<img src="{{photo_groom_photo}}" alt="Groom" />' },
        { tag: '{{photo_bride_photo}}', desc: 'URL Foto Pengantin Wanita', value: 'https://cdn...(auto)', type: 'URL String', code: '<img src="{{photo_bride_photo}}" alt="Bride" />' },
        { tag: '{{photo_background}}', desc: 'URL Foto Background Undangan', value: 'https://cdn...(auto)', type: 'URL String', code: '<div style="background-image: url({{photo_background}})"></div>' },
        { tag: '{{photo_closing}}', desc: 'URL Foto Closing / Penutup', value: 'https://cdn...(auto)', type: 'URL String', code: '<img src="{{photo_closing}}" alt="Closing" />' },
        { tag: '{{photo_story_photo}}', desc: 'URL Foto Kisah Cinta', value: 'https://cdn...(auto)', type: 'URL String', code: '<img src="{{photo_story_photo}}" alt="Story" />' },
        { tag: '{{#each photo_gallery}}', desc: 'Loop Foto Album Galeri', value: '(Block Logic)', type: 'Looping Logic', code: '{{#each photo_gallery}}\n  <img src="{{this.url}}" alt="Gallery">\n{{/each}}' },
        // === Variabel Data Umum ===
        { tag: '{{bride_name}}', desc: 'Nama Wanita', value: t.bride_name, type: 'String', code: '<h1>{{bride_name}}</h1>' },
        { tag: '{{groom_name}}', desc: 'Nama Pria', value: t.groom_name, type: 'String', code: '<h1>{{groom_name}}</h1>' },
        { tag: '{{wedding_date}}', desc: 'Tgl Resepsi (Format Lokal)', value: formatDate(t.wedding_date), type: 'String', code: '<span>{{wedding_date}}</span>' },
        { tag: '{{tanggal_akad}}', desc: 'Tgl Akad', value: formatDate(t.wedding_date), type: 'String', code: '<span>{{tanggal_akad}}</span>' },
        { tag: '{{jam_akad}}', desc: 'Jam Akad', value: '08:00 - Selesai', type: 'String', code: '<span>{{jam_akad}}</span>' },
        { tag: '{{jam_resepsi}}', desc: 'Jam Resepsi', value: '11:00 - Selesai', type: 'String', code: '<span>{{jam_resepsi}}</span>' },
        { tag: '{{nama_lokasi_akad}}', desc: 'Nama Lokasi Akad', value: 'Masjid Agung', type: 'String', code: '<span>{{nama_lokasi_akad}}</span>' },
        { tag: '{{keterangan_lokasi_akad}}', desc: 'Keterangan Lokasi Akad', value: 'Jl. Merdeka No. 1', type: 'String', code: '<p>{{keterangan_lokasi_akad}}</p>' },
        { tag: '{{akad_map}}', desc: 'URL Google Maps Akad', value: 'https://maps.google.com/...', type: 'URL String', code: '<a href="{{akad_map}}">Buka Peta</a>' },
        { tag: '{{nama_lokasi_resepsi}}', desc: 'Nama Lokasi Resepsi', value: 'Gedung Serbaguna', type: 'String', code: '<span>{{nama_lokasi_resepsi}}</span>' },
        { tag: '{{keterangan_lokasi_resepsi}}', desc: 'Keterangan Lokasi Resepsi', value: 'Jl. Sudirman No. 2', type: 'String', code: '<p>{{keterangan_lokasi_resepsi}}</p>' },
        { tag: '{{resepsi_map}}', desc: 'URL Google Maps Resepsi', value: 'https://maps.google.com/...', type: 'URL String', code: '<a href="{{resepsi_map}}">Buka Peta</a>' },
        { tag: '{{nama_bapak_laki_laki}}', desc: 'Nama Ayah Mempelai Pria', value: 'Bpk. Ahmad', type: 'String', code: '<span>{{nama_bapak_laki_laki}}</span>' },
        { tag: '{{nama_ibu_laki_laki}}', desc: 'Nama Ibu Mempelai Pria', value: 'Ibu Siti', type: 'String', code: '<span>{{nama_ibu_laki_laki}}</span>' },
        { tag: '{{nama_bapak_perempuan}}', desc: 'Nama Ayah Mempelai Wanita', value: 'Bpk. Budi', type: 'String', code: '<span>{{nama_bapak_perempuan}}</span>' },
        { tag: '{{nama_ibu_perempuan}}', desc: 'Nama Ibu Mempelai Wanita', value: 'Ibu Ani', type: 'String', code: '<span>{{nama_ibu_perempuan}}</span>' },
        { tag: '{{ig_laki_laki}}', desc: 'Akun Sosmed Pria', value: '@ahmad_groom', type: 'String', code: '<span>{{ig_laki_laki}}</span>' },
        { tag: '{{ig_perempuan}}', desc: 'Akun Sosmed Wanita', value: '@ani_bride', type: 'String', code: '<span>{{ig_perempuan}}</span>' },
        { tag: '{{guest_name}}', desc: 'Nama Tamu Undangan', value: 'Bpk. Ridwan (Contoh)', type: 'String', code: '<span>Kepada Yth. {{guest_name}}</span>' },
        { tag: '{{nama_tamu}}', desc: 'Alias Nama Tamu Undangan', value: 'Bpk. Ridwan (Contoh)', type: 'String', code: '<span>Kepada Yth. {{nama_tamu}}</span>' },
        { tag: '{{kode_undangan}}', desc: 'Kode Unik Undangan Tamu', value: 'GUEST-001', type: 'String', code: '<p>Kode: {{kode_undangan}}</p>' },
        { tag: '{{is_sudah_isi_konfirmasi_kehadiran}}', desc: 'Boolean: True jika tamu sudah konfirmasi RSVP', value: 'false', type: 'Boolean Logic', code: '{{#if is_sudah_isi_konfirmasi_kehadiran}}\n  <p>Terima kasih sudah konfirmasi!</p>\n{{/if}}' },
        { tag: '{{flag_konfirmasi_kehadiran_dari_tamu}}', desc: 'Boolean: True jika tamu konfirmasi HADIR', value: 'true', type: 'Boolean Logic', code: '{{#if flag_konfirmasi_kehadiran_dari_tamu}}\n  <p>Kami tunggu kehadiran Anda!</p>\n{{/if}}' },
        { tag: '{{#if is_link_umum_and_not_for_spesific_guest}}', desc: 'Block Kondisi Link Umum (Bukan tamu spesifik)', value: '(Block Logic)', type: 'Boolean Logic', code: '{{#if is_link_umum_and_not_for_spesific_guest}}\n  <!-- Tampilkan input nama tamu / RSVP umum -->\n{{/if}}' },
        { tag: '{{kalimat_pembuka}}', desc: 'Kalimat Pembuka', value: 'Dengan memohon rahmat...', type: 'String', code: '<p>{{kalimat_pembuka}}</p>' },
        { tag: '{{kalimat_penutup}}', desc: 'Kalimat Penutup', value: 'Merupakan suatu kehormatan...', type: 'String', code: '<p>{{kalimat_penutup}}</p>' },
        { tag: '{{custom_kalimat_1}}', desc: 'Teks Kustom 1', value: 'Teks Tambahan 1', type: 'String', code: '<p>{{custom_kalimat_1}}</p>' },
        { tag: '{{custom_kalimat_2}}', desc: 'Teks Kustom 2', value: 'Teks Tambahan 2', type: 'String', code: '<p>{{custom_kalimat_2}}</p>' },
        { tag: '{{custom_kalimat_3}}', desc: 'Teks Kustom 3', value: 'Teks Tambahan 3', type: 'String', code: '<p>{{custom_kalimat_3}}</p>' },
        { tag: '{{custom_kalimat_4}}', desc: 'Teks Kustom 4', value: 'Teks Tambahan 4', type: 'String', code: '<p>{{custom_kalimat_4}}</p>' },
        { tag: '{{quote}}', desc: 'Quote Islami/Bebas', value: 'Dan di antara tanda-tanda...', type: 'String', code: '<blockquote>{{quote}}</blockquote>' },
        { tag: '{{link_backsound_music}}', desc: 'URL Musik Background', value: 'https://cdn.example.com/song.mp3', type: 'URL String', code: '<audio src="{{link_backsound_music}}" id="bgm" loop></audio>' },
        { tag: '{{link_live_streaming}}', desc: 'URL Live Streaming', value: 'https://youtube.com/live/...', type: 'URL String', code: '<a href="{{link_live_streaming}}">Nonton Live</a>' },
        { tag: '{{bank_1}}', desc: 'Nama Bank 1', value: 'BCA', type: 'String', code: '<span>{{bank_1}}</span>' },
        { tag: '{{rek_1}}', desc: 'No Rekening 1', value: '1234567890', type: 'String', code: '<span>{{rek_1}}</span>' },
        { tag: '{{nama_rek_1}}', desc: 'Nama Pemilik Rekening 1', value: t.groom_name, type: 'String', code: '<span>{{nama_rek_1}}</span>' },
        { tag: '{{bank_2}}', desc: 'Nama Bank 2', value: 'Mandiri', type: 'String', code: '<span>{{bank_2}}</span>' },
        { tag: '{{rek_2}}', desc: 'No Rekening 2', value: '0987654321', type: 'String', code: '<span>{{rek_2}}</span>' },
        { tag: '{{nama_rek_2}}', desc: 'Nama Pemilik Rekening 2', value: t.bride_name, type: 'String', code: '<span>{{nama_rek_2}}</span>' },
        { tag: '{{#if flag_pakai_timeline_kisah}}', desc: 'Block Kondisi Timeline Kisah', value: '(Block Logic)', type: 'Boolean Logic', code: '{{#if flag_pakai_timeline_kisah}}\n  <!-- Konten jika true -->\n{{/if}}' },
        { tag: '{{#each timeline_kisah}}', desc: 'Block Looping Timeline Kisah', value: '(Block Logic)', type: 'Looping Logic', code: '{{#each timeline_kisah}}\n  <p>{{this.judul}}</p>\n{{/each}}' },
        { tag: '{{this.tanggal}}', desc: 'Tgl Timeline (Dalam Loop timeline_kisah)', value: 'Januari 2020', type: 'String', code: '<span>{{this.tanggal}}</span>' },
        { tag: '{{this.judul}}', desc: 'Judul Timeline (Dalam Loop timeline_kisah)', value: 'Pertama Kali Bertemu', type: 'String', code: '<h4>{{this.judul}}</h4>' },
        { tag: '{{this.deskripsi}}', desc: 'Desc Timeline (Dalam Loop timeline_kisah)', value: 'Kisah awal pertemuan...', type: 'String', code: '<p>{{this.deskripsi}}</p>' },
        { tag: '{{#if has_gallery}}', desc: 'Boolean: True jika tenan memiliki minimal 1 foto galeri', value: 'true', type: 'Boolean Logic', code: '{{#if has_gallery}}\n  <!-- Tampilkan section galeri -->\n{{/if}}' },
        { tag: '{{#if is_fitur_gallery}}', desc: 'Block Kondisi Fitur Galeri Foto (Flag Admin)', value: '(Block Logic)', type: 'Boolean Logic', code: '{{#if is_fitur_gallery}}\n  <!-- Konten jika true -->\n{{/if}}' },
        { tag: '{{#each galleries}}', desc: 'Block Looping Image Galeri', value: '(Block Logic)', type: 'Looping Logic', code: '{{#each galleries}}\n  <img src="{{this.url}}" alt="Gallery">\n{{/each}}' },
        { tag: '{{this.url}}', desc: 'URL Gambar Galeri (Dalam Loop galleries)', value: 'https://example/img.jpg', type: 'URL String', code: '<img src="{{this.url}}">' },
        { tag: '{{#if tampilkan_amplop_online}}', desc: 'Block Kondisi Amplop Online', value: '(Block Logic)', type: 'Boolean Logic', code: '{{#if tampilkan_amplop_online}}\n  <!-- Render info bank -->\n{{/if}}' },
        { tag: '{{#if flag_lokasi_akad_dan_resepsi_berbeda}}', desc: 'Block Kondisi Lokasi Beda', value: '(Block Logic)', type: 'Boolean Logic', code: '{{#if flag_lokasi_akad_dan_resepsi_berbeda}}\n  <!-- Render info beda -->\n{{/if}}' },
        { tag: '{{#if flag_tampilkan_nama_orang_tua}}', desc: 'Block Kondisi Nama Ortu', value: '(Block Logic)', type: 'Boolean Logic', code: '{{#if flag_tampilkan_nama_orang_tua}}\n  <!-- Render info ortu -->\n{{/if}}' },
        { tag: '{{#if flag_tampilkan_sosial_media_mempelai}}', desc: 'Block Kondisi Sosmed', value: '(Block Logic)', type: 'Boolean Logic', code: '{{#if flag_tampilkan_sosial_media_mempelai}}\n  <!-- Render sosmed -->\n{{/if}}' },
        { tag: '{{#if is_fitur_live_streaming}}', desc: 'Block Kondisi Live Streaming', value: '(Block Logic)', type: 'Boolean Logic', code: '{{#if is_fitur_live_streaming}}\n  <!-- Render Tombol Live -->\n{{/if}}' },
        { tag: '{{#if flag_kirim_hadiah_offline}}', desc: 'Block Kondisi Hadiah Fisik', value: '(Block Logic)', type: 'Boolean Logic', code: '{{#if flag_kirim_hadiah_offline}}\n  <!-- Render Alamat -->\n{{/if}}' },
        { tag: '{{nama_lokasi_kirim_hadiah_offline}}', desc: 'Nama Penerima/Lokasi Hadiah', value: 'Rumah Mempelai', type: 'String', code: '<span>{{nama_lokasi_kirim_hadiah_offline}}</span>' },
        { tag: '{{alamat_lokasi_kirim_hadiah_offline}}', desc: 'Alamat Lengkap Hadiah', value: 'Jl. Merdeka No 1', type: 'String', code: '<p>{{alamat_lokasi_kirim_hadiah_offline}}</p>' },
        { tag: '{{map_kirim_hadiah_offline}}', desc: 'URL Google Maps Kirim Hadiah', value: 'https://maps.app.goo.gl/...', type: 'URL String', code: '<a href="{{map_kirim_hadiah_offline}}">Buka Peta</a>' },
        { tag: '{{#each wishes}}', desc: 'Block Looping Data Ucapan & Doa', value: '(Block Logic)', type: 'Looping Logic', code: '{{#each wishes}}\n  <p>{{this.guest_name}}: {{this.guest_message}}</p>\n{{/each}}' },
        { tag: '{{this.guest_name}}', desc: 'Nama Pengucap (Dalam Loop wishes)', value: 'Bpk. Ridwan', type: 'String', code: '<span>{{this.guest_name}}</span>' },
        { tag: '{{this.guest_message}}', desc: 'Pesan/Ucapan (Dalam Loop wishes)', value: 'Semoga langgeng...', type: 'String', code: '<p>{{this.guest_message}}</p>' },
        { tag: '{{this.guest_comment_time}}', desc: 'Waktu Ucapan (Contoh: 1 jam lalu / 13 Maret 2021)', value: '2 jam lalu', type: 'String', code: '<span>{{this.guest_comment_time}}</span>' },
        { tag: '{{this.guest_initial}}', desc: 'Abjad Awal Nama (Dalam Loop wishes)', value: 'B', type: 'String', code: '<div>{{this.guest_initial}}</div>' },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Panduan Membuat Tema Web"
            size="xl"
        >
            <div className="flex border-b border-gray-200 dark:border-gray-700 mt-2 mb-4">
                <button
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'guide' ? 'border-gold-500 text-gold-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => onTabChange('guide')}
                >
                    📚 Panduan Dasar
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'variables' ? 'border-gold-500 text-gold-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => onTabChange('variables')}
                >
                    🏷️ Variabel Tema (Live)
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logic' ? 'border-gold-500 text-gold-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => onTabChange('logic')}
                >
                    ⚙️ Panduan Logika & Looping
                </button>
            </div>

            <div className="py-2 space-y-6 text-sm text-gray-700 dark:text-gray-300 h-[60vh] overflow-y-auto pr-2 custom-scrollbar">

                {activeTab === 'guide' ? (
                    <>
                        <section>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="text-gold-600">✨</span> Konsep Dasar
                            </h3>
                            <p className="leading-relaxed">
                                Sistem ini menggunakan struktur <strong>Reactive HTML Template</strong>. Anda bebas menulis kode HTML standar, CSS, dan Javascript murni di kolom yang disediakan.
                                Saat halaman undangan dimuat, sistem akan otomatis melakukan <strong>inject</strong> variabel dinamis (seperti nama pengantin) ke dalam tag HTML Anda.
                            </p>
                        </section>

                        <hr className="border-gray-200 dark:border-gray-700" />

                        <section>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="text-blue-500">📚</span> Library Bawaan (Auto Inject)
                            </h3>
                            <p className="mb-3">
                                Anda tidak perlu menginstal library UI. Sistem secara otomatis menyertakan library versi stabil berikut pada halaman undangan publik (Halaman Admin tidak terpengaruh):
                            </p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li><strong>UIkit (v3.21.0)</strong>: Framework UI yang ringan dan modular. Semua class `uk-*` bebas digunakan.</li>
                                <li><strong>Bootstrap (v5.3.3)</strong>: Framework standar industri. Class Grid (`row`, `col`), buttons, dan utilities 100% didukung.</li>
                                <li><strong>Tailwind CSS</strong>: Project ini menggunakan Tailwind bawaan, sehingga utilitas text/bg warna juga dirender.</li>
                                <li><strong>RemixIcon (v4.2.0)</strong>: Ratusan ikon premium gratis. Contoh: <code>&lt;i class="ri-heart-fill"&gt;&lt;/i&gt;</code></li>
                                <li><strong>FontAwesome 6</strong>: Tersedia via UIkit Icons.</li>
                            </ul>
                        </section>

                        <hr className="border-gray-200 dark:border-gray-700" />

                        <hr className="border-gray-200 dark:border-gray-700" />
                        
                        <section>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="text-red-500">🏗️</span> Aturan Struktur & ID Wajib
                            </h3>
                            <p className="mb-4">
                                Agar fitur undangan berjalan normal, Anda <strong>WAJIB</strong> mengikuti struktur ID berikut:
                            </p>
                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                                <div className="flex gap-2">
                                    <code className="text-blue-600 dark:text-blue-400 font-bold shrink-0">id="theme-cover"</code>
                                    <span>Gunakan ID ini pada pembungkus (wrapper) halaman Sampul/Cover paling atas.</span>
                                </div>
                                <div className="flex gap-2">
                                    <code className="text-blue-600 dark:text-blue-400 font-bold shrink-0">id="main-content"</code>
                                    <span>Gunakan ID ini pada pembungkus konten utama undangan (setelah cover dibuka). Set <code>display: none</code> secara default.</span>
                                </div>
                                <div className="flex gap-2">
                                    <code className="text-blue-600 dark:text-blue-400 font-bold shrink-0">data-menu-label="..."</code>
                                    <span>Tambahkan atribut ini pada tag <code>&lt;section&gt;</code> agar otomatis terbaca di Menu Navigasi.</span>
                                </div>
                            </div>
                        </section>

                        <hr className="border-gray-200 dark:border-gray-700" />

                        <section>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="text-purple-600">⚡</span> Tombol Kontrol (Action Buttons)
                            </h3>
                            <p className="mb-4">
                                Berikan ID di bawah ini pada elemen tombol desain Anda agar sistem React dapat menjalankan fungsinya:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
                                    <div className="font-bold text-xs text-gold-600 mb-1">id="btn-open-invitation"</div>
                                    <div className="text-xs">Membuka undangan & memutar musik background.</div>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
                                    <div className="font-bold text-xs text-gold-600 mb-1">id="btn-toggle-music"</div>
                                    <div className="text-xs">Play / Pause musik background secara manual.</div>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
                                    <div className="font-bold text-xs text-gold-600 mb-1">id="btn-show-qr"</div>
                                    <div className="text-xs">Membuka jendela popup Kode QR untuk tamu.</div>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
                                    <div className="font-bold text-xs text-gold-600 mb-1">id="btn-show-menu"</div>
                                    <div className="text-xs">Membuka menu navigasi seksi (overlay menu).</div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="text-orange-500">📜</span> Penggunaan Javascript
                            </h3>
                            <p className="mb-3">
                                Tulis <em>vanilla</em> Javascript pada tab "JS Code". Script ini akan di-<i>wrap</i> dan di-eksekusi setelah DOM selesai meload HTML dan CSS template Anda. Code JS dijamin berjalan secara asinkron tanpa merusak backend situs ini.
                            </p>
                        </section>

                        <hr className="border-gray-200 dark:border-gray-700" />

                        <section>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="text-green-600">📝</span> Fitur Form Otomatis (RSVP & Ucapan)
                            </h3>
                            <p className="mb-4">
                                Anda tidak perlu menulis logic <code>fetch</code> sendiri. Cukup gunakan ID pada elemen input dan <strong>ID khusus pada tombol action</strong> Anda, maka sistem akan menjalankan fungsi pengiriman dan validasi secara otomatis.
                            </p>
                            
                            <div className="space-y-4">
                                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                                    <div className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-2">1. Konfirmasi Kehadiran (RSVP)</div>
                                    <div className="text-xs space-y-1">
                                        <li>Tombol Trigger: <code className="bg-gray-200 dark:bg-gray-900 px-1">id="btn-submit-kehadiran"</code></li>
                                        <li>Container Alert: <code className="bg-gray-200 dark:bg-gray-900 px-1">id="alert-submit-kehadiran"</code></li>
                                        <li>Input Field: <code className="bg-gray-200 dark:bg-gray-900 px-1">id="rsvp-code"</code>, <code className="bg-gray-200 dark:bg-gray-900 px-1">id="rsvp-status"</code>, <code className="bg-gray-200 dark:bg-gray-900 px-1">id="rsvp-guests"</code></li>
                                    </div>
                                </div>

                                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                                    <div className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-2">2. Kirim Ucapan & Doa</div>
                                    <div className="text-xs space-y-1">
                                        <li>Tombol Trigger: <code className="bg-gray-200 dark:bg-gray-900 px-1">id="btn-submit-ucapan"</code></li>
                                        <li>Container Alert: <code className="bg-gray-200 dark:bg-gray-900 px-1">id="alert-submit-ucapan"</code></li>
                                        <li>Input Field: <code className="bg-gray-200 dark:bg-gray-900 px-1">id="wish-name"</code>, <code className="bg-gray-200 dark:bg-gray-900 px-1">id="wish-message"</code></li>
                                    </div>
                                </div>
                            </div>

                            <p className="mt-4 text-xs italic text-gray-500">
                                Info: Saat submit berhasil, tombol trigger akan otomatis menjadi <code>disabled</code>. Pesan status akan muncul di dalam Container Alert menggunakan class <code>uk-text-success</code> atau <code>uk-text-danger</code>.
                            </p>
                        </section>
                    </>
                ) : activeTab === 'logic' ? (
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                <span className="text-blue-500">⚙️</span> Handlebars / Templating Logic
                            </h3>
                            <p className="leading-relaxed">
                                Sistem tema ini menggunakan sintaks ala <strong>Handlebars/Mustache</strong> untuk me-*render* logika kondisional dan *looping* array data.
                                Logika ini dieksekusi di *backend* sebelum HTML dikirim ke browser tamu.
                            </p>
                        </section>

                        <hr className="border-gray-200 dark:border-gray-700" />

                        <section className="space-y-4">
                            <h4 className="text-md font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <span className="text-green-500">1.</span> Kondisional (If / Else / Comparison)
                            </h4>
                            <div className="space-y-2">
                                <p className="text-sm">
                                    <strong>{`{{#if variabel}}`}:</strong> Menampilkan konten jika variabel bernilai <strong>TRUE</strong>.<br/>
                                    <strong>{`{{#if variabel == "teks"}}`}:</strong> Menampilkan jika nilai variabel sama dengan teks.<br/>
                                    <strong>{`{{#if variabel != "teks"}}`}:</strong> Menampilkan jika nilai variabel TIDAK sama.<br/>
                                    <strong>{`{{#if @index % 2 == 0}}`}:</strong> Operasi Modulo (Sisa Bagi). Contoh ini untuk baris genap.
                                </p>
                            </div>

                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-[11px] overflow-x-auto text-gray-300">
                                <span className="text-gray-500">{"<!-- Contoh Logic Kompleks -->"}</span><br />
                                <span className="text-green-400">{"{{#if @index % 2 == 1}}"}</span><br />
                                &nbsp;&nbsp;{"<div class=\"bg-gray-100\">Baris Ganjil</div>"}<br />
                                <span className="text-green-400">{"{{else}}"}</span><br />
                                &nbsp;&nbsp;{"<div class=\"bg-white\">Baris Genap</div>"}<br />
                                <span className="text-green-400">{"{{/if}}"}</span>
                                <br/><br/>
                                <span className="text-green-400">{"{{#if status == \"confirmed\"}}"}</span><br />
                                &nbsp;&nbsp;{"<span>Tamu Hadir</span>"}<br />
                                <span className="text-green-400">{"{{/if}}"}</span>
                            </div>
                        </section>

                        <hr className="border-gray-200 dark:border-gray-700" />

                        <section className="space-y-4">
                            <h4 className="text-md font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <span className="text-blue-500">2.</span> Variabel Khusus Loop (@index, @first, @last)
                            </h4>
                            <p className="text-sm">Dalam blok <code>{`{{#each}}`}</code>, Anda dapat mengakses metadata perulangan:</p>
                            <ul className="list-disc pl-5 text-sm space-y-1">
                                <li><code>{`{{@index}}`}</code>: Urutan data mulai dari 0.</li>
                                <li><code>{`{{@index_plus_1}}`}</code>: Urutan data mulai dari 1.</li>
                                <li><code>{`{{@first}}`}</code>: Bernilai true jika data pertama.</li>
                                <li><code>{`{{@last}}`}</code>: Bernilai true jika data terakhir.</li>
                                <li><code>{`{{@even}}`} / {`{{@odd}}`}</code>: Membantu pewarnaan belang.</li>
                            </ul>
                        </section>

                        <hr className="border-gray-200 dark:border-gray-700" />

                        <section className="space-y-4">
                            <h4 className="text-md font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <span className="text-orange-500">2.</span> Looping Data Array (Each)
                            </h4>
                            <p className="text-sm">Gunakan blok <code>{`{{#each variabel_array}} ... {{/each}}`}</code> untuk mengulang elemen HTML sebanyak jumlah data riil (contoh: Galeri Foto, Cerita Cinta). Di dalam blok iterasi, gunakan <code>{`{{this.field}}`}</code> untuk mengakses isi datanya.</p>

                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-xs overflow-x-auto text-gray-300">
                                <span className="text-gray-500">{"<!-- Contoh: Menampilkan Timeline Cerita Cinta -->"}</span><br />
                                <span className="text-orange-400">{"{{#each timeline_kisah}}"}</span><br />
                                &nbsp;&nbsp;{"<div class=\"timeline-item\">"}<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;{"<div class=\"date\">"}<span className="text-blue-400">{"{{this.tanggal}}"}</span>{"</div>"}<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;{"<h4>"}<span className="text-blue-400">{"{{this.judul}}"}</span>{"</h4>"}<br />
                                &nbsp;&nbsp;&nbsp;&nbsp;{"<p>"}<span className="text-blue-400">{"{{this.deskripsi}}"}</span>{"</p>"}<br />
                                &nbsp;&nbsp;{"</div>"}<br />
                                <span className="text-orange-400">{"{{/each}}"}</span>
                            </div>

                            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-xs overflow-x-auto text-gray-300 mt-2">
                                <span className="text-gray-500">{"<!-- Contoh 2: Menampilkan Gambar Galeri -->"}</span><br />
                                <span className="text-orange-400">{"{{#each galleries}}"}</span><br />
                                &nbsp;&nbsp;{"<img src=\""}<span className="text-blue-400">{"{{this.url}}"}</span>{"\" alt=\"Wedding Photo\">"}<br />
                                <span className="text-orange-400">{"{{/each}}"}</span>
                            </div>
                        </section>
                    </div>
                ) : (
                    <section>
                        <p className="mb-4 text-gray-600 dark:text-gray-400">
                            Berikut adalah daftar variabel (*Tag*) yang dapat Anda gunakan di dalam HTML Code. Tabel di bawah ini juga menampilkan contoh nilai yang di-*inject* secara langsung dari data riil penyewa (*tenant*) saat ini.
                        </p>
                        <div className="overflow-x-visible rounded-lg border border-gray-200 dark:border-gray-700">
                            <table className="w-full table-fixed text-left text-sm whitespace-normal break-words">
                                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold border-b dark:border-gray-700 w-[30%]">Tag Variabel</th>
                                        <th className="px-4 py-3 font-semibold border-b dark:border-gray-700 w-[40%]">Deskripsi</th>
                                        <th className="px-4 py-3 font-semibold border-b dark:border-gray-700 w-[30%]">Contoh Render (Live)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {variables.map((v, i) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td
                                                className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400 text-xs font-semibold relative group cursor-pointer select-none"
                                                onClick={() => copyToClipboard(v.tag)}
                                                title="Klik untuk menyalin tag"
                                            >
                                                {copiedTag === v.tag ? (
                                                    <span className="flex items-center gap-1 text-green-500 dark:text-green-400 animate-fade-in">
                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                        Tersalin!
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5">
                                                        {v.tag}
                                                        <svg className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    </span>
                                                )}
                                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 bg-gray-900 text-white text-xs rounded shadow-lg p-2 z-50">
                                                    <div className="font-bold text-gold-400 mb-1">Tipe: {v.type}</div>
                                                    <div className="text-gray-200">Value Riil: <br /> {v.value}</div>
                                                    <div className="text-gray-400 mt-1 italic">Klik untuk menyalin</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.desc}</td>
                                            <td className="px-4 py-3 text-green-600 dark:text-green-400 font-medium relative group cursor-help">
                                                <span className="line-clamp-2">{v.value || <span className="text-gray-300 italic">Kosong</span>}</span>
                                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded shadow-lg p-3 z-50">
                                                    <div className="font-bold text-gold-400 mb-1 flex items-center gap-1">
                                                        <span>💡</span> Contoh Implementasi
                                                    </div>
                                                    <pre className="text-[10px] text-green-300 mt-2 bg-black/50 p-2 rounded whitespace-pre-wrap font-mono">
                                                        {v.code}
                                                    </pre>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button onClick={onClose} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium">
                    Tutup Panduan
                </button>
            </div>
        </Modal>
    );
}
