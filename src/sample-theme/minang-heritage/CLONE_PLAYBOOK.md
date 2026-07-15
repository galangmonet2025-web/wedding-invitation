# Playbook: Menyalin Tema dari Website yang Di-download

Dokumen ini merekam **seluruh proses teknis** pembuatan tema `minang-heritage` —
dari folder hasil "Save Page As" sebuah undangan online, menjadi tema yang jalan
di platform ini. Ditulis supaya bisa **diulang untuk kasus yang sama**: user
menyediakan source website hasil download, lalu tema disalin dengan cara serupa.

> Baca juga: [`asset/ASSET.md`](./asset/ASSET.md) (peta slot gambar tema ini).
> Kontrak host & aturan tema ada di `CLAUDE.md` root repo.

---

## 0. Ringkasan hasil (tema ini)

| | |
|---|---|
| Source | folder "Save Page As" dari sebuah undangan WordPress/Elementor |
| Output | `index.html` (46KB) + `index.css` (47KB) + `index.js` (20KB) + `asset/` (10 gambar) |
| Basis struktur | tema `timeless` (di-clone, lalu di-reskin) |
| Slot asset dipakai | `{{asset_image_1,2,3,4,6,7,8}}` |

---

## 1. Aturan main yang menentukan SEMUA keputusan

Tiga fakta platform ini. Salah paham di sini = tema rusak. **Verifikasi dulu,
jangan berasumsi.**

### 1.1. CSS TIDAK di-parse — hanya HTML

Di `InvitationPage.tsx`:
```
htmlBase = parseTemplate(activeTheme.html_template, ...)   // {{var}} DIPROSES
cssBase  = activeTheme.css_template                        // MENTAH, tidak diproses
```

**Konsekuensi:** `{{asset_image_N}}` **hanya jalan di `index.html`**. Gambar aset
harus dipasang lewat **inline style di HTML**, bukan `url()` di CSS:

```html
<div class="mg-page-bg" style="background-image: url(&quot;{{asset_image_1}}&quot;);"></div>
```
CSS-nya lalu hanya mengatur perilaku (posisi/ukuran/repeat), **tanpa** `url()`:
```css
.mg-page-bg { position: fixed; inset: 0; background-size: cover; background-repeat: no-repeat; }
```

### 1.2. Template disimpan ke Google Sheets, dipotong per 50.000 karakter

`backend/Code.gs` → `splitStringIntoFields()`: tiap template dipecah ke
`<x>_template` + `<x>_extra_1..10` (@50K, total maks 550K).

**JEBAKAN MEMATIKAN:** kalau sebuah potongan **diawali `=`, `+`, `-`, atau `@`**,
Google Sheets menganggapnya **formula** → tersimpan `#ERROR!` → template rusak saat
disatukan lagi. Ada guard `setNumberFormat('@')` di `Code.gs`, tapi **jangan
bergantung padanya**.

> Ini benar-benar terjadi di tema ini: CSS 232KB → potongan ke-5 (`css_extra_4`,
> offset 200.000) jatuh tepat di banner komentar `/* ===== COVER ===== */` → diawali
> `=` → `css_extra_4` = error → tema selalu "beda: CSS" di dialog Inject & preview
> rusak. **Gejalanya menyesatkan** (terlihat seperti bug layout).

**Aturan emas: JAGA TIAP FILE < 50.000 KARAKTER** → cuma 1 potongan → jebakan ini
tidak mungkin terjadi. Caranya: **jangan embed base64 di CSS** — pakai `asset/` +
`{{asset_image_N}}`.

Cek sebelum serah-terima (lihat §7 untuk skrip lengkapnya).

### 1.3. Kontrak host (ThemeWrapper)

- **JS di-hapus & di-eksekusi ULANG** tiap inputnya berubah → wajib cleanup hook
  global (`window.__<nama>Cleanup`) dan panggil di awal, kalau tidak listener/RAF menumpuk.
- **ID host wajib verbatim**: `btn-show-qr`, `btn-show-menu`, `btn-toggle-music`,
  `bg-music`, `play-icon`, `pause-icon`, `btn-submit-ucapan`, `wish-name`,
  `wish-message`, `btn-submit-kehadiran`, `rsvp-status`, `rsvp-guests`, `rsvp-code`.
