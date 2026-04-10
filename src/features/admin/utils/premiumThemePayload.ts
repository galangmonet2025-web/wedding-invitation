export const PREMIUM_THEME_PAYLOAD = {
    name: "Premium Emas",
    plan_type: "premium",
    flag_draft: false,
    image_types: ["hero_cover", "groom_photo", "bride_photo", "background", "closing", "story_photo", "gallery"],
    css_template: `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');

.premium-theme {
    font-family: 'Inter', sans-serif;
}
.btn-gold:hover {
    background-color: #D4AF37 !important;
    color: white !important;
}
.countdown-box {
    border-radius: 8px;
    min-width: 80px;
    padding: 10px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}
.uk-countdown-number {
    font-size: 2rem;
    font-weight: 700;
}
.wish-card { 
    background-color: #fff;
    border-left: 4px solid #D4AF37;
    margin-bottom: 10px;
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.wish-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: bold;
}
.avatar-circle {
    width: 35px;
    height: 35px;
    background-color: #D4AF37;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
}

/* Floating Navigation & FAB Styles */
#theme-fab-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 1001; /* Higher than system buttons */
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
}
/* Hide system buttons if they exist to prevent duplication */
.fixed.top-6.right-6.z-50.flex.flex-col {
    display: none !important;
}

.fab-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border: 2px solid #D4AF37;
    color: #D4AF37;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.fab-btn:hover {
    transform: scale(1.1) translateY(-2px);
    background: #D4AF37;
    color: white;
}
.fab-btn i {
    pointer-events: none; /* Ensure click goes to div */
}

#theme-nav-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(12px);
    z-index: 2000;
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    padding: 20px;
}
.nav-menu-list {
    list-style: none;
    padding: 0;
    text-align: center;
}
.nav-menu-item {
    margin: 15px 0;
    font-size: 1.5rem;
    font-family: 'Playfair Display', serif;
    cursor: pointer;
    transition: color 0.3s;
}
.nav-menu-item:hover {
    color: #D4AF37;
}
.close-nav {
    position: absolute;
    top: 25px;
    right: 25px;
    font-size: 2rem;
    cursor: pointer;
}
`,
    js_template: `
// --- THEME LOGIC EXECUTION ---
(function() {
    
    // 1. Handle Cover Opening
    setTimeout(() => {
        const btnOpen = document.getElementById('btn-open-invitation');
        const cover = document.getElementById('theme-cover');
        const mainContent = document.getElementById('main-content');
        
        if(btnOpen && cover && mainContent) {
            btnOpen.onclick = function(e) {
                // Biarkan React parent ThemeWrapper.tsx menangani state isOpened/isPlaying (event bubbling), 
                // tapi kita juga handle DOM logic disini untuk menghapus cover
                cover.classList.add('uk-animation-fade', 'uk-animation-reverse');
                setTimeout(() => {
                    cover.style.display = 'none';
                    mainContent.style.display = 'block';
                    mainContent.classList.add('uk-animation-fade');
                }, 500);
            };
        }
    }, 100);

    // 2. RSVP UI Logic - Toggle guest count display
    const rsvpStatus = document.getElementById('rsvp-status');
    const guestWrapper = document.getElementById('rsvp-guest-count-wrapper');
    if(rsvpStatus && guestWrapper) {
        rsvpStatus.addEventListener('change', function(e) {
            if(e.target.value === 'declined') {
                guestWrapper.style.display = 'none';
            } else {
                guestWrapper.style.display = 'block';
            }
        });
    }

    // 3. COPY TO CLIPBOARD Helper
    // wishes fetch is removed; data is now injected natively into HTML via {{wishes}}

    // --- NAVIGATION MODAL LOGIC REMOVED: Now handled by React backend ---
})();
`,
    html_template: `<div class="premium-theme text-gray-800 bg-gray-50">
    <div id="theme-cover" class="uk-position-cover uk-flex uk-flex-center uk-flex-middle uk-background-cover uk-light"
        style="z-index: 100; position: fixed; background-image: url('{{photo_hero_cover}}'); {{#if is_opened}}display: none;{{/if}}">
        <div class="uk-position-cover" style="background-color: rgba(0,0,0,0.6);"></div>
        <div class="uk-position-relative uk-text-center uk-animation-fade uk-padding">
            <h4 class="uk-margin-remove-bottom" style="font-family: 'Playfair Display', serif; color: #D4AF37;">The
                Wedding Of</h4>
            <h1 class="uk-heading-medium uk-margin-small-top" style="font-family: 'Playfair Display', serif;">
                {{groom_name}} & {{bride_name}}</h1>
            <p class="uk-text-lead uk-margin-top mb-1">Kepada Yth.</p>
            <h3 class="uk-margin-remove-top uk-text-bold" style="color: #D4AF37;">{{guest_name}}</h3>

            <div class="uk-margin-medium-top uk-flex uk-flex-column uk-flex-middle gap-3">
                <button id="btn-open-invitation" class="btn-gold uk-button uk-button-large uk-button-default uk-border-pill" style="border-color: #D4AF37; color: #D4AF37;">
                    <i class="ri-mail-open-fill uk-margin-small-right"></i> Buka Undangan
                </button>
                <button id="btn-show-qr" class="uk-button uk-button-text" style="color: #fff;">
                    <i class="ri-qr-code-line"></i> QR Code Kehadiran
                </button>
            </div>
        </div>
    </div>

    <!-- MAIN CONTENT -->
    <div id="main-content" style="{{#if is_opened}}display: block;{{else}}display: none;{{/if}} height: 100vh; overflow-y: auto;">

        <!-- SECTION 1: HERO LANDING -->
        <section id="sec-hero"
            class="uk-section uk-section-large uk-background-cover uk-light uk-flex uk-flex-middle uk-position-relative"
            style="min-height: 100vh; background-image: url('{{photo_background}}');">
            <div class="uk-position-cover" style="background-color: rgba(0,0,0,0.5);"></div>
            <div class="uk-container uk-position-relative uk-text-center"
                uk-scrollspy="cls: uk-animation-slide-bottom-medium; delay: 200">
                <p class="uk-text-large uk-text-italic mb-2"
                    style="font-family: 'Playfair Display', serif; color: #D4AF37;">{{kalimat_pembuka}}</p>
                <div class="uk-margin-medium-top">
                    <img src="{{photo_groom_photo}}" alt="Groom" class="uk-border-circle uk-box-shadow-large outline-gold" style="width: 120px; height: 120px; object-fit: cover; border: 4px solid #D4AF37;">
                    <span class="uk-text-large uk-margin-small-left uk-margin-small-right" style="color: #D4AF37;">&</span>
                    <img src="{{photo_bride_photo}}" alt="Bride" class="uk-border-circle uk-box-shadow-large outline-gold" style="width: 120px; height: 120px; object-fit: cover; border: 4px solid #D4AF37;">
                </div>
                <h1 class="uk-heading-small uk-margin-medium-top" style="font-family: 'Playfair Display', serif;">
                    {{groom_name}} <span style="font-size: 0.5em; color: #D4AF37;">&</span> {{bride_name}}</h1>
                <p class="uk-text-lead uk-margin-small-top">{{wedding_date}}</p>
            </div>
        </section>

        <!-- SECTION 2: PERKENALAN PASANGAN -->
        <section id="sec-mempelai" data-menu-label="Pengantin" class="uk-section uk-section-muted">
            <div class="uk-container uk-container-xsmall uk-text-center">
                <div uk-scrollspy="cls: uk-animation-fade; delay: 100">
                    <h2 class="uk-h2" style="font-family: 'Playfair Display', serif; color: #D4AF37;">Mempelai</h2>
                    <p class="uk-text-meta uk-margin-medium-bottom">{{quote}}</p>
                </div>

                <div class="uk-child-width-1-1 uk-child-width-1-2@s" uk-grid>
                    <div uk-scrollspy="cls: uk-animation-slide-left-small; delay: 200">
                        <div class="uk-card uk-card-default uk-card-body uk-border-rounded">
                            <h3 class="uk-card-title uk-text-bold" style="font-family: 'Playfair Display', serif;">
                                {{groom_name}}</h3>
                            <p class="uk-text-small uk-margin-remove-bottom">Putra dari</p>
                            <p class="uk-text-bold uk-margin-remove-top">Bpk. {{nama_bapak_laki_laki}} & Ibu
                                {{nama_ibu_laki_laki}}</p>
                            <a href="https://instagram.com/{{ig_laki_laki}}" target="_blank" class="uk-icon-button"
                                style="color: #D4AF37; border-color:#D4AF37;" uk-icon="instagram"></a>
                        </div>
                    </div>
                    <div uk-scrollspy="cls: uk-animation-slide-right-small; delay: 300">
                        <div class="uk-card uk-card-default uk-card-body uk-border-rounded">
                            <h3 class="uk-card-title uk-text-bold" style="font-family: 'Playfair Display', serif;">
                                {{bride_name}}</h3>
                            <p class="uk-text-small uk-margin-remove-bottom">Putri dari</p>
                            <p class="uk-text-bold uk-margin-remove-top">Bpk. {{nama_bapak_perempuan}} & Ibu
                                {{nama_ibu_perempuan}}</p>
                            <a href="https://instagram.com/{{ig_perempuan}}" target="_blank" class="uk-icon-button"
                                style="color: #D4AF37; border-color:#D4AF37;" uk-icon="instagram"></a>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- SECTION TAMBAHAN: COUNTDOWN & RSVP -->
        <section id="sec-rsvp" data-menu-label="Kehadiran" class="uk-section uk-section-default uk-background-cover"
            style="background-image: url('{{photo_story_photo}}'); background-attachment: fixed;">
            <div class="bg-overlay" style="background-color: rgba(255,255,255,0.9); padding: 60px 0;">
                <div class="uk-container uk-container-small uk-text-center"
                    uk-scrollspy="cls: uk-animation-scale-up; delay: 200">
                    <h2 style="font-family: 'Playfair Display', serif; color: #D4AF37;">Menuju Hari Bahagia</h2>
                    <div id="countdown" class="uk-grid-small uk-child-width-auto uk-margin-medium-top uk-flex-center"
                        uk-grid>
                        <div>
                            <div class="uk-card uk-card-default uk-card-body countdown-box">
                                <div class="uk-countdown-number uk-countdown-days" style="color: #D4AF37;">00</div>
                                <div class="uk-countdown-label uk-text-small">Hari</div>
                            </div>
                        </div>
                        <div>
                            <div class="uk-card uk-card-default uk-card-body countdown-box">
                                <div class="uk-countdown-number uk-countdown-hours" style="color: #D4AF37;">00</div>
                                <div class="uk-countdown-label uk-text-small">Jam</div>
                            </div>
                        </div>
                        <div>
                            <div class="uk-card uk-card-default uk-card-body countdown-box">
                                <div class="uk-countdown-number uk-countdown-minutes" style="color: #D4AF37;">00</div>
                                <div class="uk-countdown-label uk-text-small">Menit</div>
                            </div>
                        </div>
                        <div>
                            <div class="uk-card uk-card-default uk-card-body countdown-box">
                                <div class="uk-countdown-number uk-countdown-seconds" style="color: #D4AF37;">00</div>
                                <div class="uk-countdown-label uk-text-small">Detik</div>
                            </div>
                        </div>
                    </div>

                    <!-- RSVP FORM -->
                    <div class="uk-card uk-card-default uk-card-body uk-margin-large-top uk-box-shadow-large"
                        style="border-top: 4px solid #D4AF37; border-radius: 12px;">
                        <h3 style="font-family: 'Playfair Display', serif;">Konfirmasi Kehadiran</h3>
                        <p class="uk-text-small">Mohon konfirmasi kehadiran Anda untuk memudahkan pengaturan acara.</p>

                        <form id="form-rsvp" class="uk-form-stacked uk-text-left uk-margin-top">
                            <div class="uk-margin">
                                <label class="uk-form-label">Kode Undangan</label>
                                <div class="uk-form-controls">
                                    <input class="uk-input" type="text" id="rsvp-code" placeholder="Misal: WED-XXX" required>
                                </div>
                            </div>
                            <div class="uk-margin">
                                <label class="uk-form-label">Konfirmasi</label>
                                <div class="uk-form-controls">
                                    <select class="uk-select" id="rsvp-status">
                                        <option value="confirmed">Hadir</option>
                                        <option value="declined">Tidak Hadir</option>
                                    </select>
                                </div>
                            </div>
                            <div class="uk-margin" id="rsvp-guest-count-wrapper">
                                <label class="uk-form-label">Jumlah Tamu</label>
                                <div class="uk-form-controls">
                                    <input class="uk-input" type="number" id="rsvp-guests" value="1" min="1" max="10">
                                </div>
                            </div>
                            <div class="uk-margin-top">
                                <button class="uk-button uk-button-primary uk-width-1-1" style="background-color: #D4AF37; border:none;" id="btn-submit-kehadiran">Kirim RSVP</button>
                            </div>
                            <div id="alert-submit-kehadiran" class="uk-margin-small-top uk-text-small uk-text-center"></div>
                        </form>
                    </div>

                </div>
            </div>
        </section>

        <!-- SECTION 3: WAKTU & TEMPAT -->
        <section id="sec-acara" data-menu-label="Akad & Resepsi" class="uk-section uk-section-muted">
            <div class="uk-container uk-container-small uk-text-center">
                <h2 style="font-family: 'Playfair Display', serif; color: #D4AF37;">Akad & Resepsi</h2>
                <div class="uk-grid-match uk-child-width-1-2@m uk-margin-large-top" uk-grid>
                    <!-- Akad -->
                    <div uk-scrollspy="cls: uk-animation-slide-bottom-small; delay: 100">
                        <div class="uk-card uk-card-default uk-card-body" style="border-radius: 12px;">
                            <i class="ri-building-4-line" style="font-size: 3rem; color: #D4AF37;"></i>
                            <h3 class="uk-card-title uk-margin-small-top"
                                style="font-family: 'Playfair Display', serif;">Akad Nikah</h3>
                            <p class="uk-text-bold uk-margin-remove-bottom">{{tanggal_akad}}</p>
                            <p class="uk-margin-remove-top">{{jam_akad}} WIB</p>
                            <hr>
                            <p class="uk-text-bold">{{nama_lokasi_akad}}</p>
                            <p class="uk-text-small">{{keterangan_lokasi_akad}}</p>
                            {{#if akad_map}}
                            <a href="{{akad_map}}" target="_blank"
                                class="uk-button uk-button-default uk-border-pill uk-margin-small-top"
                                style="color:#D4AF37; border-color:#D4AF37;">
                                <i class="ri-map-pin-line"></i> Google Maps
                            </a>
                            {{/if}}
                        </div>
                    </div>
                    <!-- Resepsi -->
                    <div uk-scrollspy="cls: uk-animation-slide-bottom-small; delay: 200">
                        <div class="uk-card uk-card-default uk-card-body"
                            style="border-radius: 12px; border: 2px solid #D4AF37;">
                            <i class="ri-goblet-line" style="font-size: 3rem; color: #D4AF37;"></i>
                            <h3 class="uk-card-title uk-margin-small-top"
                                style="font-family: 'Playfair Display', serif;">Resepsi</h3>
                            <p class="uk-text-bold uk-margin-remove-bottom">{{tanggal_resepsi}}</p>
                            <p class="uk-margin-remove-top">{{jam_resepsi}} WIB</p>
                            <hr>
                            <p class="uk-text-bold">{{nama_lokasi_resepsi}}</p>
                            <p class="uk-text-small">{{keterangan_lokasi_resepsi}}</p>
                            {{#if resepsi_map}}
                            <a href="{{resepsi_map}}" target="_blank"
                                class="uk-button uk-button-primary uk-border-pill uk-margin-small-top"
                                style="background-color:#D4AF37; border-color:#D4AF37;">
                                <i class="ri-map-pin-line"></i> Google Maps
                            </a>
                            {{/if}}
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- SECTION 4: LINK LIVE & SECTION 5: TIMELINE KISAH -->
        {{#if live_streaming}}
        <section id="sec-live" data-menu-label="Streaming" class="uk-section uk-section-primary"
            style="background-color: #1a1a1a;">
            <div class="uk-container uk-container-small uk-text-center">
                <i class="ri-live-fill" style="font-size: 3rem; color: red;"></i>
                <h2 style="font-family: 'Playfair Display', serif; color: #D4AF37;">Live Streaming</h2>
                <p>Kami juga menyiarkan acara secara virtual melalui {{live_streaming.platform}}.</p>
                <a href="{{live_streaming.url}}" target="_blank"
                    class="uk-button uk-button-danger uk-border-pill uk-margin-top">Tonton Live Sekarang</a>
            </div>
        </section>
        {{/if}}

        {{#if flag_pakai_timeline_kisah}}
        <section id="sec-cerita" data-menu-label="Perjalanan" class="uk-section uk-section-default">
            <div class="uk-container uk-container-small">
                <h2 class="uk-text-center" style="font-family: 'Playfair Display', serif; color: #D4AF37;">Love Story
                </h2>
                <div class="uk-margin-large-top">
                    {{#each timeline_kisah}}
                    <div class="uk-card uk-card-default uk-card-body uk-margin-bottom"
                        style="border-left: 4px solid #D4AF37;" uk-scrollspy="cls: uk-animation-fade; delay: 100">
                        <h4 class="uk-margin-remove-bottom"
                            style="color: #D4AF37; font-family: 'Playfair Display', serif;">{{this.tanggal}}</h4>
                        <h3 class="uk-card-title uk-margin-small-top">{{this.judul}}</h3>
                        <p>{{this.deskripsi}}</p>
                    </div>
                    {{/each}}
                </div>
            </div>
        </section>
        {{/if}}

        <!-- SECTION 6: GALLERY FOTO -->
        {{#if has_gallery}}
        <section id="sec-galeri" data-menu-label="Galeri" class="uk-section uk-section-muted">
            <div class="uk-container uk-container-xlarge">
                <h2 class="uk-text-center uk-margin-large-bottom"
                    style="font-family: 'Playfair Display', serif; color: #D4AF37;">Galeri Foto</h2>
                <div class="uk-child-width-1-2 uk-child-width-1-3@m" uk-grid uk-lightbox="animation: slide">
                    {{#each photo_gallery}}
                    <div>
                        <img class="uk-inline" src="{{this.url}}" />
                    </div>
                    {{/each}}
                </div>
            </div>
        </section>
        {{/if}}

        <!-- SECTION 7: DOA & UCAPAN -->
        <section id="sec-ucapan" data-menu-label="Doa & Ucapan" class="uk-section uk-section-default uk-text-center">
            <div class="uk-container uk-container-small">
                <h2 style="font-family: 'Playfair Display', serif; color: #D4AF37;">Ucapan & Doa</h2>
                <p>Berikan ucapan manis dan doa restu untuk pernikahan kami.</p>

                <form id="form-wish"
                    class="uk-margin-medium-top uk-text-left uk-card uk-card-default uk-card-body"
                    style="border-radius: 12px; border-top: 4px solid #D4AF37;">
                    <div class="uk-margin">
                        <input class="uk-input" type="text" id="wish-name" placeholder="Nama Anda" required>
                    </div>
                    <div class="uk-margin">
                        <textarea class="uk-textarea" id="wish-message" rows="4" placeholder="Tulis ucapan dan doa terbaik Anda..." required></textarea>
                    </div>
                    <button class="uk-button uk-button-primary uk-width-1-1" style="background-color: #D4AF37; border:none;" id="btn-submit-ucapan">Kirim Ucapan / Doa</button>
                    <div id="alert-submit-ucapan" class="uk-margin-small-top uk-text-small uk-text-center"></div>
                </form>

                <!-- List of Wishes (Loaded dynamically via Template Variables) -->
                <div id="wishes-list" class="uk-margin-large-top uk-text-left"
                    style="max-height: 400px; overflow-y: auto; padding-right: 15px;">
                    {{#if empty_wishes}}
                    <p class="uk-text-center uk-text-muted" id="wishes-loading">Belum ada ucapan, jadilah yang pertama!
                    </p>
                    {{/if}}
                    {{#each wishes}}
                    <div class="wish-card uk-animation-slide-top">
                        <div class="wish-card-header">
                            <div class="avatar-circle">{{this.guest_initial}}</div>
                            <span>{{this.guest_name}}</span>
                        </div>
                        <p class="uk-margin-small-top uk-text-small">{{this.guest_message}}</p>
                    </div>
                    {{/each}}
                </div>
            </div>
        </section>

        <!-- SECTION 8: AMPLOP ONLINE -->
        {{#if tampilkan_amplop_online}}
        <section id="sec-hadiah" data-menu-label="Gifts" class="uk-section uk-section-muted uk-text-center">
            <div class="uk-container uk-container-small">
                <i class="ri-gift-line" style="font-size: 3rem; color: #D4AF37;"></i>
                <h2 style="font-family: 'Playfair Display', serif; color: #D4AF37;">Wedding Gift</h2>
                <p>Doa restu Anda merupakan karunia yang sangat berarti. Jika Anda ingin memberikan tanda kasih berupa
                    kado/amplop digital, dapat dikirimkan melalui:</p>
                <div class="uk-grid-small uk-child-width-1-2@m uk-margin-medium-top uk-flex-center" uk-grid>
                    <div uk-scrollspy="cls: uk-animation-slide-bottom-small; delay: 100">
                        <div class="uk-card uk-card-default uk-card-body" style="border-radius: 12px;">
                            <h3 class="uk-card-title uk-text-bold mb-0">{{bank_1}}</h3>
                            <p class="uk-text-large uk-margin-small-bottom uk-text-primary" id="rek1">{{rek_1}}</p>
                            <p class="uk-margin-remove-top">a.n {{nama_rek_1}}</p>
                            <button class="uk-button uk-button-small uk-button-default btn-copy" data-rek="rek1"><i class="ri-clipboard-line"></i> Salin</button>
                        </div>
                    </div>
                    <div uk-scrollspy="cls: uk-animation-slide-bottom-small; delay: 200">
                        <div class="uk-card uk-card-default uk-card-body" style="border-radius: 12px;">
                            <h3 class="uk-card-title uk-text-bold mb-0">{{bank_2}}</h3>
                            <p class="uk-text-large uk-margin-small-bottom uk-text-primary" id="rek2">{{rek_2}}</p>
                            <p class="uk-margin-remove-top">a.n {{nama_rek_2}}</p>
                            <button class="uk-button uk-button-small uk-button-default btn-copy" data-rek="rek2"><i class="ri-clipboard-line"></i> Salin</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        {{/if}}

        <!-- SECTION 9: PENUTUP -->
        <section class="uk-section uk-section-large uk-background-cover uk-light uk-text-center uk-position-relative"
            style="background-image: url('{{photo_closing}}'); min-height: 50vh;">
            <div class="uk-position-cover" style="background-color: rgba(0,0,0,0.6);"></div>
            <div class="uk-position-relative uk-container uk-container-small">
                <p class="uk-text-large uk-text-italic" style="font-family: 'Playfair Display', serif;">
                    {{kalimat_penutup}}</p>
                <h2 class="uk-margin-medium-top" style="font-family: 'Playfair Display', serif; color: #D4AF37;">
                    {{groom_name}} & {{bride_name}}</h2>
                <p class="uk-text-small uk-margin-large-top">Made with ❤️ by Wedding SaaS Platform</p>
            </div>
        </section>

        <!-- FLOATING ACTION BUTTONS -->
        <div id="theme-fab-container">
            <!-- Menu Button -->
            <div id="btn-show-menu" class="fab-btn" title="Menu Navigasi">
                <i class="ri-menu-line"></i>
            </div>
            <!-- Music Button -->
            <div id="btn-toggle-music" class="fab-btn" title="Musik">
                <i class="ri-music-2-line"></i>
            </div>
            <!-- QR Button -->
            <div id="btn-show-qr" class="fab-btn" title="QR Code Kehadiran">
                <i class="ri-qr-code-line"></i>
            </div>
        </div>


    </div>
</div>
`
};
