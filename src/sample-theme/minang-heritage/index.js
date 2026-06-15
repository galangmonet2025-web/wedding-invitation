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
            btn.style.background = "rgba(215, 187, 131, 0.35)";
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
function initMinangHeritageTheme() {

    // ---- Resolve the actual scroll container (phone on desktop, window on mobile) ----
    const phoneContainer = document.querySelector('.phone-container');
    const appScreen = document.querySelector('.mock-app-screen');

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

    // ---- 2. Parallax layers + scroll progress ----
    const parallaxLayers = document.querySelectorAll('.parallax-layer');
    const storyBackdrop = document.querySelector('.story-backdrop');
    const progressBar = document.getElementById('scroll-progress');
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

    // ---- 3. Floating ambient particles (gold songket motes) ----
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

    // ---- 5b. Scroll-up FAB ----
    const btnScrollUp = document.getElementById('btn-scroll-up');
    if (btnScrollUp) {
        btnScrollUp.addEventListener('click', function () {
            const scroller = getScroller();
            if (scroller === window) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                scroller.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        const toggleScrollUp = () => {
            const scroller = getScroller();
            btnScrollUp.style.display = getScrollTop(scroller) > 400 ? 'flex' : 'none';
        };
        window.addEventListener('scroll', toggleScrollUp, { passive: true });
        if (phoneContainer) phoneContainer.addEventListener('scroll', toggleScrollUp, { passive: true });
    }

    // ---- 6. Open Invitation ----
    const btnOpen = document.getElementById('btn-open-invitation');
    const floatingUI = document.getElementById('theme-fab-container');

    if (btnOpen) {
        btnOpen.onclick = function () {
            if (appScreen) appScreen.classList.add('reveal-content');

            setTimeout(() => {
                document.body.style.overflow = 'auto';
                if (phoneContainer) phoneContainer.style.overflowY = 'auto';
                onScroll();
                if (window.__revealInView) window.__revealInView();
            }, 1000);

            if (floatingUI) floatingUI.style.display = 'block';
            if (bgMusic) {
                bgMusic.play().catch(() => console.log("Auto-play blocked"));
            }
        };
    }
}

// Run now if the DOM is ready, else wait for it.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMinangHeritageTheme);
} else {
    initMinangHeritageTheme();
}