- **Musik milik host**: tema TIDAK boleh `audio.play()`. Hanya boleh mirror ikon
  play/pause. (Video muted tidak melanggar ini — lihat §5.)
- Host **re-inject HTML** saat kirim RSVP/ucapan → listener nav harus
  **document-delegated** biar tidak mati.

---

## 2. Alur kerja (urutan yang terbukti)

### Langkah 1 — Bedah source-nya, JANGAN cuma lihat HTML utama

Aset asli **tidak selalu** ada di HTML. Di kasus ini semua dekorasi kunci
tersembunyi di **file CSS**, bukan HTML — hampir terlewat.

```bash
# 1a. Gambar yang direferensikan HTML
grep -oE 'background-image[^;]*' "Nama Situs.html" | head -40

# 1b. PENTING: gambar di dalam file CSS (di sinilah aset asli ngumpet)
cd "Nama Situs_files"
grep -rhoE 'url\([^)]*\.(webp|png|jpg|jpeg|svg)[^)]*\)' *.css \
  | grep -viE 'data:|icon|logo' | sort -u
```
Di tema ini langkah **1b** yang memunculkan `MINANG-BACKGROUND.webp`,
`MINANG-PATTERN.webp`, `MINANG-MOTIF-ATAS/BAWAH.webp`, dll.

Ambil juga paletnya:
```bash
grep -oE '#[0-9a-fA-F]{6}' "Nama Situs.html" | sort | uniq -c | sort -rn | head -25
```

### Langkah 2 — Download aset ke `asset/`

```bash
mkdir -p src/sample-theme/<nama>/asset
base="https://<host>/wp-content/uploads/2024/12"
for f in FILE-A FILE-B; do curl -s "$base/$f.webp" -o "src/sample-theme/<nama>/asset/$f.webp"; done
```
**Lihat tiap gambar** (tool Read) sebelum memutuskan fungsinya. Nama file menipu:
`MINANG-COUPLE-1.webp` ternyata payung+bunga, `Balinese-*.webp` ternyata cuma foto.

### Langkah 3 — Cari resep CSS-nya di source, jangan mengarang

Kalau efeknya rumit (mis. "background merah berpola"), **cari di CSS source**:
```bash
grep -rhoE '[^{}]*MINANG-PATTERN[^}]*}' post-XXXX.css
```
Ini yang membongkar resep merah aslinya — mustahil ditebak benar:
```css
/* base section */
background: radial-gradient(at center center, #8D4A4A 0%, #471C1C 80%);
/* overlay di atasnya */
background-color: #471C1C;
background-image: url(MINANG-PATTERN.webp);   /* gambarnya PUCAT */
background-size: 150px auto;
opacity: 0.3;
mix-blend-mode: multiply;                      /* ← ini kunci "merah dominan"-nya */
```
> Pelajaran: aku sempat pakai `screen`/opacity karangan sendiri → hasilnya pucat &
> user menolak 2x. Menyalin resep source = langsung benar.

### Langkah 4 — Clone tema terdekat sebagai kerangka

Jangan mulai dari nol. `timeless` dipakai di sini karena host-wiring-nya lengkap.
Salin `index.js`-nya, **ganti nama hook** biar tidak bentrok:
`__timelessCleanup` → `__minangCleanup`, `__tlCountdownTimer` → `__mgCountdownTimer`,
`#tm-wed-date` → `#mg-wed-date`.

### Langkah 5 — Reskin & pasang aset (lihat §3, §4, §5)

### Langkah 6 — Validasi (§7), lalu user Inject + upload aset

---

## 3. Pola: latar penuh halaman (damask)

`.mg-page-bg` = **anak PERTAMA** `.mock-app-screen`, `position: fixed`.

```html
<div class="mock-app-screen">
  <div class="mg-page-bg" style="background-image: url(&quot;{{asset_image_1}}&quot;);"></div>
  ...section...
```
```css
.mg-page-bg { position: fixed; top:0; bottom:0; left:0; right:0; z-index:0;
              background-size: cover; opacity: .9; pointer-events: none; }
@media (min-width: 960px) { .mg-page-bg { left: auto; width: 480px; } }  /* jangan tutupi sidebar */
```
Section konten dibuat **semi-transparan** supaya motif tembus:
```css
.section { background: rgba(251, 243, 233, 0.82); }
```

