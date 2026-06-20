// ============ Copy to Clipboard ============
window.copyToClipboard = function (elementId, btn) {
    const el = document.getElementById(elementId);
    if (!el) return;

    let text = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? el.value : el.innerText || el.textContent;
    const originalText = btn.innerHTML;

    function handleSuccess() {
        if (typeof UIkit !== 'undefined') {
            UIkit.notification({
                message: '<span uk-icon="icon: check"></span> Teks berhasil disalin!',
                status: 'success',
                pos: 'top-center',
                timeout: 2000
            });
        } else {
            btn.innerHTML = '<span uk-icon="check" style="margin-right: 5px;"></span> DATA TERSALIN';
            btn.style.background = "rgba(232, 114, 154, 0.35)";
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = "";
            }, 2000);
        }
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(handleSuccess).catch(() => {
            fallbackCopy(text, handleSuccess);
        });
    } else {
        fallbackCopy(text, handleSuccess);
    }
};

function fallbackCopy(text, callback) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        callback();
    } catch (err) {
        console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
}

// ============ Countdown ============
const countDownDate = new Date("Dec 31, 2026 00:00:00").getTime();

const cinematicCountdown = setInterval(function () {
    const now = new Date().getTime();
    const distance = countDownDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minutesEl = document.getElementById("minutes");
    const secondsEl = document.getElementById("seconds");
    const countdownEl = document.getElementById("countdown");

    if (daysEl) daysEl.innerHTML = days.toString().padStart(2, '0');
    if (hoursEl) hoursEl.innerHTML = hours.toString().padStart(2, '0');
    if (minutesEl) minutesEl.innerHTML = minutes.toString().padStart(2, '0');
    if (secondsEl) secondsEl.innerHTML = seconds.toString().padStart(2, '0');

    if (distance < 0) {
        clearInterval(cinematicCountdown);
        if (countdownEl) countdownEl.innerHTML = "ACARA SEDANG BERLANGSUNG";
    }
}, 1000);

