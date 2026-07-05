// Copy to Clipboard Function
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
            btn.style.background = "rgba(40, 167, 69, 0.5)";
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = "";
            }, 2000);
        }
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(handleSuccess).catch(err => {
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

// ============ Countdown (reads the REAL wedding date from the DB) ============
// Backend returns wedding_date as "YYYY-MM-DD" (Utilities.formatDate). We count
// down to it and, once reached, show a status message instead of frozen zeros:
//   upcoming        → live countdown numbers
//   wedding day     → "Acara sedang berlangsung" (within the reception window)
//   after reception → "Acara sudah selesai, terima kasih…"
(function startWeddingCountdown() {
    // Avoid stacking intervals when the host re-executes this script.
    if (window.__tmCountdownTimer) { clearInterval(window.__tmCountdownTimer); window.__tmCountdownTimer = null; }

    function resolveWeddingDay() {
        // #wedding-calendar[data-wedding-date] or #tm-wed-date[data-wedding-date]
        var holder = document.getElementById('wedding-calendar') || document.getElementById('tm-wed-date');
        var raw = holder ? (holder.getAttribute('data-wedding-date') || '').trim() : '';
        var m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0);
        if (raw) { var d = new Date(raw); if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0); }
        return null;
    }

    // Parse reception END time from an element carrying {{jam_resepsi}} ("HH:MM - HH:MM").
    function receptionEnd(day) {
        var holder = document.getElementById('tm-jam-resepsi')
            || document.querySelector('[data-var="jam_resepsi"]');
        var txt = holder ? (holder.textContent || '') : '';
        var times = txt.match(/(\d{1,2}):(\d{2})/g) || [];
        var endH = 23, endM = 59;
        if (times.length >= 2) { var p = times[times.length - 1].split(':'); endH = +p[0]; endM = +p[1]; }
        else if (times.length === 1) { var q = times[0].split(':'); endH = +q[0] + 3; endM = +q[1]; }
        var end = new Date(day.getTime());
        end.setHours(Math.min(23, endH), endM, 0, 0);
        return end;
    }

    var weddingDay = resolveWeddingDay();

    function setStatus(msg) {
        var el = document.getElementById('countdown-status');
        var box = document.getElementById('countdown-boxes') || document.getElementById('countdown');
        if (el) { el.textContent = msg; el.style.display = 'block'; }
        // Hide the number boxes (but keep #countdown-status visible if it lives inside).
        if (box && el && box.contains(el)) {
            var kids = box.children;
            for (var i = 0; i < kids.length; i++) { if (kids[i] !== el) kids[i].style.display = 'none'; }
        } else if (box) {
            box.style.display = 'none';
        }
    }

    function run() {
        if (!weddingDay || isNaN(weddingDay.getTime())) return;
        var recEnd = receptionEnd(weddingDay);

        function tick() {
            var now = Date.now();
            var dist = weddingDay.getTime() - now;
            var daysEl = document.getElementById('days');
            var hoursEl = document.getElementById('hours');
            var minutesEl = document.getElementById('minutes');
            var secondsEl = document.getElementById('seconds');

            if (dist > 0) {
                var d = Math.floor(dist / 864e5);
                var h = Math.floor((dist % 864e5) / 36e5);
                var mm = Math.floor((dist % 36e5) / 6e4);
                var s = Math.floor((dist % 6e4) / 1000);
                if (daysEl) daysEl.innerHTML = String(d).padStart(2, '0');
                if (hoursEl) hoursEl.innerHTML = String(h).padStart(2, '0');
                if (minutesEl) minutesEl.innerHTML = String(mm).padStart(2, '0');
                if (secondsEl) secondsEl.innerHTML = String(s).padStart(2, '0');
            } else if (now <= recEnd.getTime()) {
                setStatus('Hari yang kami nantikan telah tiba — acara sedang berlangsung 🎉');
                clearInterval(window.__tmCountdownTimer); window.__tmCountdownTimer = null;
            } else {
                setStatus('Acara kami sudah selesai. Terima kasih atas dukungan & doa terbaiknya 🙏');
                clearInterval(window.__tmCountdownTimer); window.__tmCountdownTimer = null;
            }
        }
        tick();
        window.__tmCountdownTimer = setInterval(tick, 1000);
    }
    run();
})();