### ⚠️ Dua jebakan yang MEMAKAN korban di sini

1. **JANGAN** `position: sticky`/`absolute` untuk layer ini. Sticky **tetap ikut
   flow** → menambah tinggi scroller → **halaman cover jadi bisa di-scroll & tidak
   full-height**. Harus `fixed` (nol tinggi).
2. **JANGAN** menulis `.mock-app-screen > section { position: relative; z-index: 1 }`.
   Aturan itu **menimpa** `position:absolute; z-index:60` milik `.section-cover` →
   cover berhenti jadi overlay & ikut ter-scroll. Tidak perlu: section setelah
   `.mg-page-bg` di DOM otomatis menimpa layer itu.

---

## 4. Pola: panel songket merah 3-layer

Satu section = 3 aset bertumpuk (urutan DOM = urutan render):

```html
<section class="section section-red has-motif">
  <div class="mg-red-bg"    style="background-image: url(&quot;{{asset_image_6}}&quot;);"></div>
  <div class="mg-motif mg-motif-top"    style="background-image: url(&quot;{{asset_image_2}}&quot;);"></div>
  <div class="mg-motif mg-motif-bottom" style="background-image: url(&quot;{{asset_image_3}}&quot;);"></div>
  ...konten...
</section>
```
```css
.section.section-red {           /* .section.section-red: 2 class, biar menang atas .section */
    background: radial-gradient(at center center, #8D4A4A 0%, #471C1C 80%);
    color: #fdf1e3;
}
.mg-red-bg { position:absolute; inset:0; z-index:0; background-color:#471C1C;
             background-repeat:repeat; background-size:150px auto;
             opacity:.3; mix-blend-mode:multiply; pointer-events:none; }
.mg-motif  { position:absolute; left:0; right:0; top:0; height:100%; z-index:1;
             background-repeat:no-repeat; background-size:100% auto; }
.mg-motif-top    { background-position: top center; }
.mg-motif-bottom { background-position: bottom center; }
.has-motif { padding-top:165px; padding-bottom:165px; }   /* konten harus lolos dari band */
.section-red > *:not(.mg-red-bg):not(.mg-motif) { position:relative; z-index:2; }
```
Stack: **pattern(0) → motif(1) → konten(2)**.

Catatan spesifisitas: `.section-red` didefinisikan **sebelum** `.section` di file,
jadi `.section-red` polos akan **kalah**. Pakai `.section.section-red`.

Teks/kartu di atas merah wajib di-terangkan (`.section-red .eyebrow{color:var(--gold-soft)}`,
kartu jadi panel krem `rgba(251,243,233,.94)`), tapi teks **di dalam** kartu krem tetap gelap.

---

## 5. Pola: section video

- Aset video **tidak** ikut `{{asset_image_N}}` (itu untuk gambar). MP4 dipasang
  sebagai URL langsung di `<source>`.
- **Section biasa dalam flow** (`position: relative; min-height:100dvh`) — **bukan**
  overlay `fixed`. Overlay = menimpa hero; section biasa = ikut urutan scroll dan
  otomatis ikut lebar kolom HP (di PC tidak menutupi sidebar kiri).
- `muted playsinline` + **tanpa** `loop`. Muted = **boleh autoplay** & **tidak
  melanggar kontrak musik host** (tidak ada audio).
- `playbackRate` diatur di JS (`= 1.5`).
- Teks overlay muncul menjelang video habis: pantau `ontimeupdate` (sisa ≤ lead) +
  `onended`, plus **safety-net timeout** kalau video gagal/stall → teks tetap muncul.
- Idempoten saat host re-inject: kalau `video.ended` → jangan restart, langsung
  tampilkan teks.

```js
if (openingVideo.ended) { revealOpeningText(); return; }
openingVideo.muted = true;
try { openingVideo.playbackRate = 1.5; } catch (e) {}
openingVideo.ontimeupdate = function () {
  var d = openingVideo.duration;
  if (isFinite(d) && d > 0 && d - openingVideo.currentTime <= 1.6) revealOpeningText();
};
openingVideo.onended = function () { revealOpeningText(); };
var p = openingVideo.play();
if (p && p.catch) p.catch(function () { revealOpeningText(); });   // autoplay diblokir → jangan sembunyikan teks
```