// ============ Main ============
// NOTE: when this theme runs inside the app, the script is injected AFTER
// DOMContentLoaded has already fired, so we can't rely on that event — run
// immediately if the DOM is ready, otherwise wait for it.
function initNetflixTheme() {

    // ---- Resolve the actual scroll container (phone on desktop, window on mobile) ----
    const phoneContainer = document.querySelector('.phone-container');
    const appScreen = document.querySelector('.mock-app-screen');

    // ---- Lock scrolling while the cover is showing (until "Buka Undangan") ----
    // Keep it simple & non-invasive: only toggle overflow on the actual
    // scrollers (phone-container on desktop, body on mobile). Do NOT touch
    // <html> overflow — that shifts the fixed FAB buttons.
    function lockScroll() {
        if (phoneContainer) {
            phoneContainer.classList.add('is-locked');
            phoneContainer.style.overflowY = 'hidden';
        }
        document.body.style.overflow = 'hidden';
    }
    function unlockScroll() {
        if (phoneContainer) {
            phoneContainer.classList.remove('is-locked');
            phoneContainer.style.overflowY = 'auto';
        }
        // base CSS sets body{overflow:hidden}; mobile body is the scroller, so
        // explicitly set 'auto' to override it.
        document.body.style.overflow = 'auto';
    }
    lockScroll();

    function getScroller() {
        if (phoneContainer && phoneContainer.scrollHeight > phoneContainer.clientHeight + 5) {
            return phoneContainer;
        }
        return window;
    }

    function getScrollTop(scroller) {
        return scroller === window
            ? (window.scrollY || document.documentElement.scrollTop)
            : scroller.scrollTop;
    }

    // ---- 1. Scroll-reveal via IntersectionObserver ----
    const revealEls = document.querySelectorAll('.reveal-item');

    const observerRoot = (phoneContainer && phoneContainer.scrollHeight > phoneContainer.clientHeight + 5)
        ? phoneContainer
        : null;

    if ('IntersectionObserver' in window && revealEls.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                } else {
                    entry.target.classList.remove('is-visible');
                }
            });
        }, { root: observerRoot, threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

        revealEls.forEach(el => observer.observe(el));

        const revealInView = () => {
            const vh = window.innerHeight;
            revealEls.forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.top < vh * 0.95 && r.bottom > 0) {
                    el.classList.add('is-visible');
                }
            });
        };
        revealInView();
        window.__revealInView = revealInView;
    } else {
        revealEls.forEach(el => el.classList.add('is-visible'));
    }

    // ---- 2. Parallax layers + scroll progress (responsive image movement) ----
    const parallaxLayers = document.querySelectorAll('.parallax-layer');
    const storyBackdrop = document.querySelector('.story-backdrop');
    const progressBar = document.getElementById('scroll-progress');
    const btnScrollUp = document.getElementById('btn-scroll-up');
    let ticking = false;

    function onScroll() {
        const scroller = getScroller();
        const scrollTop = getScrollTop(scroller);
        const viewportH = window.innerHeight;

        parallaxLayers.forEach(layer => {
            const speed = parseFloat(layer.getAttribute('data-speed')) || 0.3;
            const rect = layer.getBoundingClientRect();
            const offset = (rect.top - viewportH / 2) * speed;
            layer.style.transform = `translate3d(0, ${offset * -0.4}px, 0) scale(1.1)`;
        });

        if (storyBackdrop) {
            storyBackdrop.style.transform = `translate3d(0, ${scrollTop * 0.08}px, 0) scale(1.05)`;
        }

        if (progressBar) {
            const scrollHeight = scroller === window
                ? document.documentElement.scrollHeight - viewportH
                : scroller.scrollHeight - scroller.clientHeight;
            const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
        }

        if (btnScrollUp) {
            btnScrollUp.style.display = scrollTop > viewportH * 0.6 ? 'flex' : 'none';
        }

        ticking = false;
    }

    function requestScroll() {
        if (!ticking) {
            window.requestAnimationFrame(onScroll);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestScroll, { passive: true });
    if (phoneContainer) phoneContainer.addEventListener('scroll', requestScroll, { passive: true });
    onScroll();

    // ---- Scroll-to-top button ----
    if (btnScrollUp) {
        btnScrollUp.addEventListener('click', function () {
            const scroller = getScroller();
            if (scroller === window) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                scroller.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // ---- Hero "Play" / "More Info" buttons → scroll down to next section ----
    const heroNext = document.getElementById('hero-next');
    document.querySelectorAll('[data-scroll-next]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            if (!heroNext) return;
            const scroller = getScroller();
            if (scroller === window) {
                heroNext.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                // Scroll the phone-container by the element's offset within it.
                const top = heroNext.offsetTop - scroller.offsetTop;
                scroller.scrollTo({ top: top, behavior: 'smooth' });
            }
        });
    });

    // ---- "Next Episode" card on closing → scroll back to top (replay) ----
    document.querySelectorAll('[data-scroll-top]').forEach(function (el) {
        function goTop() {
            const scroller = getScroller();
            if (scroller === window) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                scroller.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        el.addEventListener('click', goTop);
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTop(); }
        });
    });

    // ---- 3. Floating ambient particles ----
    function spawnParticles() {
        const count = window.innerWidth < 960 ? 14 : 22;
        const host = document.body;
        const rightEdge = window.innerWidth >= 960 ? 500 : window.innerWidth;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'floating-particle';
            const size = 2 + Math.random() * 5;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = (Math.random() * rightEdge) + 'px';
            p.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
            p.style.animationDuration = (10 + Math.random() * 14) + 's';
            p.style.animationDelay = (Math.random() * 12) + 's';
            host.appendChild(p);
        }
    }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        spawnParticles();
    }

    // ---- 4. Happiness Horizontal Carousel ----
    const storyCarousel = document.getElementById('story-carousel');
    if (storyCarousel) {
        const slides = Array.from(storyCarousel.querySelectorAll('.story-slide'));
        const dots = Array.from(document.querySelectorAll('#story-dots .story-dot-nav'));

        function activeIndex() {
            const mid = storyCarousel.scrollLeft + storyCarousel.clientWidth / 2;
            let best = 0, bestDist = Infinity;
            slides.forEach((s, i) => {
                const c = s.offsetLeft + s.offsetWidth / 2;
                const d = Math.abs(c - mid);
                if (d < bestDist) { bestDist = d; best = i; }
            });
            return best;
        }

        function syncActive() {
            const idx = activeIndex();
            slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
            dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
        }

        let scrollRaf = false;
        storyCarousel.addEventListener('scroll', () => {
            if (!scrollRaf) {
                window.requestAnimationFrame(() => { syncActive(); scrollRaf = false; });
                scrollRaf = true;
            }
        }, { passive: true });

        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                const s = slides[i];
                if (s) {
                    storyCarousel.scrollTo({
                        left: s.offsetLeft - (storyCarousel.clientWidth - s.offsetWidth) / 2,
                        behavior: 'smooth'
                    });
                }
            });
        });

        if (slides[0]) {
            storyCarousel.scrollLeft = slides[0].offsetLeft - (storyCarousel.clientWidth - slides[0].offsetWidth) / 2;
        }
        syncActive();
    }

    // ---- 4a-2. Wedding Gift horizontal slider (dots generated from slide count) ----
    const giftCarousel = document.getElementById('gift-carousel');
    const giftDotsHost = document.getElementById('gift-dots');
    if (giftCarousel) {
        const giftSlides = Array.from(giftCarousel.querySelectorAll('.gift-slide'));

        // Single card → no need for slider chrome; keep it centered & static.
        if (giftSlides.length <= 1) {
            giftCarousel.style.justifyContent = 'center';
            if (giftSlides[0]) giftSlides[0].classList.add('is-active');
            if (giftDotsHost) giftDotsHost.style.display = 'none';
        } else {
            // Build one dot per slide
            if (giftDotsHost) {
                giftDotsHost.innerHTML = giftSlides
                    .map((_, i) => '<span class="gift-dot-nav' + (i === 0 ? ' is-active' : '') + '"></span>')
                    .join('');
            }
            const giftDots = giftDotsHost ? Array.from(giftDotsHost.querySelectorAll('.gift-dot-nav')) : [];

            function giftActiveIndex() {
                const mid = giftCarousel.scrollLeft + giftCarousel.clientWidth / 2;
                let best = 0, bestDist = Infinity;
                giftSlides.forEach((s, i) => {
                    const c = s.offsetLeft + s.offsetWidth / 2;
                    const d = Math.abs(c - mid);
                    if (d < bestDist) { bestDist = d; best = i; }
                });
                return best;
            }

            function giftSyncActive() {
                const idx = giftActiveIndex();
                giftSlides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
                giftDots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
            }

            let giftRaf = false;
            giftCarousel.addEventListener('scroll', () => {
                if (!giftRaf) {
                    window.requestAnimationFrame(() => { giftSyncActive(); giftRaf = false; });
                    giftRaf = true;
                }
            }, { passive: true });

            giftDots.forEach((dot, i) => {
                dot.addEventListener('click', () => {
                    const s = giftSlides[i];
                    if (s) {
                        giftCarousel.scrollTo({
                            left: s.offsetLeft - (giftCarousel.clientWidth - s.offsetWidth) / 2,
                            behavior: 'smooth'
                        });
                    }
                });
            });

            giftSyncActive();
        }
    }

    // ---- 4b. Wedding-date calendar with the day highlighted ----
    const calEl = document.getElementById('wedding-calendar');
    if (calEl && !calEl.dataset.rendered) {
        const raw = (calEl.getAttribute('data-wedding-date') || '').trim();

        let target = null;
        const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            target = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
        } else if (raw) {
            const d = new Date(raw);
            if (!isNaN(d.getTime())) target = d;
        }

        if (target && !isNaN(target.getTime())) {
            const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

            const year = target.getFullYear();
            const month = target.getMonth();
            const weddingDay = target.getDate();

            const firstDow = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            let html = '';
            html += '<div class="cal-title">' + monthNames[month] + ' ' + year + '</div>';
            html += '<div class="cal-grid cal-head">';
            dayNames.forEach(function (d) { html += '<span class="cal-dow">' + d + '</span>'; });
            html += '</div>';
            html += '<div class="cal-grid cal-body">';
            for (let i = 0; i < firstDow; i++) html += '<span class="cal-cell cal-empty"></span>';
            for (let d = 1; d <= daysInMonth; d++) {
                const isWed = d === weddingDay;
                html += '<span class="cal-cell' + (isWed ? ' cal-active' : '') + '">'
                    + (isWed ? '<span class="cal-heart"></span>' : '')
                    + '<span class="cal-num">' + d + '</span>'
                    + '</span>';
            }
            html += '</div>';

            calEl.innerHTML = html;
            calEl.dataset.rendered = 'true';
        }
    }

    // ---- 5. Music state UI ----
    const btnMusic = document.getElementById('btn-toggle-music');
    const bgMusic = document.getElementById('bg-music');

    function updateMusicUI() {
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (!playIcon || !pauseIcon || !bgMusic) return;

        if (bgMusic.paused) {
            if (btnMusic) btnMusic.classList.remove('music-playing');
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        } else {
            if (btnMusic) btnMusic.classList.add('music-playing');
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }
    }

    if (bgMusic) {
        bgMusic.addEventListener('play', updateMusicUI);
        bgMusic.addEventListener('pause', updateMusicUI);
        bgMusic.addEventListener('playing', updateMusicUI);
    }

    if (btnMusic && bgMusic) {
        btnMusic.addEventListener('click', function () {
            if (bgMusic.paused) {
                bgMusic.play().catch(() => {});
            } else {
                bgMusic.pause();
            }
        });
    }

    // ---- 6. Open Invitation (with Netflix "TUDUM" intro) ----
    const btnOpen = document.getElementById('btn-open-invitation');
    const floatingUI = document.getElementById('theme-fab-container');
    const intro = document.getElementById('nflx-intro');

    // Synthesize the iconic "ta-DUM" with WebAudio — no audio file needed, and it
    // fires straight from the click so the browser allows the sound.
    function playTudum() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
            const t0 = ctx.currentTime;

            // A single deep "boom" with a punchy attack and long decay.
            function boom(startAt, freqStart, freqEnd, peak, dur) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freqStart, t0 + startAt);
                osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + startAt + dur * 0.6);

                gain.gain.setValueAtTime(0.0001, t0 + startAt);
                gain.gain.exponentialRampToValueAtTime(peak, t0 + startAt + 0.025);
                gain.gain.exponentialRampToValueAtTime(0.0001, t0 + startAt + dur);

                // A touch of overtone for body
                const osc2 = ctx.createOscillator();
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(freqStart * 2, t0 + startAt);
                osc2.frequency.exponentialRampToValueAtTime(freqEnd * 2, t0 + startAt + dur * 0.6);
                const gain2 = ctx.createGain();
                gain2.gain.setValueAtTime(0.0001, t0 + startAt);
                gain2.gain.exponentialRampToValueAtTime(peak * 0.25, t0 + startAt + 0.025);
                gain2.gain.exponentialRampToValueAtTime(0.0001, t0 + startAt + dur * 0.7);

                osc.connect(gain).connect(ctx.destination);
                osc2.connect(gain2).connect(ctx.destination);
                osc.start(t0 + startAt); osc.stop(t0 + startAt + dur + 0.05);
                osc2.start(t0 + startAt); osc2.stop(t0 + startAt + dur + 0.05);
            }

            // "ta" (short, higher) then "DUM" (deep, loud). Dipanggil tepat saat
            // logo terbentuk, jadi offset-nya kecil saja.
            boom(0.00, 180, 120, 0.45, 0.16);  // ta
            boom(0.16, 110, 55, 0.95, 0.9);    // DUM
        } catch (e) { /* ignore audio errors */ }
    }

    function revealInvitation() {
        unlockScroll();
        if (appScreen) appScreen.classList.add('reveal-content');
        setTimeout(() => {
            onScroll();
            if (window.__revealInView) window.__revealInView();
        }, 1000);
        if (floatingUI) floatingUI.style.display = 'block';
        if (bgMusic) {
            bgMusic.play().catch(() => console.log("Auto-play blocked"));
        }
    }

    // ---- TUDUM intro: ident Netflix (CSS) + suara "tudum" (WebAudio) ----
    // Animasi ident berdurasi ~4 dtk (brush membentuk N → lampu warna → zoom-in
    // kamera). "tudum" berbunyi saat N terbentuk (~1.4s), lalu undangan dibuka.
    const INTRO_HIT_MS = 1400;   // saat "tudum" berbunyi & N terbentuk
    const INTRO_HOLD_MS = 3600;  // mulai membuka undangan (di balik layar hitam)
    const INTRO_FADE_MS = 3900;  // overlay mulai fade out
    const INTRO_DONE_MS = 4700;  // overlay dibersihkan total
    let introDone = false;

    function finishIntro() {
        if (introDone || !intro) return;
        introDone = true;
        intro.classList.remove('is-playing', 'is-ending');
        intro.style.display = 'none';
    }

    if (btnOpen) {
        btnOpen.onclick = function () {
            btnOpen.disabled = true; // cegah double-trigger saat intro berjalan

            if (!intro) { revealInvitation(); return; }

            // 1) Tampilkan layar hitam + jalankan animasi N
            intro.classList.add('is-playing');

            // 2) Bunyikan "tudum" tepat saat logo menghantam
            setTimeout(playTudum, INTRO_HIT_MS);

            // 3) Buka undangan di balik layar hitam (cover sudah hilang saat tirai naik)
            setTimeout(revealInvitation, INTRO_HOLD_MS);

            // 4) Fade overlay
            setTimeout(() => intro.classList.add('is-ending'), INTRO_FADE_MS);

            // 5) Bersihkan overlay
            setTimeout(finishIntro, INTRO_DONE_MS);
        };
    }
}

// Run now if the DOM is ready, else wait for it.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNetflixTheme);
} else {
    initNetflixTheme();
}
