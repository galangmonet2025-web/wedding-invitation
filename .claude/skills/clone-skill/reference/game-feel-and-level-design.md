# Game Feel & Level Design — prinsip terukur (bahan baku §3/§8/§10 + APPENDIX A/D Bible)

> Angka-angka di sini terukur (60fps → 1 frame ≈ 16.67ms) dan bersumber dari GDC talks, dev
> blog, & interview (lihat tiap section). Pakai saat menulis Bible agar aturannya **ber-angka**,
> bukan kata sifat. Ambil yang relevan ke arketipe; jangan tempel semuanya buta.

---

## 1. Game feel / "Juice"

Prinsip inti (Jonasson & Nijman/Vlambeer): *output maksimal untuk input minimal* — aksi kecil
pemain memicu reaksi audiovisual besar. **Juice menghias feedback, TIDAK mengubah simulasi/
hitbox.** Makin sering sebuah aksi, makin sederhana juice-nya; juice besar untuk event langka.

- **Screen shake (trauma model — Eiserloh):** simpan `trauma`∈[0,1]; event menambah (hit kecil
  `+=0.2`, ledakan `+=0.5`), clamp 1. Decay linear ke 0 dalam ~0.5–1s. Terapkan `shake = trauma²`
  (persepsi eksponensial). Di Phaser pakai `camera.shake(dur, intensity)` dgn intensity float
  kecil (~0.02). Sudut kecil (2–5°).
- **Hit pause / freeze-frame (ROI tertinggi):** bekukan attacker+victim saat kontak. **2–8 frame
  ≈ 33–130ms** (hit ringan pendek, berat panjang). **Cap ~0.3–0.5s** — lebih dari itu terasa lag.
  Default Bible: normal 2–4 frame, power 5–8 frame.
- **Screen flash:** 1–3 frame (~16–50ms), fade ~100–150ms. Putih=impact, merah=kena damage.
- **Squash & stretch:** jaga volume (tekan ke ~80% tinggi → ~125% lebar). Masuk squash cepat,
  keluar ease ~100–200ms + sedikit overshoot.
- **Anticipation:** gerak lawan-arah singkat sebelum aksi besar (jongkok sebelum lompat) ~2–6 frame.
- **Easing:** jangan gerak linear. Ease-out untuk datang, ease-in untuk pergi; overshoot
  (back/elastic/bounce) untuk "pop"; UI pop ~150–300ms.
- **Camera lerp:** `pos = lerp(pos, target, k)`, k≈0.1 cepat / 0.01 lambat; lookahead ke arah gerak.
- **SFX:** pitch-vary ±1–3 semitone (semitone ≈ ×1.06) pada SFX berulang; 3–5 variasi per bunyi.
- **Sihirnya:** **stack** shake+freeze+flash+partikel+SFX di **frame impact yang sama**.

Sumber: Art of Screenshake (Vlambeer), Juice It or Lose It, Eiserloh "Juicing Your Cameras", SmashWiki Hitlag.

---

## 2. Platformer level design

**Kishōtenketsu 4-act loop (struktur Nintendo, ~5 menit/ide):**
1. **Ki/Introduce** — mekanik baru di zona **tak bisa gagal** belajar.
2. **Shō/Develop** — ulang dengan risiko kecil yang bisa pulih.
3. **Ten/Twist** — kombinasi/balik/recontextualize; ujian penguasaan.
4. **Ketsu/Resolve** — aplikasi percaya diri, lalu **pensiunkan** mekanik (level berikut perkenalkan
   yang baru). Satu mekanik baru per segmen; kemunculan pertama failure-proof.

**Jump-arc & gap (angka tile kanonik Mario):**
- Vertikal: standing jump ~4 blok; +run-up 5; momentum penuh 6 (maks). Variable: tap ~3 tile,
  hold penuh ~4.
- Horizontal: tanpa momentum ~5 blok; lari sebagian ~8; lari penuh ~12 (maks).
- Platform <10 blok; semua permukaan snap ke panjang integer-blok.
- Lompatan naik lebih sulit dari turun → naikkan 1 tier kesulitan untuk gap ke atas.

**Gap rules** (D_max = jarak lompat-lari maks dalam tile): jangan wajibkan gap > D_max;
pixel-perfect-at-D_max = lompatan terberat (jarang). **Gap pertama ≤ ~40% D_max**; mid ~60–75%;
late/opsional ~90–100%. Platform pendaratan lebih lebar dari 1 lebar-player.