**Logika buka-undangan WAJIB di LUAR `cleanupFns`** (memory `theme-intro-reexec-bug`):
host mengeksekusi ulang JS saat `isOpened` berubah; kalau di dalam cleanup, animasi
intro dibongkar sebelum sempat jalan.

---

## 6. Jebakan CSS lain yang sudah memakan waktu

| Gejala | Sebab | Solusi |
|---|---|---|
| **Halaman cover bisa di-scroll ke bawah** padahal `.section-cover` sudah `position:absolute` | Cover cuma **overlay 100vh**; 14 section di belakangnya **tetap mengisi flow** → scroller tetap tinggi, guest menggulir "di balik" cover. Tidak ada scroll-lock di tema | Kunci scroller selama cover tampil: `.mock-app-screen:not(.reveal-content){overflow-y:hidden}`. Host **sudah** menambahkan `.reveal-content` saat "Buka Undangan" diklik → lepas sendiri, **tanpa JS tambahan**. Lihat §6.1 |
| **Tombol musik: fungsi jalan tapi ikon tidak berubah** | Tema memasang listener `play`/`pause` di `<audio id="bg-music">` lalu baca `audio.paused` — padahal host **tidak pernah memutar** elemen itu (host pakai `new Audio()` sendiri), jadi `paused` **selalu true**. Host tetap **mengirim** event ke `#bg-music` → handler tema jalan lalu **menimpa** ikon yang baru di-set host | **Hapus mirror-nya.** Host sudah menulis `#play-icon`/`#pause-icon` + `.music-playing` sendiri. Biarkan host jadi satu-satunya penulis. Lihat §6.2 |
| Elemen tidak mau naik/geser padahal `transform` sudah diset | Elemen punya class `.reveal-item`, dan `.reveal-item.is-visible { transform: none }` (spesifisitas 0,2,0) **membatalkan** `transform` kita | Geser pakai **`margin`**, bukan `transform`. (Elemen tanpa `.reveal-item` aman pakai transform.) |
| Dekorasi `left`/`right` diabaikan — semua numpuk di kiri-atas | Aturan borongan `.section-red > * { position: relative }` **menimpa** `position:absolute` milik dekorasi → `left/-right` cuma menggeser dari posisi flow-nya | **Kecualikan** tiap layer dekoratif: `> *:not(.mg-red-bg):not(.mg-motif):not(.mg-spray)`. **Pola berulang** — sama persis dengan bug cover di §3. |
| Dua elemen renggang padahal ingin dempet | Keduanya sama-sama `margin-top: auto` di flex column | Beri `margin-top:auto` **hanya pada elemen pertama**; yang kedua menempel. Untuk menaikkan grup: `margin-bottom` di elemen kedua. |
| Border/motif menutupi konten | padding section < tinggi band | Band aspek ~1.5:1 → di lebar 480px tingginya ~150px → padding ≥165px |

### 6.1. Kunci scroll cover — WAJIB `overflow-y`, BUKAN `overflow`

Ditemukan 2026-07-15; **laten di `timeless`, `minang-heritage`, `bali-heritage`**.
Di `lake-como` kuncinya ada tapi aturan CSS-nya **mubazir** (`overflow:hidden`
kalah dari `overflow-y:auto`) — "seolah jalan" hanya karena `lockScroll()` juga
menulis `style.overflowY` inline. Sudah dibetulkan jadi `overflow-y`.

```css
.mock-app-screen:not(.reveal-content) { overflow-y: hidden; }   /* BENAR */
```

`overflow: hidden` **TIDAK bekerja** di sini (sudah diuji dengan jsdom):
shorthand `overflow` di-expand jadi `overflow-x` + `overflow-y`, lalu
`overflow-y: auto` milik `.mock-app-screen` **menang** → kunci tidak berefek.
Gunakan `overflow-y` eksplisit, **tanpa** `!important` (host masih perlu bisa
menimpa).

> Perhatikan **siapa scroller-nya**. Di keluarga `timeless` (termasuk tema ini)
> scroller = `.mock-app-screen` (`overflow-y:auto`), sedangkan `.phone-container`
> justru `overflow:hidden`. Di `lake-como` KEBALIKANNYA — scroller-nya
> `.phone-container`. Menyalin polanya mentah-mentah = kunci dipasang di elemen
> yang salah dan **tidak berfungsi**. Cek dulu blok CSS-nya.