// RSVP Form Logic
document.addEventListener('DOMContentLoaded', function () {

    // Happiness Card Stacking Carousel Logic
    const happinessCards = document.querySelectorAll('.stacked-card');
    if (happinessCards.length > 0) {
        happinessCards.forEach(card => {
            card.addEventListener('click', function () {
                // If it is already the center card, do nothing
                if (this.classList.contains('card-center')) return;

                const activeLeft = document.querySelector('.stacked-card.card-left');
                const activeCenter = document.querySelector('.stacked-card.card-center');
                const activeRight = document.querySelector('.stacked-card.card-right');

                if (this.classList.contains('card-left')) {
                    // Click left card: left becomes center, center becomes right, right becomes left
                    if (activeLeft) {
                        activeLeft.classList.remove('card-left');
                        activeLeft.classList.add('card-center');
                    }
                    if (activeCenter) {
                        activeCenter.classList.remove('card-center');
                        activeCenter.classList.add('card-right');
                    }
                    if (activeRight) {
                        activeRight.classList.remove('card-right');
                        activeRight.classList.add('card-left');
                    }
                } else if (this.classList.contains('card-right')) {
                    // Click right card: right becomes center, center becomes left, left becomes right
                    if (activeRight) {
                        activeRight.classList.remove('card-right');
                        activeRight.classList.add('card-center');
                    }
                    if (activeCenter) {
                        activeCenter.classList.remove('card-center');
                        activeCenter.classList.add('card-left');
                    }
                    if (activeLeft) {
                        activeLeft.classList.remove('card-left');
                        activeLeft.classList.add('card-right');
                    }
                }
            });
        });
    }
    const submitBtn = document.getElementById('submit-rsvp');
    const rsvpForm = document.getElementById('rsvp-form');
    const thankYouMsg = document.getElementById('rsvp-thank-you');
    const guestNameInput = document.getElementById('guest-name-input');
    const attendanceStatus = document.getElementById('attendance-status');
    const guestCodeInput = document.getElementById('guest-code');

    function checkForm() {
        const name = guestNameInput.value.trim();
        const status = attendanceStatus.value;
        const code = guestCodeInput.value.trim();

        if (name && status && code) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    if (submitBtn) {
        // Initial state
        submitBtn.disabled = true;

        // Listen for changes
        guestNameInput.addEventListener('input', checkForm);
        attendanceStatus.addEventListener('change', checkForm);
        guestCodeInput.addEventListener('input', checkForm);

        submitBtn.addEventListener('click', function () {
            const name = guestNameInput.value;
            const status = attendanceStatus.value;

            // Optional: add a small loading effect
            submitBtn.innerHTML = "Mengirim...";
            submitBtn.disabled = true;

            setTimeout(() => {
                // Hide form
                rsvpForm.style.display = 'none';

                // Show thank you message
                thankYouMsg.style.display = 'block';

                if (status === 'hadir') {
                    thankYouMsg.innerHTML = `
                        <div style="font-size: 24px; margin-bottom: 10px;">✨</div>
                        Terima kasih <strong>${name}</strong>!<br>
                        Kami sangat senang Anda bisa hadir di hari bahagia kami. Sampai jumpa di lokasi!
                    `;
                } else {
                    thankYouMsg.innerHTML = `
                        <div style="font-size: 24px; margin-bottom: 10px;">🙏</div>
                        Terima kasih <strong>${name}</strong>.<br>
                        Kami mengerti Anda tidak bisa hadir. Terima kasih atas doa restunya!
                    `;
                }
            }, 1000);
        });
    }

    // Wishes Form Logic
    const submitWishBtn = document.getElementById('submit-wish');
    const wishForm = document.getElementById('wish-form');
    const wishThankYou = document.getElementById('wish-thank-you');
    const wishNameInput = document.getElementById('wish-name');
    const wishMessageInput = document.getElementById('wish-message');

    function checkWishForm() {
        const name = wishNameInput.value.trim();
        const message = wishMessageInput.value.trim();

        if (name && message) {
            submitWishBtn.disabled = false;
        } else {
            submitWishBtn.disabled = true;
        }
    }

    if (submitWishBtn) {
        submitWishBtn.disabled = true;
        wishNameInput.addEventListener('input', checkWishForm);
        wishMessageInput.addEventListener('input', checkWishForm);

        submitWishBtn.addEventListener('click', function () {
            submitWishBtn.innerHTML = "Mengirim...";
            submitWishBtn.disabled = true;

            setTimeout(() => {
                wishForm.style.display = 'none';
                wishThankYou.style.display = 'block';
                console.log("Wish sent:", wishNameInput.value, wishMessageInput.value);
            }, 1000);
        });
    }

    // Handle Opening Invitation
    const btnOpen = document.getElementById('btn-open-invitation');
    const phoneContainer = document.querySelector('.phone-container');
    const appScreen = document.querySelector('.mock-app-screen');
    const floatingUI = document.getElementById('floating-ui');
    const btnMusic = document.getElementById('btn-music');
    const bgMusic = document.getElementById('bg-music');
    let isPlaying = false;

    // Function to update UI based on music state
    function updateMusicUI() {
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        if (!playIcon || !pauseIcon) return;

        if (bgMusic.paused) {
            btnMusic.classList.remove('music-playing');
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            btnMusic.classList.add('music-playing');
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    if (bgMusic) {
        bgMusic.addEventListener('play', updateMusicUI);
        bgMusic.addEventListener('pause', updateMusicUI);
        bgMusic.addEventListener('playing', updateMusicUI);
        // Sinkronkan ikon dengan state lagu yang sebenarnya sejak awal.
        updateMusicUI();
    }

    if (btnOpen) {
        btnOpen.onclick = function () {
            console.log("Button Open Clicked");

            if (appScreen) appScreen.classList.add('reveal-content');

            setTimeout(() => {
                document.body.style.overflow = 'auto';
                if (phoneContainer) phoneContainer.style.overflowY = 'auto';
            }, 1000);

            if (floatingUI) floatingUI.style.display = 'block';
            if (bgMusic) {
                bgMusic.play().catch(err => console.log("Auto-play blocked"));
                updateMusicUI();
            }
        };
    }

    if (btnMusic && bgMusic) {
        btnMusic.addEventListener('click', function () {
            if (bgMusic.paused) {
                bgMusic.play();
            } else {
                bgMusic.pause();
            }
        });
    }
});
