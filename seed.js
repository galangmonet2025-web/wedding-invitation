import fs from 'fs';

const API_URL = 'https://script.google.com/macros/s/AKfycbwwACKPA1WtsEvRFU60oVDm8Edk6j3LQJIPbnV-gIZ0gBQHCqzMRcXm-L_XlmQA7y25/exec';

const theme1Html = `
<div class="wedding-theme">
    <!-- COVER SECTION -->
    <div id="cover-section" class="uk-height-viewport uk-flex uk-flex-center uk-flex-middle uk-background-cover uk-light" style="background-image: url('https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2000&auto=format&fit=crop');">
        <div class="uk-overlay uk-overlay-primary uk-position-cover"></div>
        <div class="uk-position-center uk-text-center uk-width-xlarge uk-padding">
            <h4 class="uk-text-italic uk-margin-small">The Wedding Of</h4>
            <h1 class="uk-heading-medium theme-title">{{bride_name}} <br>&amp; {{groom_name}}</h1>
            <p class="uk-text-lead">{{wedding_date}}</p>
            <hr class="uk-divider-small uk-margin-medium">
            <div class="uk-margin-medium-top guest-box">
                <p class="uk-text-meta uk-margin-remove">Kepada Yth. Bapak/Ibu/Saudara/i</p>
                <h3 class="uk-text-bolder uk-margin-remove">{{guest_name}}</h3>
            </div>
            <!-- TOMBOL WAJIB COVER -->
            <button id="btn-open-invitation" class="uk-button uk-button-default uk-border-pill uk-margin-top px-4">
                <i class="ri-mail-open-line uk-margin-small-right"></i> Buka Undangan
            </button>
            <br>
            <button id="btn-show-qr" class="uk-button uk-button-text uk-margin-small-top">
                <i class="ri-qr-code-line"></i> Tampilkan QR Check-in
            </button>
        </div>
    </div>

    <!-- MAIN CONTENT (HIDDEN BEFORE OPEN) -->
    <div id="main-content" class="uk-hidden">
        <!-- Hero Section -->
        <section class="uk-section uk-section-default uk-text-center" uk-scrollspy="cls: uk-animation-fade; target: > .uk-container; delay: 500;">
            <div class="uk-container uk-container-small">
                <p class="uk-text-italic">Bismillahirrahmanirrahim</p>
                <p class="uk-margin-bottom">{{kalimat_pembuka}}</p>
                <div class="uk-child-width-1-2@m uk-grid-divider uk-grid-match uk-margin-large-top" uk-grid>
                    <div>
                        <h2>{{groom_name}}</h2>
                        <p class="uk-text-small uk-text-muted">Putra dari Bpk. {{nama_bapak_laki_laki}} &amp; Ibu {{nama_ibu_laki_laki}}</p>
                        <a href="https://instagram.com/{{ig_laki_laki}}" class="uk-icon-button" target="_blank"><i class="ri-instagram-line"></i></a>
                    </div>
                    <div>
                        <h2>{{bride_name}}</h2>
                        <p class="uk-text-small uk-text-muted">Putri dari Bpk. {{nama_bapak_perempuan}} &amp; Ibu {{nama_ibu_perempuan}}</p>
                        <a href="https://instagram.com/{{ig_perempuan}}" class="uk-icon-button" target="_blank"><i class="ri-instagram-line"></i></a>
                    </div>
                </div>
            </div>
        </section>

        <!-- Events Section -->
        <section class="uk-section uk-section-muted uk-text-center">
            <div class="uk-container uk-container-small">
                <h2 class="uk-heading-line uk-text-center"><span>Rangkaian Acara</span></h2>
                
                <div class="uk-child-width-1-2@m uk-grid-match uk-margin-large-top" uk-grid uk-scrollspy="cls: uk-animation-slide-bottom; target: .uk-card; delay: 300;">
                    <div>
                        <div class="uk-card uk-card-default uk-card-body uk-border-rounded">
                            <i class="ri-quill-pen-line uk-text-primary uk-text-large"></i>
                            <h3 class="uk-card-title uk-margin-small-top">Akad Nikah</h3>
                            <p class="uk-text-bold uk-margin-remove">{{tanggal_akad}}</p>
                            <p class="uk-margin-remove">{{jam_akad}}</p>
                            <p class="uk-text-small uk-margin-small-top">{{nama_lokasi_akad}}</p>
                            <p class="uk-text-meta">{{keterangan_lokasi_akad}}</p>
                            <a href="{{akad_map}}" target="_blank" class="uk-button uk-button-default uk-button-small uk-margin-top uk-border-pill">Google Maps</a>
                        </div>
                    </div>
                    {{#if flag_lokasi_akad_dan_resepsi_berbeda}}
                    <div>
                        <div class="uk-card uk-card-default uk-card-body uk-border-rounded">
                            <i class="ri-goblet-line uk-text-primary uk-text-large"></i>
                            <h3 class="uk-card-title uk-margin-small-top">Resepsi</h3>
                            <p class="uk-text-bold uk-margin-remove">{{tanggal_resepsi}}</p>
                            <p class="uk-margin-remove">{{jam_resepsi}}</p>
                            <p class="uk-text-small uk-margin-small-top">{{nama_lokasi_resepsi}}</p>
                            <p class="uk-text-meta">{{keterangan_lokasi_resepsi}}</p>
                            <a href="{{resepsi_map}}" target="_blank" class="uk-button uk-button-default uk-button-small uk-margin-top uk-border-pill">Google Maps</a>
                        </div>
                    </div>
                    {{/if}}
                </div>
            </div>
        </section>

        <!-- TIMELINE KISAH -->
        {{#if flag_pakai_timeline_kisah}}
        <section class="uk-section uk-section-default">
            <div class="uk-container uk-container-small">
                <h2 class="uk-heading-line uk-text-center uk-margin-large-bottom"><span>Perjalanan Cinta Kami</span></h2>
                <div class="uk-container uk-container-xsmall">
                    {{#each timeline_kisah}}
                    <div class="uk-margin-medium-bottom uk-card uk-card-default uk-card-body uk-border-rounded uk-box-shadow-small" uk-scrollspy="cls: uk-animation-slide-bottom; delay: 200;">
                        <span class="uk-text-meta uk-text-uppercase" style="color: #d4af37;">{{this.tanggal}}</span>
                        <h4 class="uk-margin-remove-top">{{this.judul}}</h4>
                        <p class="uk-text-small">{{this.deskripsi}}</p>
                    </div>
                    {{/each}}
                </div>
            </div>
        </section>
        {{/if}}

        <!-- SECTION GALLERY (Advanced Condition & Loop) -->
        {{#if has_gallery}}
        <section class="uk-section uk-section-default">
            <div class="uk-container">
                <h2 class="uk-heading-line uk-text-center uk-margin-large-bottom"><span>Momen Bahagia</span></h2>
                
                <div class="uk-child-width-1-2 uk-child-width-1-3@m" uk-grid uk-lightbox="animation: slide">
                    {{#each galleries}}
                    <div>
                        <a class="uk-inline uk-transition-toggle" href="{{this.url}}" data-caption="{{this.caption}}">
                            <div class="uk-card uk-card-default uk-card-hover uk-border-rounded uk-overflow-hidden" style="height: 300px;">
                                <img src="{{this.url}}" alt="{{this.caption}}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                            <div class="uk-overlay uk-overlay-primary uk-position-bottom uk-text-center uk-transition-slide-bottom">
                                <p class="uk-margin-remove">{{this.caption}}</p>
                            </div>
                        </a>
                    </div>
                    {{/each}}
                </div>
            </div>
        </section>
        {{/if}}

        <!-- Footer -->
        <section class="uk-section uk-section-secondary uk-text-center uk-light">
            <div class="uk-container uk-container-small">
                <p>{{kalimat_penutup}}</p>
                <h3 class="theme-title uk-margin-top">{{bride_name}} &amp; {{groom_name}}</h3>
                <p class="uk-text-meta">Wedding Invitation SaaS</p>
            </div>
        </section>
    </div>
</div>
`;