Host melepas kunci sendiri (`ThemeWrapper` ~baris 265):
`appScreen.classList.add('reveal-content')` → **tidak perlu JS di tema**.

### 6.2. Musik: host satu-satunya penulis ikon — tema JANGAN mirror

Ditemukan 2026-07-15. **Sudah diperbaiki di 4 tema**: `timeless`, `lake-como`,
`minang-heritage`, `bali-heritage`. Ragam bug per tema:

| Tema | mirror `.paused` | default ikon terbalik | `bgMusic.play()` (langgar kontrak) | logika ikon terbalik |
|---|---|---|---|---|
| `timeless` | ya | ya | – | – |
| `minang-heritage` | ya | ya | – | – |
| `bali-heritage` | ya | ya | – | – |
| `lake-como` | ya | ya | **ya** (2 tempat: klik + autoplay saat buka) | **ya** |

Gejala khas: **musik berbunyi (fungsi benar) tapi ikon nyangkut di "play"**.

Fakta host yang menentukan (sudah diverifikasi di kode, bukan asumsi):
- `InvitationPage.tsx` memutar **`new Audio(musicLink)` miliknya sendiri** —
  `<audio id="bg-music">` di tema **tidak pernah** diputar → `audio.paused`
  **selalu `true`**.
- `ThemeWrapper.tsx` **sudah** meng-update ikon saat `isPlaying` berubah:
  `#play-icon`/`#pause-icon` `display` + class `.music-playing`.
- Tapi host **juga** `dispatchEvent('play'/'pause')` ke `#bg-music` → kalau tema
  punya listener, handler-nya jalan **setelah** host, baca `paused === true`,
  lalu **membalik ikon kembali**. Tema melawan host-nya sendiri.

**Aturan:** tema **tidak boleh** punya `musicMirror`. Yang perlu dari tema cuma:
1. ID verbatim `btn-toggle-music`, `play-icon`, `pause-icon`, `bg-music`;
2. **nilai awal ikon cocok dengan `isPlaying = false`** → `play-icon`
   `display:block`, `pause-icon` `display:none`. (Kalau dibalik, ikon terlihat
   "pause" padahal musik belum jalan.)

> Cek statis: buang komentar **dulu** sebelum `grep` `audio.paused` — komentar
> penjelasan ikut ke-match dan bikin alarm palsu (§7).

---

## 7. Validasi WAJIB sebelum serah-terima

Headless screenshot **tidak jalan** di mesin ini (selalu blank) — verifikasi visual
harus lewat Theme Editor / user. Maka cek statis ini wajib:

```bash
cd src/sample-theme/<nama>
node -e '
const fs=require("fs");
for (const f of ["index.html","index.css","index.js"]) {
  const s=fs.readFileSync(f,"utf8");
  const ch=[]; for(let i=0;i<s.length;i+=50000) ch.push(s.substring(i,i+50000));
  const risky=ch.map((c,i)=>({i,f:c[0]})).filter(x=>["=","+","-","@"].includes(x.f));
  console.log(f.padEnd(11), s.length.toString().padStart(7), "->", ch.length, "chunk",
    risky.length ? "RISKY: "+risky.map(r=>"chunk"+r.i+" \x27"+r.f+"\x27").join(",") : "aman");
}
const css=fs.readFileSync("index.css","utf8"), html=fs.readFileSync("index.html","utf8"), js=fs.readFileSync("index.js","utf8");
const o=(css.match(/{/g)||[]).length, c=(css.match(/}/g)||[]).length;
console.log("CSS braces:", o, c, o===c?"OK":"MISMATCH");
console.log("no webp base64 in CSS:", !/data:image\/webp;base64/.test(css));
const ids=["btn-show-qr","btn-show-menu","btn-toggle-music","bg-music","play-icon","pause-icon",
           "btn-submit-ucapan","wish-name","wish-message","btn-submit-kehadiran","rsvp-status","rsvp-guests","rsvp-code"];
console.log("host IDs:", ids.every(i=>html.includes("id=\""+i+"\"")) ? "OK" : "ADA YANG HILANG");
console.log("cleanup hook:", /__[a-z]+Cleanup/.test(js) ? "OK" : "TIDAK ADA");
// Buang komentar dulu — kalau tidak, kalimat "NEVER call audio.play()" di komentar
// ikut ke-match dan bikin alarm palsu. Lalu daftarkan SEMUA target .play().
const code = js.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
const plays = [...code.matchAll(/(\w+)\.play\(\)/g)].map(m=>m[1]);
const bad = plays.filter(t=>/audio|music|sound|bg/i.test(t));
console.log("target .play():", plays.length?plays.join(", "):"(tidak ada)",
            bad.length ? "-> MELANGGAR kontrak musik host" : "-> aman (tak menyentuh audio host)");
console.log("slot asset:", [...new Set(html.match(/asset_image_\d+/g)||[])].sort().join(", "));
'
```
Semua harus: **1 chunk / aman**, brace seimbang, tanpa webp base64, ID host lengkap,
cleanup hook ada, tidak ada `audio.play()`.

