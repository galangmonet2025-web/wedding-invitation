// Copy to Clipboard Function
window.copyToClipboard = function(elementId, btn) {
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

// Set the date we're counting down to
const countDownDate = new Date("Dec 31, 2026 00:00:00").getTime();

// Update the count down every 1 second
const x = setInterval(function() {

    // Get today's date and time
    const now = new Date().getTime();

    // Find the distance between now and the count down date
    const distance = countDownDate - now;

    // Time calculations for days, hours, minutes and seconds
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Output the result in elements
    const daysEl = document.getElementById("days");
    const hoursEl = document.getElementById("hours");
    const minutesEl = document.getElementById("minutes");
    const secondsEl = document.getElementById("seconds");
    const countdownEl = document.getElementById("countdown");

    if (daysEl) daysEl.innerHTML = days.toString().padStart(2, '0');
    if (hoursEl) hoursEl.innerHTML = hours.toString().padStart(2, '0');
    if (minutesEl) minutesEl.innerHTML = minutes.toString().padStart(2, '0');
    if (secondsEl) secondsEl.innerHTML = seconds.toString().padStart(2, '0');

    // If the count down is over, write some text 
    if (distance < 0) {
        clearInterval(x);
        if (countdownEl) countdownEl.innerHTML = "ACARA SEDANG BERLANGSUNG";
    }
}, 1000);

// RSVP Form Logic
document.addEventListener('DOMContentLoaded', function() {
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

        submitBtn.addEventListener('click', function() {
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

        submitWishBtn.addEventListener('click', function() {
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
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        } else {
            btnMusic.classList.add('music-playing');
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }
    }

    if (bgMusic) {
        bgMusic.addEventListener('play', updateMusicUI);
        bgMusic.addEventListener('pause', updateMusicUI);
        bgMusic.addEventListener('playing', updateMusicUI);
    }

    if (btnOpen) {
        btnOpen.onclick = function() {
            console.log("Button Open Clicked");
            
            if (appScreen) appScreen.classList.add('reveal-content');

            setTimeout(() => {
                document.body.style.overflow = 'auto';
                if (phoneContainer) phoneContainer.style.overflowY = 'auto';
            }, 1000);

            if (floatingUI) floatingUI.style.display = 'block';
            if (bgMusic) {
                bgMusic.play().catch(err => console.log("Auto-play blocked"));
            }
        };
    }

    if (btnMusic && bgMusic) {
        btnMusic.addEventListener('click', function() {
            if (bgMusic.paused) {
                bgMusic.play();
            } else {
                bgMusic.pause();
            }
        });
    }
});