const theme1Css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Poppins:wght@300;400;600&display=swap');

.wedding-theme {
    font-family: 'Poppins', sans-serif;
    color: #333;
}
.wedding-theme .theme-title {
    font-family: 'Playfair Display', serif;
    color: #d4af37; /* Gold elegan */
}
.wedding-theme .uk-text-primary {
    color: #d4af37 !important;
}
.wedding-theme .uk-button-default {
    border-color: #d4af37;
    color: #d4af37;
    transition: all 0.3s ease;
}
.wedding-theme .uk-button-default:hover {
    background-color: #d4af37;
    color: white;
}
.wedding-theme .uk-section-secondary {
    background-color: #1a1a1a;
}
.guest-box {
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.2);
    padding: 15px;
    border-radius: 10px;
}
`;

const theme1Js = `
document.getElementById('btn-open-invitation')?.addEventListener('click', function() {
    const cover = document.getElementById('cover-section');
    const main = document.getElementById('main-content');
    if(!cover || !main) return;
    
    cover.classList.add('uk-animation-fade', 'uk-animation-reverse');
    setTimeout(() => {
        cover.classList.add('uk-hidden');
        main.classList.remove('uk-hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 500);
});
`;

const theme2Html = `
<div class="wedding-theme-dark uk-light uk-background-secondary">
    <!-- FRONT COVER -->
    <div id="welcome-screen" class="uk-flex uk-flex-center uk-flex-middle uk-height-viewport uk-background-cover" style="background-image: url('https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2000&auto=format&fit=crop');">
        <div class="uk-overlay uk-overlay-primary uk-position-cover" style="background: rgba(0,0,0,0.7)"></div>
        <div class="uk-position-z-index uk-text-center uk-padding">
            <h5 class="uk-text-uppercase uk-text-spacing uk-margin-remove">We Are Getting Married</h5>
            <h1 class="accent-font uk-heading-large uk-margin-small">{{bride_name}} &amp; {{groom_name}}</h1>
            <p class="uk-text-lead uk-text-muted">{{wedding_date}}</p>
            
            <div class="uk-card uk-card-secondary uk-card-small uk-card-body uk-margin-large-top uk-border-rounded">
                <p class="uk-text-small uk-margin-remove">Dear,</p>
                <h4 class="uk-margin-remove accent-color">{{guest_name}}</h4>
            </div>

            <div class="uk-margin-medium-top">
                <button id="btn-open-invitation" class="uk-button uk-button-primary uk-border-pill">
                    <i class="ri-door-open-line uk-margin-small-right"></i> Open Invitation
                </button>
            </div>
            <p class="uk-text-small uk-margin-top">
                <a href="#" id="btn-show-qr" class="uk-link-text"><i class="ri-qr-scan-2-line"></i> Show QR</a>
            </p>
        </div>
    </div>

    <!-- CONTENT BODY -->
    <div id="content-body" class="uk-hidden">
        <div class="uk-section uk-section-large" uk-scrollspy="target: [uk-scrollspy-class]; cls: uk-animation-slide-bottom-medium; delay: 200;">
            <div class="uk-container uk-container-small uk-text-center">
                
                <h2 uk-scrollspy-class class="accent-font uk-margin-large-bottom">Groom &amp; Bride</h2>
                
                <div class="uk-grid-large uk-child-width-1-2@m uk-flex-middle" uk-grid>
                    <div uk-scrollspy-class>
                        <div class="uk-inline-clip uk-transition-toggle uk-border-circle" tabindex="0">
                            <img src="https://ui-avatars.com/api/?name={{groom_name}}&background=333&color=fff&size=200" alt="{{groom_name}}">
                        </div>
                        <h3 class="uk-margin-top uk-margin-remove-bottom">{{groom_name}}</h3>
                        <p class="uk-text-muted uk-text-small uk-margin-remove-top">Bpk. {{nama_bapak_laki_laki}} &amp; Ibu {{nama_ibu_laki_laki}}</p>
                        <a href="https://instagram.com/{{ig_laki_laki}}" class="uk-icon-link uk-margin-small-right"><i class="ri-instagram-line"></i></a>
                    </div>
                    <div uk-scrollspy-class>
                        <div class="uk-inline-clip uk-transition-toggle uk-border-circle" tabindex="0">
                            <img src="https://ui-avatars.com/api/?name={{bride_name}}&background=333&color=fff&size=200" alt="{{bride_name}}">
                        </div>
                        <h3 class="uk-margin-top uk-margin-remove-bottom">{{bride_name}}</h3>
                        <p class="uk-text-muted uk-text-small uk-margin-remove-top">Bpk. {{nama_bapak_perempuan}} &amp; Ibu {{nama_ibu_perempuan}}</p>
                        <a href="https://instagram.com/{{ig_perempuan}}" class="uk-icon-link uk-margin-small-right"><i class="ri-instagram-line"></i></a>
                    </div>
                </div>

                <hr class="uk-divider-icon uk-margin-large">

                <h2 uk-scrollspy-class class="accent-font uk-margin-large-bottom">Wedding Events</h2>
                <div class="uk-child-width-1-2@m uk-grid-match" uk-grid>
                    <div uk-scrollspy-class>
                        <div class="uk-card uk-card-secondary uk-card-body dark-glass">
                            <i class="ri-focus-2-line uk-text-large accent-color"></i>
                            <h3 class="uk-card-title uk-margin-top">Akad</h3>
                            <ul class="uk-list uk-list-collapse uk-text-small">
                                <li><strong>{{tanggal_akad}}</strong></li>
                                <li>Pukul {{jam_akad}}</li>
                                <li class="uk-margin-small-top">{{nama_lokasi_akad}}</li>
                                <li><a href="{{akad_map}}" class="uk-link-text uk-text-muted" target="_blank"><i class="ri-map-pin-line"></i> Buka Maps</a></li>
                            </ul>
                        </div>
                    </div>
                    {{#if flag_lokasi_akad_dan_resepsi_berbeda}}
                    <div uk-scrollspy-class>
                        <div class="uk-card uk-card-secondary uk-card-body dark-glass">
                            <i class="ri-mic-line uk-text-large accent-color"></i>
                            <h3 class="uk-card-title uk-margin-top">Resepsi</h3>
                            <ul class="uk-list uk-list-collapse uk-text-small">
                                <li><strong>{{tanggal_resepsi}}</strong></li>
                                <li>Pukul {{jam_resepsi}}</li>
                                <li class="uk-margin-small-top">{{nama_lokasi_resepsi}}</li>
                                <li><a href="{{resepsi_map}}" class="uk-link-text uk-text-muted" target="_blank"><i class="ri-map-pin-line"></i> Buka Maps</a></li>
                            </ul>
                        </div>
                    </div>
                    {{/if}}
                </div>
            </div>
        </div>

        <!-- TIMELINE KISAH -->
        {{#if flag_pakai_timeline_kisah}}
        <div class="uk-section uk-section-secondary">
            <div class="uk-container uk-container-small">
                <h2 uk-scrollspy-class class="accent-font uk-text-center uk-margin-large-bottom">Our Journey</h2>
                <div class="uk-container uk-container-xsmall">
                    {{#each timeline_kisah}}
                    <div class="uk-margin-large-bottom uk-text-center" uk-scrollspy="cls: uk-animation-slide-bottom; delay: 200;">
                        <span class="uk-text-meta accent-color">{{this.tanggal}}</span>
                        <h4 class="uk-margin-small-top">{{this.judul}}</h4>
                        <p class="uk-text-small uk-text-muted">{{this.deskripsi}}</p>
                        <hr class="uk-divider-small uk-margin-auto">
                    </div>
                    {{/each}}
                </div>
            </div>
        </div>
        {{/if}}

        <!-- SECTION GALLERY (Advanced Condition & Loop) -->
        {{#if has_gallery}}
        <div class="uk-section" uk-scrollspy="target: [uk-scrollspy-class]; cls: uk-animation-fade; delay: 300;">
            <div class="uk-container">
                <h2 uk-scrollspy-class class="accent-font uk-text-center uk-margin-large-bottom">Captured Moments</h2>
                
                <div class="uk-grid-small uk-child-width-1-2 uk-child-width-1-4@m" uk-grid uk-lightbox="animation: slide">
                    {{#each galleries}}
                    <div uk-scrollspy-class>
                        <a class="uk-inline uk-transition-toggle" href="{{this.url}}" data-caption="{{this.caption}}">
                            <div class="dark-glass uk-border-rounded uk-overflow-hidden" style="height: 250px;">
                                <img src="{{this.url}}" alt="{{this.caption}}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.8;" class="uk-transition-scale-up uk-transition-opaque">
                            </div>
                        </a>
                    </div>
                    {{/each}}
                </div>
            </div>
        </div>
        {{/if}}

    </div>
</div>
`;

const theme2Css = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@300;400;600&display=swap');

.wedding-theme-dark {
    font-family: 'Inter', sans-serif;
    background-color: #0f172a; /* Slate 900 Tailwind */
    min-height: 100vh;
}
.wedding-theme-dark .accent-font {
    font-family: 'Cinzel', serif;
}
.wedding-theme-dark .accent-color {
    color: #e2e8f0; 
    text-shadow: 0 0 10px rgba(255,255,255,0.2);
}
.wedding-theme-dark .uk-button-primary {
    background-color: #334155;
    color: #f8fafc;
    border: 1px solid #475569;
}
.wedding-theme-dark .uk-button-primary:hover {
    background-color: #475569;
}
.dark-glass {
    background: rgba(30, 41, 59, 0.7) !important;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.05);
}
`;

const theme2Js = `
document.getElementById('btn-open-invitation')?.addEventListener('click', function() {
    const cover = document.getElementById('welcome-screen');
    const content = document.getElementById('content-body');
    if(!cover || !content) return;
    
    cover.classList.add('uk-animation-slide-top', 'uk-animation-reverse');
    setTimeout(() => {
        cover.style.display = 'none';
        content.classList.remove('uk-hidden');
    }, 400);
});
`;

async function createTheme(name, plan, html, css, js, token) {
    try {
        console.log("Seeding:", name);
        const res = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow', // Important for apps script
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'createTheme',
                token: token,
                name: name,
                plan_type: plan,
                preview_image: '',
                html_template: html.trim(),
                css_template: css.trim(),
                js_template: js.trim()
            })
        });
        const data = await res.json();
        console.log("Result for", name, ":", data);
    } catch (e) {
        console.error("Error creating theme", name, ":", e);
    }
}

async function run() {
    console.log("Logging in...");
    const loginRes = await fetch(API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'login',
            username: 'admin',
            password: 'admin123'
        })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
        console.error("Login failed:", loginData);
        return;
    }
    const token = loginData.data.token;
    console.log("Login success! Token acquired.");

    await createTheme("Gold Ivy Template (Cloned Reactivity)", "pro", theme1Html, theme1Css, theme1Js, token);
    await createTheme("Platinum Leslie Template (Cloned Reactivity)", "premium", theme2Html, theme2Css, theme2Js, token);
    console.log("Done seeding.");
}
run();