> Regex gampang "false alarm" (mis. mengira kata `audio.play()` di **komentar** =
> pelanggaran, atau match lintas-rule). Kalau ada yang merah, **buka blok aslinya**
> (`sed -n '/^\.selector {/,/^}/p'`) dan pastikan — jangan langsung percaya skrip.

**Dua koreksi penting untuk skrip di atas** (ketahuan saat memeriksa `lake-como`):

1. **Jebakan formula hanya berlaku untuk chunk LANJUTAN**, bukan chunk 0.
   Chunk 0 masuk kolom `<x>_template` biasa; hanya `_extra_*` yang rawan.
   CSS yang diawali `@import` (chunk 0 = `@`) **aman** — skrip §7 yang naif
   melaporkannya "RISKY" padahal bukan. Filter `chunk.index > 0` dulu.
2. **Buang komentar sebelum cek `audio.paused` / `audio.play()`** — kalau tidak,
   komentar penjelasan (yang justru menerangkan bug-nya) ikut ke-match.

> `lake-como` juga **2 chunk** (HTML 59K) dan **tanpa cleanup hook** — itu
> kondisi bawaan, bukan regresi. Chunk lanjutannya diawali `"v>"` → aman.

---

## 8. Checklist penyalinan tema baru

- [ ] `grep` CSS **dan** HTML source → daftar aset asli (jangan lewatkan file `.css`)
- [ ] Download aset ke `asset/`; **lihat** tiap gambar; tulis `asset/ASSET.md` (peta slot)
- [ ] Ambil palet warna dari source
- [ ] Salin **resep CSS** efek rumit dari source (jangan mengarang)
- [ ] Clone tema terdekat; **rename** cleanup hook + ID internal
- [ ] Pasang aset via `{{asset_image_N}}` **inline style di HTML** (CSS tak di-parse)
- [ ] Pertahankan ID host verbatim + cleanup hook + jangan sentuh `bg-music`
- [ ] Jaga tiap file **< 50.000 char** (tanpa base64 besar)
- [ ] Jalankan validasi §7 → semua hijau
- [ ] Serahkan: user Inject tema + upload `asset/` ke slot sesuai `ASSET.md`

---

## 9. Cara kerja slot asset (ringkas)

Backend menyimpan aset di kolom `asset_media_list`; `InvitationPage.tsx`
mengubahnya jadi variabel `{{asset_<media_code>}}` (gambar → base64, video/YouTube →
URL mentah). User meng-upload file ke **slot bernomor** lewat Theme Editor; tema
memanggilnya `{{asset_image_N}}`.

**Slot kosong = string kosong, bukan error** → dekorasinya sekadar tidak tampil,
tema tetap jalan. Karena itu wajib ada `ASSET.md` sebagai peta upload.

---

## 10. Bukti pakai: `bali-heritage` (klon ke-2, 2026-07-15)

Playbook ini dipakai ulang untuk menyalin source **"Bali Heritage"** → tema
`src/sample-theme/bali-heritage/`. Hasil: **jauh lebih cepat**, tanpa satu pun
jebakan §1/§3/§4/§6 terulang. Catatan yang menambah playbook:

### 10.1. Source dari vendor yang sama = klon nyaris mekanis

