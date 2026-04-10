export const PREMIUM_THEME_PAYLOAD = {
    name: "Premium Emas",
    plan_type: "premium",
    flag_draft: false,
    image_types: ["hero_cover", "groom_photo", "bride_photo", "background", "closing", "story_photo", "gallery"],
    css_template: `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@200;300;400;500&family=Dancing+Script:wght@600;700&display=swap');


/* ── VARIABLES ── */
:root {
  --cream: #f9f4ed;
  --cream-dark: #efe6d5;
  --cream-mid: #f5ede0;
  --brown: #3d2a1e;
  --brown-mid: #6b4631;
  --brown-light: #9e7560;
  --gold: #c9954c;
  --gold-light: #e8c07a;
  --gold-pale: #f5e4c1;
  --rose: #d4857a;
  --sage: #8a9f7e;
  --dark: #1a1008;
  --white: #ffffff;

  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-script: 'Dancing Script', cursive;
  --font-body: 'Jost', sans-serif;

  --phone-w: 600px;
  --radius: 16px;
  --shadow: 0 8px 40px rgba(61, 42, 30, 0.12);
  --shadow-lg: 0 16px 60px rgba(61, 42, 30, 0.18);
}

/* ── RESET & BASE ── */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-body);
  background: #e8ddd0;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  overflow-x: hidden;
}

/* ── PHONE WRAPPER ── */
#theme-cover,
#content-body {
  width: 100%;
  max-width: var(--phone-w);
  min-height: 100vh;
  background: var(--cream);
  position: relative;
  overflow-x: hidden;
}

/* Desktop centering wrapper effect */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background: #c4b59e;
  background-image:
    repeating-linear-gradient(45deg,
      transparent,
      transparent 20px,
      rgba(255, 255, 255, 0.05) 20px,
      rgba(255, 255, 255, 0.05) 40px);
  z-index: -1;
}

/* ── UTILITY ── */
.hidden {
  display: none !important;
}

.section {
  padding: 64px 24px;
  position: relative;
  overflow: hidden;
}

/* ════════════════════════════════════════════
   WELCOME SCREEN
════════════════════════════════════════════ */
#theme-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(160deg, #3d2a1e 0%, #6b3e26 40%, #3d2a1e 100%);
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  animation: welcomeFadeIn 1s ease forwards;
}

@keyframes welcomeFadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.welcome-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

/* Animated petals on welcome */
.petal {
  position: absolute;
  width: 12px;
  height: 18px;
  background: rgba(201, 149, 76, 0.25);
  border-radius: 50% 0 50% 0;
  animation: petalFall linear infinite;
}

.petal-1 {
  left: 10%;
  animation-duration: 6s;
  animation-delay: 0s;
}

.petal-2 {
  left: 25%;
  animation-duration: 8s;
  animation-delay: 1s;
  width: 8px;
  height: 12px;
}

.petal-3 {
  left: 50%;
  animation-duration: 7s;
  animation-delay: 2s;
  background: rgba(212, 133, 122, 0.2);
}

.petal-4 {
  left: 70%;
  animation-duration: 9s;
  animation-delay: 0.5s;
  width: 10px;
  height: 16px;
}

.petal-5 {
  left: 85%;
  animation-duration: 6.5s;
  animation-delay: 1.5s;
  background: rgba(201, 149, 76, 0.15);
}

.petal-6 {
  left: 40%;
  animation-duration: 8.5s;
  animation-delay: 3s;
  width: 6px;
  height: 10px;
}

@keyframes petalFall {
  0% {
    transform: translateY(-20px) rotate(0deg);
    opacity: 1;
  }

  100% {
    transform: translateY(110vh) rotate(360deg);
    opacity: 0;
  }
}

.welcome-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 32px;
  gap: 16px;
  animation: welcomeSlideUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes welcomeSlideUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.welcome-ornament {
  width: 120px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  position: relative;
}

.welcome-ornament::before {
  content: '✦';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  color: var(--gold);
  font-size: 14px;
  top: -10px;
}

.welcome-ornament.bottom::before {
  top: auto;
  bottom: -10px;
}

.welcome-yth {
  font-family: var(--font-body);
  font-weight: 300;
  font-size: 12px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--gold-light);
  margin-top: 8px;
}

.welcome-guest-name {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 400;
  color: var(--white);
  line-height: 1.2;
}

.welcome-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  max-width: 260px;
  line-height: 1.6;
}

.welcome-couple-preview {
  align-items: center;
  .welcome-amp{
    display:block;
  }
}

.script-name {
  font-family: var(--font-script);
  font-size: 40px;
  color: var(--gold-light);
  line-height: 1;
}

.welcome-amp {
  font-family: var(--font-display);
  font-size: 24px;
  color: var(--gold);
  font-style: italic;
}

.welcome-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 260px;
  margin-top: 8px;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
  color: var(--dark);
  border: none;
  border-radius: 50px;
  padding: 14px 28px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(201, 149, 76, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(201, 149, 76, 0.5);
}

.btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: transparent;
  color: var(--gold-light);
  border: 1px solid rgba(201, 149, 76, 0.4);
  border-radius: 50px;
  padding: 12px 24px;
  font-family: var(--font-body);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-ghost:hover {
  background: rgba(201, 149, 76, 0.1);
  border-color: var(--gold);
}

/* ════════════════════════════════════════════
   SECTION HEADER
════════════════════════════════════════════ */
.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-label {
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 8px;
}

.section-label.light {
  color: var(--gold-light);
}

.section-title {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 400;
  color: var(--brown);
  line-height: 1.1;
}

.section-title.light {
  color: var(--white);
}

.title-ornament {
  color: var(--gold);
  font-size: 12px;
  margin-top: 12px;
  display: block;
  letter-spacing: 0.5em;
}

.title-ornament.light {
  color: var(--gold-light);
}

/* ════════════════════════════════════════════
   SECTION 1: HERO
════════════════════════════════════════════ */
.hero-section {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  background: linear-gradient(170deg, #3d2a1e 0%, #5c3520 50%, #3d2a1e 100%);
}

.hero-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 40%, rgba(201, 149, 76, 0.15) 0%, transparent 70%);
}

.petals-container {
  position: absolute;
  inset: 0;
}

.fp {
  position: absolute;
  border-radius: 50% 0 50% 0;
  opacity: 0;
  animation: floatPetal linear infinite;
}

.fp1 {
  width: 10px;
  height: 14px;
  background: rgba(201, 149, 76, 0.3);
  left: 5%;
  animation-duration: 7s;
  animation-delay: 0s;
  top: -20px;
}

.fp2 {
  width: 7px;
  height: 10px;
  background: rgba(212, 133, 122, 0.25);
  left: 20%;
  animation-duration: 9s;
  animation-delay: 1s;
  top: -20px;
}

.fp3 {
  width: 12px;
  height: 16px;
  background: rgba(201, 149, 76, 0.2);
  left: 40%;
  animation-duration: 8s;
  animation-delay: 2s;
  top: -20px;
}

.fp4 {
  width: 8px;
  height: 12px;
  background: rgba(212, 133, 122, 0.3);
  left: 60%;
  animation-duration: 6s;
  animation-delay: 0.5s;
  top: -20px;
}

.fp5 {
  width: 10px;
  height: 14px;
  background: rgba(201, 149, 76, 0.25);
  left: 75%;
  animation-duration: 10s;
  animation-delay: 1.5s;
  top: -20px;
}

.fp6 {
  width: 6px;
  height: 9px;
  background: rgba(212, 133, 122, 0.2);
  left: 88%;
  animation-duration: 7.5s;
  animation-delay: 3s;
  top: -20px;
}

.fp7 {
  width: 9px;
  height: 13px;
  background: rgba(201, 149, 76, 0.35);
  left: 30%;
  animation-duration: 8.5s;
  animation-delay: 4s;
  top: -20px;
}

.fp8 {
  width: 11px;
  height: 15px;
  background: rgba(212, 133, 122, 0.25);
  left: 55%;
  animation-duration: 9.5s;
  animation-delay: 2.5s;
  top: -20px;
}

@keyframes floatPetal {
  0% {
    transform: translateY(0) rotate(0deg) translateX(0);
    opacity: 0;
  }

  5% {
    opacity: 1;
  }

  95% {
    opacity: 1;
  }

  100% {
    transform: translateY(110vh) rotate(400deg) translateX(30px);
    opacity: 0;
  }
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.hero-label {
  font-size: 11px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--gold-light);
  font-weight: 300;
}

.hero-names {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.hero-name-main {
  font-family: var(--font-script);
  font-size: 72px;
  color: var(--white);
  line-height: 1;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
}

.hero-amp {
  font-family: var(--font-display);
  font-size: 28px;
  color: var(--gold);
  font-style: italic;
  display: block;
  margin: -8px 0;
}

.hero-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 200px;
}

.div-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}

.div-flower {
  color: var(--gold);
  font-size: 12px;
}

.hero-date {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--gold-light);
  font-weight: 300;
  letter-spacing: 0.05em;
}

.hero-quote {
  font-family: var(--font-display);
  font-size: 14px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.7;
  max-width: 300px;
  margin-top: 8px;
}

.hero-quran {
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--gold);
}

/* Scroll hint */
.scroll-hint {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 2;
  animation: fadeIn 2s ease 1.5s both;
}

.scroll-dot {
  width: 6px;
  height: 6px;
  background: var(--gold);
  border-radius: 50%;
  animation: scrollBounce 1.5s ease-in-out infinite;
}

@keyframes scrollBounce {

  0%,
  100% {
    transform: translateY(0);
    opacity: 1;
  }

  50% {
    transform: translateY(10px);
    opacity: 0.4;
  }
}

.scroll-text {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

/* ════════════════════════════════════════════
   SECTION 2: COUPLE
════════════════════════════════════════════ */
.couple-section {
  background: var(--cream);
}

.couple-cards {
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: center;
}

.couple-card {
  width: 100%;
  background: var(--white);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding-bottom: 28px;
}

.couple-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
}

.connector-amp {
  font-family: var(--font-script);
  font-size: 48px;
  color: var(--gold);
}

.connector-line {
  width: 1px;
  height: 0;
  background: var(--gold);
  display: none;
}

.couple-photo {
  width: 100%;
  height: 220px;
  position: relative;
  overflow: hidden;
}

.bride-photo {
  background: linear-gradient(135deg, #f5e4d0 0%, #e8c9a8 100%);
}

.groom-photo {
  background: linear-gradient(135deg, #d4e4d0 0%, #b8c9b0 100%);
}

.photo-frame {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--brown-light);
  opacity: 0.7;
  font-size: 11px;
  letter-spacing: 0.1em;
}

.rose-decor {
  position: absolute;
  bottom: -10px;
  left: -10px;
  width: 80px;
  height: 80px;
  background: radial-gradient(circle at center, rgba(212, 133, 122, 0.3), transparent 70%);
  border-radius: 50%;
}

.rose-right {
  left: auto;
  right: -10px;
}

.couple-info {
  padding: 24px 24px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.couple-role {
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--gold);
}

.couple-name {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--brown);
  line-height: 1.2;
}

.couple-parents {
  font-size: 13px;
  color: var(--brown-light);
  line-height: 1.7;
}

.couple-parents strong {
  color: var(--brown-mid);
}

.couple-socmed {
  margin-top: 4px;
}

.socmed-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--brown-light);
  text-decoration: none;
  border: 1px solid var(--cream-dark);
  border-radius: 50px;
  padding: 6px 14px;
  transition: all 0.2s;
}

.socmed-link:hover {
  text-decoration: none;
  border-color: var(--gold);
  color: var(--gold);
}

.socmed-link svg rect {
  fill: var(--rose);
}

/* ════════════════════════════════════════════
   SECTION: COUNTDOWN + RSVP
════════════════════════════════════════════ */
.countdown-rsvp-section {
  background: linear-gradient(160deg, #3d2a1e 0%, #5c3520 100%);
  text-align: center;
  padding: 64px 24px;
}

.cr-bg {
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9954c' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.cr-content {
  position: relative;
  z-index: 2;
}

.countdown-boxes {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 32px 0;
}

.cd-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(201, 149, 76, 0.2);
  border-radius: 12px;
  padding: 16px 12px;
  min-width: 64px;
  backdrop-filter: blur(4px);
}

.cd-num {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 600;
  color: var(--gold-light);
  line-height: 1;
  transition: transform 0.2s;
}

.cd-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.cd-sep {
  font-family: var(--font-display);
  font-size: 28px;
  color: var(--gold);
  line-height: 1;
  margin-bottom: 16px;
}

/* RSVP */
.rsvp-card {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(201, 149, 76, 0.2);
  border-radius: var(--radius);
  padding: 28px 24px;
  margin-top: 32px;
  backdrop-filter: blur(8px);
}

.rsvp-title {
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--white);
  font-weight: 400;
  margin-bottom: 20px;
}

.rsvp-form {
  display: flex;
  flex-direction: column;
  gap: 12px;

  label{
    text-align: left;
    color: white;
    margin-bottom: -10px;
  }
}

.rsvp-input,
.rsvp-select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(201, 149, 76, 0.3);
  border-radius: 8px;
  padding: 12px 16px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--white);
  outline: none;
  transition: border-color 0.2s;
  -webkit-appearance: none;
  appearance: none;
}

.rsvp-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.rsvp-select option {
  background: var(--brown);
  color: var(--white);
}

.rsvp-input:focus,
.rsvp-select:focus {
  border-color: var(--gold);
}

.btn-rsvp {
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
  color: var(--dark);
  border: none;
  border-radius: 8px;
  padding: 13px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 4px;
}

.btn-rsvp:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(201, 149, 76, 0.4);
}

.rsvp-thanks {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  animation: fadeIn 0.5s ease;
}

/* ════════════════════════════════════════════
   SECTION 3: VENUE
════════════════════════════════════════════ */
.venue-section {
  background: var(--cream-mid);
}

.venue-events {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.venue-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 28px 24px;
  box-shadow: var(--shadow);
  text-align: center;
  border-top: 3px solid var(--gold);
  transition: transform 0.3s;
}

.venue-card:hover {
  transform: translateY(-2px);
}

.venue-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.venue-event-name {
  font-family: var(--font-display);
  font-size: 24px;
  color: var(--brown);
  margin-bottom: 8px;
}

.venue-datetime,
.venue-time {
  font-size: 13px;
  color: var(--brown-light);
}

.venue-time {
  font-weight: 500;
  color: var(--gold);
}

.venue-divider {
  width: 40px;
  height: 1px;
  background: var(--gold-pale);
  margin: 16px auto;
}

.venue-place {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--brown-mid);
  font-weight: 600;
}

.venue-address {
  font-size: 13px;
  color: var(--brown-light);
  line-height: 1.6;
  margin: 8px 0 16px;
}

.btn-map {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--gold);
  border: 1px solid var(--gold);
  border-radius: 50px;
  padding: 8px 20px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-map:hover {
  background: var(--gold);
  color: var(--white);
}

/* ════════════════════════════════════════════
   SECTION 4: LIVE STREAMING
════════════════════════════════════════════ */
.live-section {
  background: linear-gradient(160deg, #1a1008 0%, #3d2a1e 100%);
  text-align: center;
  padding: 64px 24px;
}

.live-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(201, 149, 76, 0.1) 0%, transparent 70%);
}

.live-content {
  position: relative;
  z-index: 2;
}

.live-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.7;
  margin: 0 auto 28px;
  max-width: 320px;
}

.live-embed {
  border-radius: var(--radius);
  overflow: hidden;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(201, 149, 76, 0.2);
  margin-bottom: 24px;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.live-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
}

.live-placeholder strong {
  color: var(--gold-light);
}

.live-pulse {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(201, 149, 76, 0.1);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.live-pulse::before,
.live-pulse::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(201, 149, 76, 0.3);
  animation: pulsing 2s ease-out infinite;
}

.live-pulse::before {
  width: 80px;
  height: 80px;
  animation-delay: 0s;
}

.live-pulse::after {
  width: 100px;
  height: 100px;
  animation-delay: 0.5s;
}

@keyframes pulsing {
  0% {
    opacity: 1;
    transform: scale(0.8);
  }

  100% {
    opacity: 0;
    transform: scale(1.2);
  }
}

.btn-live {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ff0000;
  color: var(--white);
  text-decoration: none;
  border-radius: 50px;
  padding: 12px 24px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-live:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 0, 0, 0.3);
}

/* ════════════════════════════════════════════
   SECTION 5: STORY TIMELINE
════════════════════════════════════════════ */
.story-section {
  background: var(--cream);
}

.timeline {
  position: relative;
  /* padding: 0 16px; */
}

.timeline::before {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(to bottom, transparent, var(--gold-pale), var(--gold), var(--gold-pale), transparent);
}

.timeline-item {
  position: relative;
  width: 50%;
  padding: 0 24px 40px;
}

.timeline-item.left {
  left: 0;
  text-align: right;
  padding-left: 0px;
  
}

.timeline-item.right {
  left: 50%;
  text-align: left;
  padding-right: 0px;
}

.timeline-dot {
  position: absolute;
  top: 4px;
  width: 10px;
  height: 10px;
  background: var(--cream-dark);
  border: 2px solid var(--gold);
  border-radius: 50%;
}

.timeline-item.left .timeline-dot {
  right: -5px;
}

.timeline-item.right .timeline-dot {
  left: -5px;
}

.gold-dot {
  background: var(--gold) !important;
  box-shadow: 0 0 0 4px rgba(201, 149, 76, 0.2);
  width: 14px !important;
  height: 14px !important;
}

.timeline-item.left .gold-dot {
  right: -7px !important;
}

.timeline-item.right .gold-dot {
  left: -7px !important;
}

.timeline-content {
  background: var(--white);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(61, 42, 30, 0.08);
  border: 1px solid var(--cream-dark);
}

.gold-content {
  border-color: var(--gold-pale);
  background: linear-gradient(135deg, #fff9f0, #fff);
}

.tl-year {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2em;
  color: var(--gold);
  text-transform: uppercase;
}

.tl-title {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--brown);
  margin: 4px 0 6px;
}

.tl-text {
  font-size: 12px;
  color: var(--brown-light);
  line-height: 1.6;
}

/* ════════════════════════════════════════════
   SECTION 6: GALLERY
════════════════════════════════════════════ */
.gallery-section {
  background: var(--cream-mid);
}

.gallery-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.gallery-item {
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  aspect-ratio: 1;
  transition: transform 0.3s;
}

.gallery-item:hover {
  transform: scale(0.98);
}

.gallery-item.span2 {
  grid-column: span 2;
  aspect-ratio: 2/1;
}

.gallery-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  position: relative;
}

.gallery-placeholder {
  background: linear-gradient(135deg, #c9954c, #9e7560);
}

.gallery-placeholder.g2 {
  background: linear-gradient(135deg, #9e7560, #6b4631);
}

.gallery-placeholder.g3 {
  background: linear-gradient(135deg, #8a9f7e, #6b7e5e);
}

.gallery-placeholder.g4 {
  background: linear-gradient(135deg, #d4857a, #b86b60);
}

.gallery-placeholder.g5 {
  background: linear-gradient(135deg, #3d2a1e, #6b4631);
}

.gallery-placeholder.g6 {
  background: linear-gradient(135deg, #c9954c, #d4857a);
}

.gallery-overlay-hint {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  opacity: 0;
}

.gallery-item:hover .gallery-overlay-hint {
  background: rgba(0, 0, 0, 0.3);
  opacity: 1;
}

/* ════════════════════════════════════════════
   SECTION 7: WISHES
════════════════════════════════════════════ */
.wishes-section {
  background: var(--cream);
}

.wish-form-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 28px;
}

.wish-input,
.wish-textarea {
  border: 1px solid var(--cream-dark);
  border-radius: 8px;
  padding: 12px 16px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--brown);
  background: var(--cream);
  outline: none;
  transition: border-color 0.2s;
  resize: none;
}

.wish-input:focus,
.wish-textarea:focus {
  border-color: var(--gold);
}

.wish-input::placeholder,
.wish-textarea::placeholder {
  color: var(--brown-light);
  opacity: 0.6;
}

.btn-wish {
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
  color: var(--dark);
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-wish:hover {
  transform: translateY(-1px);
}

.wish-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 440px;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding-right: 4px;
}

.wish-list::-webkit-scrollbar {
  width: 4px;
}

.wish-list::-webkit-scrollbar-track {
  background: var(--cream-dark);
  border-radius: 4px;
}

.wish-list::-webkit-scrollbar-thumb {
  background: var(--gold);
  border-radius: 4px;
}

.wish-item {
  background: var(--white);
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: 0 2px 10px rgba(61, 42, 30, 0.06);
  border-left: 3px solid var(--gold-pale);
  animation: wishFadeIn 0.4s ease;
}

@keyframes wishFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.wish-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--brown);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.wish-item-name::before {
  content: '✦';
  color: var(--gold);
  font-size: 10px;
}

.wish-item-text {
  font-size: 13px;
  color: var(--brown-light);
  line-height: 1.6;
  font-style: italic;
}

.wish-item-time {
  font-size: 10px;
  color: var(--brown-light);
  opacity: 0.5;
  margin-top: 6px;
}

/* ════════════════════════════════════════════
   SECTION 8: GIFT
════════════════════════════════════════════ */
.gift-section {
  background: var(--cream-mid);
}

.gift-desc {
  font-size: 13px;
  color: var(--brown-light);
  line-height: 1.7;
  text-align: center;
  margin-bottom: 28px;
}

.gift-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gift-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  text-align: center;
  border-top: 2px solid var(--gold);
}

.address-card {
  border-top-color: var(--rose);
}

.gift-bank-logo {
  font-size: 28px;
  margin-bottom: 12px;
}

.gift-bank-name {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--brown);
  margin-bottom: 8px;
}

.gift-account {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 600;
  color: var(--brown-mid);
  letter-spacing: 0.1em;
  margin: 8px 0;
}

.gift-holder {
  font-size: 12px;
  color: var(--brown-light);
  margin-bottom: 16px;
}

.gift-address {
  font-size: 13px;
  color: var(--brown-light);
  line-height: 1.7;
  margin: 8px 0;
}

.gift-contact {
  font-size: 13px;
  color: var(--brown-light);
  margin-bottom: 0;
}

.btn-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--cream);
  color: var(--brown-mid);
  border: 1px solid var(--cream-dark);
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy:hover {
  border-color: var(--gold);
  color: var(--gold);
}

.btn-copy.copied {
  background: var(--gold);
  color: var(--white);
  border-color: var(--gold);
}

/* ════════════════════════════════════════════
   SECTION 9: CLOSING
════════════════════════════════════════════ */
.closing-section {
  background: linear-gradient(160deg, #3d2a1e 0%, #5c3520 60%, #3d2a1e 100%);
  text-align: center;
  padding: 80px 24px;
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.closing-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.cp {
  position: absolute;
  border-radius: 50% 0 50% 0;
  animation: petalFall linear infinite;
}

.cp1 {
  width: 10px;
  height: 14px;
  background: rgba(201, 149, 76, 0.2);
  left: 8%;
  animation-duration: 8s;
  animation-delay: 0s;
  top: -20px;
}

.cp2 {
  width: 8px;
  height: 11px;
  background: rgba(212, 133, 122, 0.2);
  left: 30%;
  animation-duration: 10s;
  animation-delay: 2s;
  top: -20px;
}

.cp3 {
  width: 12px;
  height: 16px;
  background: rgba(201, 149, 76, 0.15);
  left: 55%;
  animation-duration: 7s;
  animation-delay: 1s;
  top: -20px;
}

.cp4 {
  width: 7px;
  height: 10px;
  background: rgba(212, 133, 122, 0.2);
  left: 75%;
  animation-duration: 9s;
  animation-delay: 3s;
  top: -20px;
}

.cp5 {
  width: 9px;
  height: 13px;
  background: rgba(201, 149, 76, 0.25);
  left: 90%;
  animation-duration: 8.5s;
  animation-delay: 1.5s;
  top: -20px;
}

.closing-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.closing-ornament {
  width: 60px;
  height: 60px;
  border: 1px solid rgba(201, 149, 76, 0.3);
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.closing-ornament::before {
  content: '✦';
  color: var(--gold);
  font-size: 20px;
}

.closing-bismillah {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  color: var(--gold-light);
  font-style: italic;
}

.closing-names {
  font-family: var(--font-script);
  font-size: 52px;
  color: var(--white);
  line-height: 1;
}

.closing-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.8;
  max-width: 320px;
}

.closing-sign {
  font-family: var(--font-display);
  font-size: 15px;
  font-style: italic;
  color: var(--gold-light);
}

.closing-footer {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.7;
  text-align: center;
}

.closing-family {
  color: rgba(255, 255, 255, 0.7);
}

/* ════════════════════════════════════════════
   FLOATING BUTTONS
════════════════════════════════════════════ */
#float-scroll-up {
  position: fixed;
  bottom: 24px;
  left: calc(50% - var(--phone-w)/2 + 16px);
  z-index: 50;
  width: 44px;
  height: 44px;
  background: var(--white);
  border: 1px solid var(--cream-dark);
  border-radius: 50%;
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--brown-mid);
  transition: all 0.3s;
  animation: fadeIn 0.3s ease;
}

#float-scroll-up:hover {
  background: var(--gold);
  color: var(--white);
  border-color: var(--gold);
  transform: translateY(-2px);
}

@media (max-width: 430px) {
  #float-scroll-up {
    left: 16px;
  }

  #float-toolbar {
    right: 16px;
  }
}

.float-toolbar {
  position: fixed;
  top: 24px;
  right: calc(50% - var(--phone-w)/2 + 16px);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.float-icon-btn {
  width: 40px;
  height: 40px;
  background: rgba(61, 42, 30, 0.85);
  border: 1px solid rgba(201, 149, 76, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--gold-light);
  backdrop-filter: blur(8px);
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.float-icon-btn:hover {
  background: var(--gold);
  color: var(--dark);
  border-color: var(--gold);
  transform: scale(1.1);
}

/* ════════════════════════════════════════════
   OVERLAYS
════════════════════════════════════════════ */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  animation: overlayIn 0.2s ease;
}

@keyframes overlayIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.overlay-panel {
  background: var(--cream);
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: var(--phone-w);
  max-height: 85vh;
  overflow-y: auto;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 0 0 32px;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }

  to {
    transform: translateY(0);
  }
}

.overlay-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--cream-dark);
  position: sticky;
  top: 0;
  background: var(--cream);
  z-index: 1;
}

.overlay-header h3 {
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--brown);
}

.overlay-close {
  background: var(--cream-dark);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--brown);
  cursor: pointer;
  transition: all 0.2s;
}

.overlay-close:hover {
  background: var(--rose);
  color: var(--white);
}

/* Menu nav */
.menu-nav {
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  font-size: 15px;
  color: var(--brown-mid);
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.2s;
  border-bottom: 1px solid var(--cream-dark);
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: var(--gold-pale);
  color: var(--brown);
}

/* QR Panel */
.qr-panel {
  border-radius: 24px 24px 0 0;
  padding-bottom: 40px;
}

.qr-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
}

.qr-code-box {
  background: var(--white);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow);
  border: 1px solid var(--cream-dark);
}

.qr-label {
  font-size: 13px;
  color: var(--brown-light);
}

.qr-url {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--brown);
  font-weight: 600;
}

.qr-info {
  font-size: 12px;
  color: var(--gold);
  letter-spacing: 0.1em;
}

/* Lightbox */
.lightbox-panel {
  background: #000;
  width: 100%;
  max-width: var(--phone-w);
  max-height: 90vh;
  border-radius: 24px 24px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.2) !important;
  color: var(--white) !important;
}

.lightbox-img-wrap {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 16px 16px;
}

.lightbox-placeholder {
  width: 100%;
  aspect-ratio: 4/3;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--font-display);
}

.lightbox-placeholder {
  background: linear-gradient(135deg, #c9954c, #9e7560);
}

.lightbox-nav {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  width: 100%;
  justify-content: center;
}

.lightbox-nav button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: var(--white);
  font-size: 28px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  line-height: 1;
}

.lightbox-nav button:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ════════════════════════════════════════════
   ANIMATIONS
════════════════════════════════════════════ */
.reveal,
.reveal-delay-1,
.reveal-delay-2,
.reveal-delay-3,
.reveal-delay-4 {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.8s ease, transform 0.8s ease;
}

.reveal-delay-1 {
  transition-delay: 0.2s;
}

.reveal-delay-2 {
  transition-delay: 0.4s;
}

.reveal-delay-3 {
  transition-delay: 0.6s;
}

.reveal-delay-4 {
  transition-delay: 0.8s;
}

.revealed {
  opacity: 1 !important;
  transform: translateY(0) !important;
}

.reveal-card {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.7s ease, transform 0.7s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* ════════════════════════════════════════════
   RESPONSIVE MOBILE
════════════════════════════════════════════ */
@media (max-width: 430px) {
  :root {
    --phone-w: 100vw;
  }

  #float-scroll-up {
    left: 16px;
  }

  .float-toolbar {
    right: 16px;
  }
}

/* scroll bounce for cd-num */
.cd-bounce {
  animation: cdBounce 0.15s ease;
}

@keyframes cdBounce {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.15);
  }

  100% {
    transform: scale(1);
  }
}


/* Floating Navigation & FAB Styles */
#theme-fab-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1001;
  /* Higher than system buttons */
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
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-btn:hover {
  transform: scale(1.1) translateY(-2px);
  background: #D4AF37;
  color: white;
}

.fab-btn i {
  pointer-events: none;
  /* Ensure click goes to div */
}
`,
    js_template: `
    

'use strict';

// ── CONSTANTS ──
const WEDDING_DATE = new Date('2025-06-14T08:00:00');
const SECTION_4_ID = 'sec-live'; // floating back-scroll shows from sec 4 onwards

// Sections where the floating back-scroll appears
const LATE_SECTIONS = ['sec-live', 'sec-story', 'sec-gallery', 'sec-wishes', 'sec-gift', 'sec-closing'];

// Sample initial wishes
const INITIAL_WISHES = [
    { name: 'Aulia & Rizky', text: 'Selamat menempuh hidup baru! Semoga selalu bahagia, sabar dalam menghadapi ujian, dan diberi rezeki yang berlimpah. Aamiin 🌸', time: '2 jam yang lalu' },
    { name: 'Keluarga Santoso', text: 'Barakallahu lakuma wa baraka alaikuma wa jama\'a bainakuma fi khair. Semoga menjadi keluarga sakinah mawaddah warahmah.', time: '5 jam yang lalu' },
    { name: 'Teman Kampus', text: 'Congrats Rania & Daffa! Akhirnya kalian resmi juga hehe. Semoga langgeng sampai kakek-nenek ya! 💍', time: '1 hari yang lalu' },
    { name: 'Pak Budi & Bu Ani', text: 'Semoga pernikahan kalian menjadi ladang amal ibadah dan diridhai Allah SWT. Bahagia selalu!', time: '1 hari yang lalu' },
    { name: 'Dewi Rahayu', text: 'Selamat ya Rania! Kamu cantik banget di hari spesial ini. Semoga rumah tangganya penuh cinta dan berkah. 💕', time: '2 hari yang lalu' },
    { name: 'Ahmad Faris', text: 'Daffa, jaga Rania baik-baik ya! Semoga kalian selalu kompak dan dikaruniai keturunan yang saleh dan salehah.', time: '2 hari yang lalu' },
    { name: 'Komunitas Foto', text: 'Selamat berbahagia! Semoga pernikahan ini menjadi awal dari kisah yang indah dan penuh warna. Langgeng terus! 📸', time: '3 hari yang lalu' },
    { name: 'Ibu Sari', text: 'Semoga Allah memberkahi pernikahan kalian dan menjadikan rumah tangga yang sakinah. Doa terbaik dari kami sekeluarga!', time: '3 hari yang lalu' },
    { name: 'Bima & Nadia', text: 'Selamat menempuh hidup baru! Moga selalu bersama dalam suka dan duka, dan segera diberi momongan ya! 👶', time: '4 hari yang lalu' },
    { name: 'Kak Hendra', text: 'Alhamdulillah, akhirnya hari ini tiba. Semoga keluarga baru ini selalu dalam lindungan Allah. Aamiin.', time: '4 hari yang lalu' },
];

// ── DOM ELEMENTS ──
const welcomeScreen = document.getElementById('theme-cover');
const mainInvitation = document.getElementById('content-body');
const btnOpen = document.getElementById('btn-open-invitation');

const floatScrollUp = document.getElementById('float-scroll-up');
const floatToolbar = document.getElementById('float-toolbar');
const menuOverlay = document.getElementById('menu-overlay');
const closeMenu = document.getElementById('close-menu');
const qrOverlay = document.getElementById('qr-overlay');
const closeQr = document.getElementById('close-qr');
const lightbox = document.getElementById('lightbox');
const closeLightbox = document.getElementById('close-lightbox');

if (btnOpen) btnOpen.addEventListener('click', openInvitation);

// Check if already open (e.g., this is a rerun after React DOM update)
const isAlreadyOpened = document.querySelector('.is-opened');
if (isAlreadyOpened) {
    if (welcomeScreen) welcomeScreen.classList.add('hidden');
    if (mainInvitation) mainInvitation.classList.remove('hidden');
    if (floatToolbar) floatToolbar.classList.remove('hidden');
    initScrollObservers();
    setTimeout(() => {
        document.querySelectorAll('.reveal, .reveal-delay-1, .reveal-delay-2, .reveal-delay-3, .reveal-delay-4')
            .forEach(el => el.classList.add('revealed'));
    }, 100);
}

// ════════════════════════════════════════════
// WELCOME → OPEN INVITATION
// ════════════════════════════════════════════

function openInvitation() {
    if (welcomeScreen) {
        welcomeScreen.style.animation = 'none';
        welcomeScreen.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        welcomeScreen.style.opacity = '0';
        welcomeScreen.style.transform = 'translateX(-50%) scale(0.97)';
    }

    setTimeout(() => {
        if (welcomeScreen) welcomeScreen.classList.add('hidden');
        if (mainInvitation) mainInvitation.classList.remove('hidden');
        if (floatToolbar) floatToolbar.classList.remove('hidden');
        document.body.style.overflow = '';

        // start scroll observers
        initScrollObservers();
        // scroll to top
        window.scrollTo(0, 0);

        // Trigger hero animations
        setTimeout(() => {
            document.querySelectorAll('.reveal, .reveal-delay-1, .reveal-delay-2, .reveal-delay-3, .reveal-delay-4')
                .forEach(el => el.classList.add('revealed'));
        }, 300);
    }, 600);
}


// ════════════════════════════════════════════
// SCROLL OBSERVER – reveal animations & floating buttons
// ════════════════════════════════════════════
function initScrollObservers() {

    // Reveal cards
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, idx) => {
            if (entry.isIntersecting) {
                // stagger children
                const delay = (entry.target.dataset.delay || 0) * 100;
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, delay);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal-card').forEach((el, i) => {
        el.dataset.delay = i % 3;
        revealObserver.observe(el);
    });

    // Hero reveals (trigger on load since hero is first)
    setTimeout(() => {
        document.querySelectorAll('.reveal, .reveal-delay-1, .reveal-delay-2, .reveal-delay-3, .reveal-delay-4')
            .forEach(el => el.classList.add('revealed'));
    }, 400);

    
}

function shakeElement(el) {
    el.style.animation = 'none';
    el.style.transition = 'transform 0.1s';
    const shakes = ['-6px', '6px', '-4px', '4px', '0'];
    let i = 0;
    const interval = setInterval(() => {
        el.style.transform = "translateX(" + shakes[i] + ")";
        i++;
        if (i >= shakes.length) {
            clearInterval(interval);
            el.style.transform = '';
        }
    }, 60);
}



window.addEventListener('resize', positionFloatingButtons);
positionFloatingButtons();
`,
    html_template: `<!-- 
  <link rel="stylesheet" href="style.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /> -->
  <link
    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@200;300;400;500&family=Dancing+Script:wght@600;700&display=swap"
    rel="stylesheet" />

  <!-- ═══════════════════════════════════════════
       WELCOME PAGE
  ════════════════════════════════════════════ -->
  <div id="theme-cover">
    <div class="welcome-bg"> 
      <div class="petal petal-1"></div>
      <div class="petal petal-2"></div>
      <div class="petal petal-3"></div>
      <div class="petal petal-4"></div>
      <div class="petal petal-5"></div>
      <div class="petal petal-6"></div>
    </div>
    <div class="welcome-content">
      <div class="welcome-ornament top"></div>
      <p class="welcome-yth">Kepada Yth.</p>
      <h2 class="welcome-guest-name">{{ nama_tamu }}</h2>
      <p class="welcome-sub">Anda diundang untuk menyaksikan momen sakral pernikahan</p>
      <div class="welcome-couple-preview">
        <span class="script-name">{{groom_name}}</span>
        <span class="welcome-amp">&amp;</span>
        <span class="script-name">{{bride_name}}</span>
      </div>
      <div class="welcome-actions">
        <button id="btn-open-invitation" class="btn-primary" >
          <span>Buka Undangan</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <button class="btn-ghost" id="btn-show-qr">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><rect x="19" y="14" width="2" height="2" rx="0.5"/><rect x="14" y="19" width="2" height="2" rx="0.5"/><rect x="18" y="18" width="3" height="3" rx="0.5"/></svg>
          <span>QR Code</span>
        </button>
      </div>
      <div class="welcome-ornament bottom"></div>
    </div>
  </div>
  
  <!-- ═══════════════════════════════════════════
       MAIN INVITATION
  ════════════════════════════════════════════ -->
  <div id="content-body">
  
    <!-- SECTION 1: HERO -->
    <section id="sec-hero" class="section hero-section">
      <div class="hero-bg">
        <div class="hero-overlay"></div>
        <div class="petals-container">
          <div class="fp fp1"></div>
          <div class="fp fp2"></div>
          <div class="fp fp3"></div>
          <div class="fp fp4"></div>
          <div class="fp fp5"></div>
          <div class="fp fp6"></div>
          <div class="fp fp7"></div>
          <div class="fp fp8"></div>
        </div>
      </div>
      <div class="hero-content">
        <p class="hero-label reveal">The Wedding of</p>
        <h1 class="hero-names reveal-delay-1">
          <span class="hero-name-main">{{groom_name}}</span>
          <span class="hero-amp">&amp;</span>
          <span class="hero-name-main">{{bride_name}}</span>
        </h1>
        <div class="hero-divider reveal-delay-2">
          <span class="div-line"></span>
          <span class="div-flower">✦</span>
          <span class="div-line"></span>
        </div>
        <p class="hero-date reveal-delay-3">Sabtu, 14 Juni 2025</p>
        <p class="hero-quote reveal-delay-4">"Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu
          istri-istri dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya."</p>
        <p class="hero-quran reveal-delay-4">— QS. Ar-Rum: 21</p>
      </div>
      <div class="scroll-hint">
        <span class="scroll-dot"></span>
        <span class="scroll-text">Scroll ke bawah</span>
      </div>
    </section>
  
    <!-- SECTION 2: COUPLE INTRO -->
    <section id="sec-couple" class="section couple-section">
      <div class="section-header">
        <p class="section-label">Mempelai</p>
        <h2 class="section-title">Perkenalan Pasangan</h2>
        <div class="title-ornament">✦</div>
      </div>
      <div class="couple-cards">
        <!-- Mempelai Wanita -->
        <div class="couple-card reveal-card">
          <div class="couple-photo bride-photo">
            <div class="photo-frame">
              <!-- <div class="photo-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  <span>Foto Mempelai Wanita</span>
                </div> -->
              <img src="{{photo_bride_photo}}">
            </div>
            <div class="rose-decor"></div>
          </div>
          <div class="couple-info">
            <span class="couple-role">Mempelai Wanita</span>
            <h3 class="couple-name">{{bride_name}}</h3>
            <p class="couple-parents">Putri pertama dari<br/><strong>Bpk. {{nama_bapak_perempuan}}</strong> &amp;
              <strong>Ibu {{nama_ibu_perempuan}}</strong>
            </p>
            <div class="couple-socmed">
              <a class="socmed-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="white" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="white" stroke-width="2" />
                </svg>
                {{ig_perempuan}}
              </a>
            </div>
          </div>
        </div>
  
        <div class="couple-connector">
          <span class="connector-amp">&amp;</span>
          <div class="connector-line"></div>
        </div>
  
        <!-- Mempelai Pria -->
        <div class="couple-card reveal-card">
          <div class="couple-photo groom-photo">
            <div class="photo-frame">
              <!-- <div class="photo-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  <span>Foto Mempelai Pria</span>
                </div> -->
              <img src="{{photo_groom_photo}}">
            </div>
            <div class="rose-decor rose-right"></div>
          </div>
          <div class="couple-info">
            <span class="couple-role">Mempelai Pria</span>
            <h3 class="couple-name">{{groom_name}} Ardiansyah, S.T.</h3>
            <p class="couple-parents">Putra dari<br/><strong>Bpk. {{nama_bapak_laki_laki}}</strong> &amp;
              <strong>Ibu {{nama_ibu_laki_laki}}</strong>
            </p>
            <div class="couple-socmed">
              <a href="#" class="socmed-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="white" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="white" stroke-width="2" />
                </svg>
                {{ig_laki_laki}}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  
    <!-- SECTION TAMBAHAN: COUNTDOWN + KONFIRMASI -->
    <section id="sec-countdown-rsvp" class="section countdown-rsvp-section">
      <div class="cr-bg"></div>
      <div class="cr-content">
        <p class="section-label light">Hitung Mundur</p>
        <h2 class="section-title light">Menuju Hari Bahagia</h2>
        <div class="title-ornament light">✦</div>
        <div class="countdown-boxes" id="countdown">
          <div class="cd-box"><span class="cd-num" id="cd-days">00</span><span class="cd-label">Hari</span></div>
          <div class="cd-sep">:</div>
          <div class="cd-box"><span class="cd-num" id="cd-hours">00</span><span class="cd-label">Jam</span></div>
          <div class="cd-sep">:</div>
          <div class="cd-box"><span class="cd-num" id="cd-mins">00</span><span class="cd-label">Menit</span></div>
          <div class="cd-sep">:</div>
          <div class="cd-box"><span class="cd-num" id="cd-secs">00</span><span class="cd-label">Detik</span></div>
        </div>
  
  
  
        <form id="form-rsvp">
        <div class="rsvp-card">
          <h3 class="rsvp-title">Konfirmasi Kehadiran</h3>
          <div class="rsvp-form" id="rsvp-form">
  
            <label>Kode undangan</label>
            <input type="text" class="rsvp-input" id="rsvp-code" placeholder="Misal: WED-XXX" required value="{{kode_undangan}}" />
  
            <label>Nama tamu</label>
            <input type="text" class="rsvp-input" id="rsvp-name" placeholder="Nama Anda" required value="{{nama_tamu}}" />
  
            <label>Konfirmasi kehaadiran</label>
            <select class="rsvp-select" id="rsvp-status" >
                  <option value="confirmed">Hadir</option>
                  <option value="declined">Tidak Hadir</option>
                </select>

            <label>Nama tamu</label>
            <input type="number" class="rsvp-input" id="rsvp-guests" placeholder="Jumlah tamu" required value="1" />
  
            <button class="btn-rsvp" id="btn-submit-kehadiran">Konfirmasi</button>

  
  
          <div id="rsvp-thanks" class="rsvp-thanks hidden">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p>Terima kasih atas konfirmasinya!</p>
            <div id="alert-submit-kehadiran" class="uk-margin-small-top uk-text-small uk-text-center"></div>
          </div>
        </div>
        </form>
  
  
      </div>
    </section>
  
    <!-- SECTION 3: WAKTU & TEMPAT -->
    <section id="sec-venue" data-menu-label="Waktu & tempat"  class="section venue-section">
      <div class="section-header">
        <p class="section-label">Tanggal & Lokasi</p>
        <h2 class="section-title">Waktu &amp; Tempat</h2>
        <div class="title-ornament">✦</div>
      </div>
  
      <div class="venue-events">
        <div class="venue-card reveal-card">
          <div class="venue-icon">🕌</div>
          <h3 class="venue-event-name">Akad Nikah</h3>
          <p class="venue-datetime">Sabtu, 14 Juni 2025</p>
          <p class="venue-time">08.00 – 10.00 WIB</p>
          <div class="venue-divider"></div>
          <p class="venue-place">Masjid Al-Ikhlas</p>
          <p class="venue-address">Jl. Merpati No. 12, Kebayoran Baru, Jakarta Selatan</p>
          <a href="https://maps.google.com" target="_blank" class="btn-map">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Buka Maps
          </a>
        </div>
  
        <div class="venue-card reveal-card">
          <div class="venue-icon">🌸</div>
          <h3 class="venue-event-name">Resepsi</h3>
          <p class="venue-datetime">Sabtu, 14 Juni 2025</p>
          <p class="venue-time">11.00 – 15.00 WIB</p>
          <div class="venue-divider"></div>
          <p class="venue-place">The Grand Ballroom</p>
          <p class="venue-address">Jl. Sudirman No. 88, Senayan, Jakarta Pusat</p>
          <a href="https://maps.google.com" target="_blank" class="btn-map">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Buka Maps
          </a>
        </div>
      </div>
    </section>
  
    <!-- SECTION 4: LIVE STREAMING -->
    <section id="sec-live" data-menu-label="Streaming" class="section live-section">
      <div class="live-bg"></div>
      <div class="live-content">
        <p class="section-label light">Saksikan Bersama</p>
        <h2 class="section-title light">Live Streaming</h2>
        <div class="title-ornament light">✦</div>
        <p class="live-desc">Tidak bisa hadir? Saksikan momen bahagia kami secara langsung melalui siaran langsung
          berikut.</p>
        <div class="live-embed">
          <div class="live-placeholder">
            <div class="live-pulse"></div>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <p>Live akan dimulai pada<br/><strong>14 Juni 2025, 08.00 WIB</strong></p>
          </div>
        </div>
        <a href="#" class="btn-live">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" fill="white" />
          </svg>
          Tonton di YouTube
        </a>
      </div>
    </section>
  
    <!-- SECTION 5: TIMELINE -->
    <section id="sec-story" class="section story-section">
      <div class="section-header">
        <p class="section-label">Perjalanan Cinta</p>
        <h2 class="section-title">Kisah Kita</h2>
        <div class="title-ornament">✦</div>
      </div>
      <div class="timeline">


        {{#each timeline_kisah}}

          {{#if @index % 2 == 1}}
            <div class="timeline-item left reveal-card">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <span class="tl-year">{{this.tanggal}}</span>
                <h4 class="tl-title">aaa {{this.judul}}</h4>
                <p class="tl-text">{{this.deskripsi}}</p>
              </div>
            </div>
          {{else}}

            <div class="timeline-item right reveal-card">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <span class="tl-year">{{this.tanggal}}</span>
                <h4 class="tl-title">bb {{this.judul}}</h4>
                <p class="tl-text">{{this.deskripsi}}</p>
              </div>
            </div>

          {{/if}}

        {{/each}}
        
      </div>
    </section>
  
    <!-- SECTION 6: GALLERY -->
    <section id="sec-gallery" class="section gallery-section">
      <div class="section-header">
        <p class="section-label">Kenangan Indah</p>
        <h2 class="section-title">Galeri Foto</h2>
        <div class="title-ornament">✦</div>
      </div>
      <div class="gallery-grid" id="gallery-grid">
        <div class="gallery-item" data-index="0">
          <div class="gallery-placeholder"><span>Foto 1</span>
            <div class="gallery-overlay-hint"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                stroke-width="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg></div>
          </div>
        </div>
        <div class="gallery-item" data-index="1">
          <div class="gallery-placeholder g2"><span>Foto 2</span>
            <div class="gallery-overlay-hint"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                stroke-width="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg></div>
          </div>
        </div>
        <div class="gallery-item" data-index="2">
          <div class="gallery-placeholder g3"><span>Foto 3</span>
            <div class="gallery-overlay-hint"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                stroke-width="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg></div>
          </div>
        </div>
        <div class="gallery-item" data-index="3">
          <div class="gallery-placeholder g4"><span>Foto 4</span>
            <div class="gallery-overlay-hint"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                stroke-width="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg></div>
          </div>
        </div>
        <div class="gallery-item span2" data-index="4">
          <div class="gallery-placeholder g5"><span>Foto 5 – Prewedding</span>
            <div class="gallery-overlay-hint"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                stroke-width="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg></div>
          </div>
        </div>
        <div class="gallery-item" data-index="5">
          <div class="gallery-placeholder g6"><span>Foto 6</span>
            <div class="gallery-overlay-hint"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white"
                stroke-width="1.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg></div>
          </div>
        </div>
      </div>
    </section>
  
    <!-- SECTION 7: UCAPAN -->
    <section id="sec-wishes" data-menu-label="Doa & Ucapan"  class="section wishes-section">
      <div class="section-header">
        <p class="section-label">Doa &amp; Harapan</p>
        <h2 class="section-title">Ucapan &amp; Doa</h2>
        <div class="title-ornament">✦</div>
      </div>
      <!-- <form id="form-wish"> -->
        <div class="wish-form-card">
          <input type="text" class="wish-input" id="wish-name" placeholder="Nama Anda" />
          <textarea class="wish-textarea" id="wish-message" placeholder="Tuliskan ucapan dan doa terbaik Anda untuk pasangan…" rows="3"></textarea>
          <button class="btn-wish" id="btn-submit-ucapan">Kirim Ucapan</button>

          <div id="alert-submit-ucapan" class="uk-margin-small-top uk-text-small uk-text-center"></div>
        </div>
      <!-- </form> -->
      <div class="wish-list" id="wish-list">
        {{#each wishes}}
        <div class="wish-item">
          <div class="wish-item-name">{{this.guest_name}}</div>
          <div class="wish-item-text">{{this.guest_message}}</div>
          <div class="wish-item-time">{{this.guest_comment_time}}</div>
        </div>
        {{/each}}
        
      </div>
    </section>
  
    <!-- SECTION 8: AMPLOP ONLINE -->
    <section id="sec-gift"  data-menu-label="Wedding gifts" class="section gift-section">
      <div class="section-header">
        <p class="section-label">Hadiah</p>
        <h2 class="section-title">Amplop Online &amp; Kado</h2>
        <div class="title-ornament">✦</div>
      </div>
      <p class="gift-desc">Kehadiran dan doa restu Anda adalah hadiah terindah bagi kami. Namun jika Anda ingin
        memberikan hadiah, berikut informasinya:</p>
  
      <div class="gift-cards">
        <div class="gift-card">
          <div class="gift-bank-logo">🏦</div>
          <h4 class="gift-bank-name">Bank BCA</h4>
          <p class="gift-account">1234 5678 90</p>
          <p class="gift-holder">a.n. {{groom_name}}</p>
          <button class="btn-copy" data-copy="1234567890">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Salin Nomor
          </button>
        </div>
  
        <div class="gift-card">
          <div class="gift-bank-logo">🏦</div>
          <h4 class="gift-bank-name">Bank Mandiri</h4>
          <p class="gift-account">0987 6543 21</p>
          <p class="gift-holder">a.n. {{bride_name}}</p>
          <button class="btn-copy" data-copy="0987654321">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Salin Nomor
          </button>
        </div>
  
        <div class="gift-card address-card">
          <div class="gift-bank-logo">📦</div>
          <h4 class="gift-bank-name">Kirim Kado ke Alamat</h4>
          <p class="gift-address">Jl. Melati Indah No. 7, RT 03/RW 05<br/>Kebayoran Lama, Jakarta Selatan<br/>DKI Jakarta 12220
          </p>
          <p class="gift-contact">Hub: <strong>+62 812-3456-7890</strong></p>
        </div>
      </div>
    </section>
  
    <!-- SECTION 9: PENUTUP -->
    <section id="sec-closing" class="section closing-section">
      <div class="closing-bg">
        <div class="closing-petals">
          <div class="cp cp1"></div>
          <div class="cp cp2"></div>
          <div class="cp cp3"></div>
          <div class="cp cp4"></div>
          <div class="cp cp5"></div>
        </div>
      </div>
      <div class="closing-content">
        <div class="closing-ornament"></div>
        <p class="closing-bismillah">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيْمِ</p>
        <h2 class="closing-names">{{groom_name}} &amp; {{bride_name}}</h2>
        <div class="hero-divider">
          <span class="div-line"></span>
          <span class="div-flower">✦</span>
          <span class="div-line"></span>
        </div>
        <p class="closing-text">Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i
          berkenan hadir dan memberikan doa restu kepada kami.</p>
        <p class="closing-sign">Wassalamualaikum Warahmatullahi Wabarakatuh</p>
        <div class="closing-footer">
          <p>Dengan penuh cinta,</p>
          <p class="closing-family"><strong>Keluarga Besar Ahmad Yusuf &amp; Hendra Wijaya</strong></p>
        </div>
      </div>
    </section>
  
  </div><!-- /main-invitation -->
  
  <!-- ═══════════════════════════════════════════
       FLOATING UI
  ════════════════════════════════════════════ -->
  
  <!-- Floating Back Scroll (kiri bawah) -->
  <button id="float-scroll-up" class="float-btn float-left hidden" title="Kembali ke atas">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>
  </button>
  
  <!-- Floating Icons (kanan atas) -->
  <div id="float-toolbar" class="float-toolbar hidden">
    <!-- <button class="float-icon-btn" id="btn-menu-float" title="Menu">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button> -->
    <!-- <button class="float-icon-btn" id="btn-qr-float" title="QR Code">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3"/><rect x="19" y="14" width="2" height="2"/><rect x="14" y="19" width="2" height="2"/><rect x="18" y="18" width="3" height="3"/></svg>
    </button> -->
    <!-- <button class="float-icon-btn" id="btn-music-float" title="Musik">
      <svg width="18" height="18" id="icon-play" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      <svg width="18" height="18" id="icon-pause" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
    </button> -->
  </div>
  
  <!-- Menu Overlay -->
  <div id="menu-overlay" class="overlay hidden">
    <div class="overlay-panel">
      <div class="overlay-header">
        <h3>Menu Undangan</h3>
        <button class="overlay-close" id="close-menu">✕</button>
      </div>
      <nav class="menu-nav">
        <a href="#" class="menu-item" data-section="sec-hero">🏡 Beranda</a>
        <a href="#" class="menu-item" data-section="sec-couple">💑 Mempelai</a>
        <a href="#" class="menu-item" data-section="sec-countdown-rsvp">⏱ Hitung Mundur</a>
        <a href="#" class="menu-item" data-section="sec-venue">📍 Waktu &amp; Tempat</a>
        <a href="#" class="menu-item" data-section="sec-live">📡 Live Streaming</a>
        <a href="#" class="menu-item" data-section="sec-story">💌 Kisah Kita</a>
        <a href="#" class="menu-item" data-section="sec-gallery">🖼 Galeri Foto</a>
        <a href="#" class="menu-item" data-section="sec-wishes">💬 Ucapan</a>
        <a href="#" class="menu-item" data-section="sec-gift">🎁 Amplop &amp; Kado</a>
        <a href="#" class="menu-item" data-section="sec-closing">✉️ Penutup</a>
      </nav>
    </div>
  </div>
  
  <!-- QR Overlay -->
  <div id="qr-overlay" class="overlay hidden">
    <div class="overlay-panel qr-panel">
      <div class="overlay-header">
        <h3>QR Code Undangan</h3>
        <button class="overlay-close" id="close-qr">✕</button>
      </div>
      <div class="qr-content">
        <div class="qr-code-box">
          <!-- QR SVG placeholder -->
          <svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="180" fill="white" />
            <rect x="10" y="10" width="60" height="60" fill="none" stroke="#3d2a1e" stroke-width="4" />
            <rect x="20" y="20" width="40" height="40" fill="#3d2a1e" />
            <rect x="110" y="10" width="60" height="60" fill="none" stroke="#3d2a1e" stroke-width="4" />
            <rect x="120" y="20" width="40" height="40" fill="#3d2a1e" />
            <rect x="10" y="110" width="60" height="60" fill="none" stroke="#3d2a1e" stroke-width="4" />
            <rect x="20" y="120" width="40" height="40" fill="#3d2a1e" />
            <!-- dots pattern -->
            <rect x="80" y="10" width="10" height="10" fill="#3d2a1e" />
            <rect x="95" y="10" width="10" height="10" fill="#3d2a1e" />
            <rect x="80" y="25" width="10" height="10" fill="#3d2a1e" />
            <rect x="95" y="40" width="10" height="10" fill="#3d2a1e" />
            <rect x="80" y="55" width="10" height="10" fill="#3d2a1e" />
            <rect x="10" y="80" width="10" height="10" fill="#3d2a1e" />
            <rect x="25" y="80" width="10" height="10" fill="#3d2a1e" />
            <rect x="40" y="95" width="10" height="10" fill="#3d2a1e" />
            <rect x="55" y="80" width="10" height="10" fill="#3d2a1e" />
            <rect x="80" y="80" width="10" height="10" fill="#3d2a1e" />
            <rect x="95" y="80" width="10" height="10" fill="#3d2a1e" />
            <rect x="110" y="80" width="10" height="10" fill="#3d2a1e" />
            <rect x="125" y="80" width="10" height="10" fill="#3d2a1e" />
            <rect x="140" y="80" width="10" height="10" fill="#3d2a1e" />
            <rect x="155" y="80" width="10" height="10" fill="#3d2a1e" />
            <rect x="80" y="95" width="10" height="10" fill="#3d2a1e" />
            <rect x="110" y="95" width="10" height="10" fill="#3d2a1e" />
            <rect x="125" y="110" width="10" height="10" fill="#3d2a1e" />
            <rect x="140" y="125" width="10" height="10" fill="#3d2a1e" />
            <rect x="155" y="140" width="10" height="10" fill="#3d2a1e" />
            <rect x="80" y="110" width="10" height="10" fill="#3d2a1e" />
            <rect x="95" y="125" width="10" height="10" fill="#3d2a1e" />
            <rect x="80" y="140" width="10" height="10" fill="#3d2a1e" />
            <rect x="80" y="155" width="10" height="10" fill="#3d2a1e" />
            <rect x="110" y="155" width="10" height="10" fill="#3d2a1e" />
            <rect x="155" y="110" width="10" height="10" fill="#3d2a1e" />
          </svg>
        </div>
        <p class="qr-label">Scan untuk membuka undangan</p>
        <p class="qr-url">wedding.{{groom_name}}-{{bride_name}}.com</p>
        <p class="qr-info">{{groom_name}} &amp; {{bride_name}} · 14 Juni 2025</p>
      </div>
    </div>
  </div>
  
  <!-- Gallery Lightbox -->
  <div id="lightbox" class="overlay hidden">
    <div class="lightbox-panel">
      <button class="overlay-close lightbox-close" id="close-lightbox">✕</button>
      <div class="lightbox-img-wrap">
        <div class="lightbox-placeholder" id="lightbox-img">
          <span id="lightbox-label">Foto</span>
        </div>
      </div>
      <div class="lightbox-nav">
        <button id="lb-prev">‹</button>
        <span id="lb-counter">1 / 6</span>
        <button id="lb-next">›</button>
      </div>
    </div>
  </div>


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



`
};