**Forgiveness (nilai terverifikasi):** coyote time **3–6 frame (~50–100ms)** (Celeste 5 frame);
jump buffer ~3–6 frame; corner-correction ~4px (Celeste); wall-jump tolerance ~2–5px.

**Fairness:** no blind jump (pendaratan terlihat saat takeoff); objek mirip = perilaku sama (no
instakill lookalike); telegraph semua hazard; hazard mematikan pertama tepat setelah checkpoint.

Sumber: GMTK 4-Step Level Design, Reverse Design SMW, Celeste & Forgiveness, Mario Wiki Jump.

---

## 3. Difficulty curve & flow

- **Flow channel (Csikszentmihalyi):** challenge≫skill=cemas; skill≫challenge=bosan. Kesulitan
  harus **naik seiring skill**.
- **Bentuk kurva:** jangan ramp lurus. **Sawtooth / peak-and-valley**: naik ke puncak, turun ke
  rest, naik lebih tinggi. Tren naik, lembah memberi pemulihan. Setelah tiap spike (boss/gauntlet)
  beri breather.
- **Ramp ikut skill, bukan jam:** teach→practice→test→combine (layering) untuk puncak berikut.

Sumber: Flow Theory (Csikszentmihalyi), Jenova Chen "Flow in Games".

---

## 4. Run-and-gun (Contra / Metal Slug)

> **⚠️ LANTAI kepadatan dulu, baru plafon variasi.** Aturan "2 tipe/wave" di bawah adalah plafon
> *variasi per-wave* (jaga keterbacaan) — ia **TIDAK** boleh dibaca sebagai "musuh sedikit".
> Metal Slug asli sangat **padat**: event tiap **2–4 detik**, ≥3–4 musuh/layar, tak pernah kosong
> > ~2 detik. Lantai kepadatan + validator "no dead air" + beat-sheet referensi ada di
> [`density-engine.md`](density-engine.md) dan **WAJIB** ditegakkan. "Musuh kadang ada kadang
> nggak", "pijakan kurang", "dekorasi sepi" = pelanggaran lantai, bukan selera.

- **Palet musuh:** 2 tipe/wave (sweet spot variasi), maks 3; campur ≥1 ranged dgn rusher; mook mati
  ~1 hit; hanya "tank" ber-telegraph yang tahan lama. Silhouette terbaca dari jauh sebelum beraksi.
  **Tapi selalu ADA wave** — ≥3–4 musuh aktif/layar di zona tempur ([`density-engine.md`](density-engine.md) §2).
- **Bentuk wave:** **triangle** (mulai sedikit, tambah tiap sub-wave, puncak) untuk fight normal;
  **diamond** (fodder → lebih sedikit tapi lebih kuat → 1 elite) menuju mini-boss/boss. Spawn dari
  tepi layar arah gerak.
- **Bullet:** semua ber-telegraph & reactable; wind-up terlihat; musuh tak lebih cepat dari reaksi
  pemain.
- **Senjata:** segitiga coverage↔damage↔rate (Spread=coverage, MG=cepat-sempit, Laser=single-kuat-
  lambat, Flame=area). Cap proyektil simultan. **Mati = senjata turun ke default** (risk/reward inti).
- **Pacing:** 3–5 puncak/level; mini-boss di tengah.

Sumber: Encounter Design (triangle/diamond), Level Design Book, Contra/Metal Slug interviews.

---

## 5. Top-down adventure (Zelda)

- **Struktur:** graph room/screen via pintu. **Desain graph lock-and-key DULU, ruang fisik kedua.**
- **Lock-and-key:** small key+locked door; key-item+obstacle (gimmick dungeon); boss key+boss door;
  switch+barrier. Satu key/satu door terbuka pada satu waktu (kesulitan bersih).
- **Flow:** enter→Map→Compass→small keys→**gimmick item mid-dungeon**→Boss Key→boss. **Teach→Test→
  Reward:** room aman setelah dapat item → puzzle bertingkat → **boss = ujian item** (weak point
  butuh item dungeon).

Sumber: GMTK Boss Keys, Lock-and-key theory (Boris the Brave), Zelda Dungeon.

---

## 6. Endless runner

- **Chunk-based:** prefab buatan-tangan (tangga/fork/drop/spring) + varian kesulitan; pisahkan
  layer gameplay dari dekorasi; treadmill (player diam, chunk di-pool ke arah player, recycle di
  belakang kamera). **Connection contract:** tinggi/lebar entry tiap chunk match exit sebelumnya.