Bali & Minang sama-sama terbitan **inviee** → skema nama file identik
(`<DAERAH>-BACKGROUND/PATTERN/MOTIF-ATAS/MOTIF-BAWAH/ICON/COUPLE-N.webp`),
struktur Elementor sama, bahkan **video motion** ada di pola URL yang sama
(`assets.inviee.id/heritage/<Daerah>-Motion-HD.mp4`). Kalau source berikutnya
juga inviee: **clone `minang-heritage`/`bali-heritage`, lalu tukar palet + aset**.
Resep §4 tinggal ganti 2 warna:

| | Minang | Bali |
|---|---|---|
| radial | `#8D4A4A` → `#471C1C` | `#AD7E99` → `#633750` |
| overlay | `#471C1C` | `#633750` |
| emas | `#c79369` | `#D7BB83` → `#A38C5E` |
| serif | Cormorant Garamond | Cormorant **Infant** |

`150px auto` + `opacity .3` + `mix-blend-mode: multiply` **sama persis** — itu
resep rumah inviee, bukan kebetulan.

### 10.2. BARU: pattern yang "putih polos" itu BENAR, jangan diperbaiki

`BALI-PATTERN.webp` dibuka sendiri = **putih bersih**. Sempat terlihat seperti
file rusak. Cek header WebP membuktikan file utuh (VP8X 1000×1000, 93KB):
motifnya memang **sangat pucat** dan baru muncul setelah `multiply` di atas
ground plum. Sama untuk `MINANG-PATTERN`. **Jangan** ganti/naikkan kontras aset —
itu justru merusak resep source. (Verifikasi cepat: baca magic bytes + dimensi,
jangan cuma "lihat" gambarnya.)

### 10.3. BARU: jangan mengarang istilah budaya

Sempat menulis eyebrow **"Mepandes Sareng Kalih"** untuk section Mempelai —
padahal *mepandes* itu upacara **potong gigi**, bukan pernikahan; di undangan
nikah itu salah fatal. `grep` ke source membuktikan source **tidak memakai
istilah Bali sama sekali** (copy-nya Islami/Indonesia: "Akad Nikah", QS. Ar-Rum
21) dan eyebrow aslinya cuma **"mempelai"**. **Aturan: ambil kata dari source,
jangan menambah "bumbu" budaya dari ingatan.** Yang di-"Bali"-kan cukup
**dekorasinya** (Meru, anggrek, damask emas, palet plum).

> Kaitannya dengan §3 (salin resep, jangan mengarang) — prinsip yang sama,
> tapi untuk **teks**, bukan CSS.

### 10.4. BARU: verifikasi render, bukan cuma regex

Selain §7, kali ini template di-render via **parser tiruan + jsdom** lalu di-assert
(ID host, urutan DOM 3-layer, slot aset, urutan Cover→Hero→Video, ID duplikat,
casing RSVP). Ini menangkap hal yang regex tak bisa lihat.

**Tapi harness-nya sendiri bisa salah:** regex `{{#hidden}}` tiruanku tak bisa
nesting → melaporkan sisa `{{/hidden}}` seolah tema rusak. Parser asli
(`templateParser.ts`) pakai tokenizer blok sungguhan, dan hitungan tag Bali
**seimbang (3 `#hidden` + 3 `^hidden` = 6 `/hidden`)**, identik dengan Minang
yang sudah jalan di produksi. **Konsisten dengan §7: kalau alarm menyala,
buktikan dulu — sering harness-nya yang salah, bukan temanya.**

### 10.5. Checklist rename saat clone tema (yang benar-benar perlu)

Prefix `mg-` → `bl-`, plus:
- JS: `__minangCleanup`→`__baliCleanup`, `__mgCountdownTimer`→`__blCountdownTimer`
- ID internal: `mg-wed-date`→`bl-wed-date`, `mg-jam-resepsi`→`bl-jam-resepsi`
  (**HTML dan JS harus direname bersamaan** — JS membaca ID ini)
- `@keyframes mgFloat` → `blFloat`
- **Cek warna hardcoded di inline style HTML** — `--var` tidak menangkap semuanya
  (ketemu sisa `#fff8ef` di sidebar).
- **Cek kata di komentar**: rename `Minang`→`Bali` tidak kena `Minangkabau`.
  Komentar yang bohong lebih berbahaya daripada tidak ada komentar.