- **Budget system:** tiap chunk punya cost numerik; generator punya budget per window; **ramp =
  naikkan budget seiring waktu/jarak.**
- **Speed ramp:** monoton naik ke cap; kesulitan di atas cap via spacing/density, bukan scroll lebih
  cepat. Validasi tiap chunk fair di min/avg/**max speed**.
- **Reaction math:** reaksi visual ~200–300ms (mean ~250) ≈ 12–18 frame. **min_lead = speed ×
  (reaction + input_lag + action_duration)** (reaction 0.3s default, 0.4s kasual). **min gap =
  (action_recovery + 0.3s) × speed.** **Simpan spacing dalam DETIK**, kalikan speed tiap frame.

Sumber: Sure Footing (procedural), Endless Runners difficulty curves, Reaction Time & Game Design.

---

## 7. Match-3

- **Board:** 8×8 (range 7–9), grid kotak; gravity turun, refill dari atas kolom; match ≥3
  kontigu H/V (tanpa diagonal); swap ilegal snap-back.
- **Special ladder:** 4-line→line-clear; 5-straight→color-bomb (terkuat); 5 T/L→3×3 blast; combo
  eskalasi.
- **Cascade:** multiplier naik per kedalaman (×1,×2,×3…).
- **Valid-move guarantee:** setelah resolusi, scan ≥1 swap valid; jika nihil reshuffle. Board awal:
  no pre-match, ≥1 valid move.
- **Juice:** pop+scale, partikel proporsional, **pitch +1 semitone per langkah cascade**.

Sumber: Match Game Mechanics survey, King "Special Candies", Match-3 algorithmic tricks.

---

## 8. Boss design

- **Telegraph (fondasi fairness):** tiap serangan ber-wind-up; kesulitan dari eksekusi bukan
  obscurity. **Min tell ≥0.5s (15 frame@60fps)**, makin lethal makin panjang. Channel redundan:
  pose + SFX + VFX.
- **Anatomi frame:** anticipation 15–20 frame (0.5–0.66s) → active 10–30 → recovery (tuas desain).
- **Punish/weakness window:** recovery atur punishability. Serangan spam → ~10 frame (tak
  punishable); serangan committed besar → ~45–60 frame (~0.75–1s, cukup hit/heal). **Punishable
  butuh recovery ≥ animasi serang/heal tercepat pemain.** Weak point jelas, bukan pixel-hunt.
- **Phase & eskalasi:** 3 fase (range 2–5), transisi di threshold HP (mis. 50%). **Eskalasi dengan
  MENGEVOLUSI moveset** (percepat/perpanjang range/tambah elemen), bukan menempel mekanik asing.
  Tiap fase persempit safe-window. Tandai transisi dgn beat (flash transform).
- **Boss = ujian skill:** menguji semua verb yang level ajarkan.

Sumber: GDKeys "Anatomy of an Attack", Boss battle 8-beat structure, Cuphead boss design.

---

## 9. Mobile-first / touch controls

- **Ukuran target:** Apple HIG 44×44pt (~59px); Material 48×48dp; WCAG AAA 44×44 CSS px. Hit-area
  boleh > visual. **Spacing ≥8dp**; 16pt+ untuk kontrol sering-pakai.
- **Thumb zones:** ~75% sentuhan = jempol; ~49% pegang 1-tangan. Green (bottom-center)=aksi utama;
  yellow (mid+sisi-jauh)=sekunder; red (pojok atas)=jarang/destruktif. Swipe hit-area ≥45px.
- **Layout game:** kontrol di green zone bawah; HUD (skor/timer) di atas = dilihat, tak di-tap.
  **Jangan biarkan jari menutup area main** (anchor kontrol di bawah). Hormati safe-area inset
  (`env(safe-area-inset-*)`).
- **Skema by DOF:** 1-aksi → tap-zone; 4-arah → swipe (perlu onboarding); 2D bebas → **floating
  joystick** muncul di tempat jempol mendarat (hindari joystick fixed).

Sumber: The Thumb Zone (Smashing), Accessible touch targets (LogRocket), Apple HIG, Material 3.

---

## 10. Onboarding tanpa kata (metode Mario 1-1)

- Ruang kosong di kiri + scenery di kanan → "pergi ke kanan" tanpa teks.
- Goomba pertama jalan pelan ke arah pemain → memaksa lompat pertama; mati di awal = murah →
  kematian **mengajari**.
- `?` block pertama di zona itu → bump → koin (positif: "pukul dari bawah = bagus").
- Mushroom **dipaksa**: muncul & terkurung bata di atas → memantul balik; geometri mencegah
  menghindar → belajar "mushroom ini baik". Subversi sengaja, dipaksa geometri.
- Pipa makin tinggi → mengajari variable jump sebelum pipa men-gate progres.

**Aturan umum:** ajari lewat interaksi-paksa di zona fail-proof; percobaan pertama consequence-free
(taruh dekat spawn/checkpoint); objek self-describing (affordance: hazard tampak bahaya, reward
tampak menarik); signpost arah via geometri/cahaya/reward-tunggal, bukan teks; interaksi pertama
me-reward (bangun kebiasaan eksperimen); satu konsep sekali, isolasi sebelum kombinasi; subversi
hanya setelah konsep dipelajari; **jangan** pakai hazard yang tampak identik dengan objek aman.

Sumber: World 1-1 (Wikipedia), Analysis of SMB 1-1, Anna Anthropy "Level Design Lessons".

---

## 11. Density Engine — "NO DEAD AIR" (anti-hambar, semua arketipe)

Game terasa **hambar** kalau diatur dengan plafon ("maks 3 musuh", "≥3 parallax") tapi tanpa
**lantai kepadatan** yang divalidasi. Lantai terukur (musuh/layar, pijakan/segmen, prop/layar,
max-dead-air, reward cadence), beat-sheet reverse-engineer Metal Slug, dan **validator wajib**
(segmen gagal kuota = regenerate) ada lengkap di [`density-engine.md`](density-engine.md).

- **Max dead air:** ≤ 2 detik / ≤ 0.75× lebar-layar tanpa entity/event aktif.
- **Musuh:** ≥ 3–4 aktif/layar di zona tempur (easy 3 · normal 4 · hard 6).
- **Pijakan naik:** ≥ 1 platform elevasi tiap 6–10 tile (≈ tiap ~1 layar).
- **Dekorasi:** ≥ 1 far-parallax + 1–2 landmark midground + 2–4 destructible + ≥1 ambient motion / layar.
- **Reward:** item/POW/kepingan/skor tiap ≤ 15–20 detik; power-spike per pivot eskalasi.
- **Validator no-dead-air = gate keras** di generation loop, bukan checklist. Lihat density-engine.md §5–§6.

Sumber: reverse-engineer Metal Slug Mission 1 + DNA pacing SNK (lihat `density-engine.md`).

---

## Cheat-sheet lintas-topik (aturan paling terukur & universal)

- **Density (anti-hambar):** no dead air ≤2s/≤0.75 layar; ≥3–4 musuh/layar; pijakan naik tiap
  6–10 tile; ≥1 far+1–2 mid+2–4 destructible+1 ambient/layar; reward ≤15–20s; **validator wajib
  regen segmen gagal** (`density-engine.md`).
- **Juice:** freeze 2–8 frame (cap ~0.3–0.5s); shake=trauma² decay 200–400ms; SFX pitch ±1–3
  semitone; stack semua efek di frame impact sama.
- **Platformer:** 1 mekanik baru/segmen, kemunculan pertama failure-proof; gap pertama ≤40% D_max;
  coyote+buffer 3–6 frame; corner-correct ~4px; no blind jump.
- **Flow:** kurva sawtooth (puncak+lembah), bukan ramp lurus; kesulitan naik ikut skill.
- **Run-and-gun:** 2 tipe musuh/wave (maks 3); ≥1 ranged; mook 1-hit; triangle→diamond ke boss;
  3–5 puncak/level; mati = senjata turun.
- **Zelda:** desain graph lock-key dulu; 1 key/1 door sekali; gimmick item mid-dungeon → boss=ujian item.
- **Runner:** chunk + budget cost yang tumbuh; simpan spacing dalam detik; min_lead = speed×(0.3s+
  lag+aksi); validasi tiap junction di speed-cap.
- **Match-3:** board 8×8; 4→line, 5→color-bomb, T/L→3×3; cascade multiplier; reshuffle bila no move;
  +1 semitone/cascade.
- **Boss:** semua ber-telegraph; min tell ≥0.5s scaling lethality; punishable recovery ≥0.75–1s; 3
  fase di threshold HP; eskalasi dgn evolusi moveset.
- **Mobile:** target 44×44pt/48×48dp, spacing ≥8dp; kontrol bottom-center; HUD-only di atas;
  hormati safe-area; floating joystick bukan fixed.
- **Onboarding:** interaksi-paksa di zona fail-proof; consequence-free pertama; affordance > teks;
  reward-first; subversi hanya setelah diajarkan.
