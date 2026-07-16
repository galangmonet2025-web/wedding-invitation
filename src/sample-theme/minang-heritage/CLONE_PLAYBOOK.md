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

---

## 11. Bukti pakai: `jawa-heritage` (klon ke-3, 2026-07-15)

Source **"Java Heritage"** → `src/sample-theme/jawa-heritage/`. **Semua cek §7 +
§10.4 hijau di percobaan pertama**, tanpa satu pun jebakan terulang. Palet §10.1
terbukti lagi (inviee): tinggal tukar 2 warna + aset.

| | Minang | Bali | **Jawa** |
|---|---|---|---|
| radial | `#8D4A4A`→`#471C1C` | `#AD7E99`→`#633750` | `#8B5B43`→`#472A1C` |
| overlay | `#471C1C` | `#633750` | **`#5C4324`** ← beda! |
| emas | `#c79369` | `#D7BB83`→`#A38C5E` | `#D7BB83`→`#A38C5E` |

### 11.1. BARU: jangan asumsikan aset klon berikutnya SAMA PERANNYA

§10.1 bilang klon inviee "nyaris mekanis" — **itu benar untuk resep CSS, TIDAK
untuk peta aset.** Di Jawa tiga hal berbeda dan cuma ketahuan karena tiap gambar
benar-benar **dilihat** (§2 langkah 2):

1. **Tidak ada `JAWA-ICON.webp`.** Peran "mahkota" dipegang `JAWA-GUNUNGAN.webp`
   (nama file baru, tak ada padanannya di Minang/Bali).
2. **`JAWA-COUPLE-1` BUKAN bunga** — itu gunungan miring. Yang bunga justru
   `COUPLE-2`. Kalau menyalin peta slot Bali mentah-mentah, aksen sudut jadi
   bunga dan frame cover jadi gunungan — tertukar.
3. **`COUPLE-1` + `COUPLE-3` = PASANGAN CERMIN ASLI** (miring kiri & kanan).
   Minang/Bali cuma punya 1 gambar lalu dicerminkan CSS `scaleX(-1)`.
   → Jawa pakai **8 slot** (bukan 7), dan `.jw-spray-l` **wajib TANPA**
   `scaleX(-1)` — kalau tidak, artwork yang sudah benar malah terbalik.

> **Aturan: resep CSS boleh disalin, peta slot WAJIB diverifikasi ulang per
> source.** Nama file yang mirip ≠ peran yang sama.

### 11.2. BARU: awas CSS mepet 50K setelah reskin

Reskin **menambah** ukuran (komentar penjelasan + nama kelas lebih panjang):
`index.css` sempat **49.816** — cuma **184 char** dari batas §1.2. Satu edit kecil
berikutnya → 2 chunk → jebakan `#ERROR!` hidup lagi.

**Cek headroom, bukan cuma "1 chunk aman":**
```bash
node -e 'const s=require("fs").readFileSync("index.css","utf8");
console.log(s.length, "| headroom:", 50000-s.length)'
```
Kalau < ~1000 char, buang komentar yang mubazir (mis. blok NOTE base64 yang sudah
diulang di header). Di sini dipangkas → 49.418 (headroom 582).

### 11.3. §10.3 terbukti lagi: source Jawa juga TIDAK pakai istilah daerah (lihat juga §12.3)

`grep` (panggih/siraman/midodareni/pawiwahan) → **nihil**. Copy-nya Islami/Indonesia
persis Minang & Bali (QS. Ar-Rum 21, "Akad Nikah"), eyebrow-nya cuma **"mempelai"**.
Jadi tiga source inviee ini **seragam**: yang "kedaerahan" hanya **dekorasinya**.
Untuk source inviee berikutnya, **anggap default-nya begitu** — tetap `grep` untuk
memastikan, tapi jangan mulai dengan mengarang istilah.

---

## 12. Bukti pakai: `sunda-heritage` (klon ke-4, 2026-07-15)

Source **"Sunda Heritage"** → `src/sample-theme/sunda-heritage/`. Skeleton di-clone
dari **`jawa-heritage`** (bukan Minang) karena Jawa sudah memecahkan masalah
"pasangan cermin asli" yang juga dipunyai Sunda. Semua cek §7 + §10.4 hijau.

| | Minang | Bali | Jawa | **Sunda** |
|---|---|---|---|---|
| radial | `#8D4A4A`→`#471C1C` | `#AD7E99`→`#633750` | `#8B5B43`→`#472A1C` | `#CFA476`→`#997949` |
| overlay | `#471C1C` | `#633750` | `#5C4324` | `#997949` (= tepi radial) |
| pattern | 150px / .3 | 150px / .3 | 150px / .3 | **200px / .35** ← beda! |
| slot | 7 | 7 | 8 | **9** |

### 12.1. BARU: "resep rumah inviee" TIDAK sepenuhnya konstan — cek angkanya

§10.1 menyimpulkan `150px auto` + `opacity .3` + `multiply` itu "resep rumah
inviee, bukan kebetulan". **Untuk Sunda itu SALAH**: source-nya
`background-size: 200px auto` + `opacity: 0.35`. `multiply`-nya tetap sama.

> Yang konstan cuma **bentuk** resepnya (radial ground + overlay pattern
> multiply), **bukan angkanya**. Tetap `grep` resep tiap source (§3) — jangan
> menyalin angka dari tema saudara. Ini kembaran §11.1, tapi untuk **CSS**:
> §11.1 = peta slot wajib diverifikasi, §12.1 = angka resep wajib diverifikasi.

### 12.2. BARU: skema nama file inviee bisa berganti total antar-angkatan

Minang/Bali/Jawa = upload **2024/12**, pola `<DAERAH>-BACKGROUND/PATTERN/MOTIF-*`.
Sunda = upload **2025/08**, polanya **beda total** — tak ada satu pun nama yang
sepadan:

| Peran | Minang/Bali/Jawa | **Sunda** |
|---|---|---|
| latar halaman | `<D>-BACKGROUND.webp` | `MOTION-SUNDA-1-FIXED-BG.webp` |
| band atas/bawah | `<D>-MOTIF-ATAS/BAWAH.webp` | `Sunda-Heritage-Top-6/Bottom-6.webp` |
| pattern | `<D>-PATTERN.webp` | `SUNDA-PATTERN-**2**.webp` |
| aksen sudut | `<D>-COUPLE-N.webp` | `Sunda-1-Couple-Depan/Belakang(-Flip).webp` |

→ **Jangan tebak URL aset dari pola tema sebelumnya** (semua akan 404). Selalu
mulai dari §2 langkah 1b (`grep url(...)` di file `.css` source).

### 12.3. §11.1 terbukti lagi, malah DUA pasang cermin

Sunda menyediakan artwork kiri & kanan asli untuk **dua** peran sekaligus →
**9 slot** (Jawa 8, Minang/Bali 7). Jadi `.sn-flower-br` **wajib dibuang**
`scaleX(-1)`-nya (warisan Jawa yang cuma punya 1 gambar untuk peran itu) —
kalau tidak, artwork `-Depan.webp` yang sudah benar malah terbalik.

`Depan` vs `Belakang` = **dua rangkaian bunga berbeda** (Depan lebih besar &
rapat), bukan duplikat. Ketahuan cuma karena tiap gambar **dilihat**.

`SUNDA-ICON.webp` = **siger + bendo** (mahkota pengantin) — perannya sama dengan
`JAWA-GUNUNGAN` (mahkota cover/hero/closing/menu + siluet sidebar).

### 12.4. BARU: rename `Jawa`→`Sunda` MENINGGALKAN istilah budaya di komentar

§10.5 sudah mewanti "cek kata di komentar", tapi di sini skalanya besar: setelah
sed `Jawa`→`Sunda`, komentar **masih** berisi `gunungan`, `kawung`, `wayang`,
`sogan`, `joglo`, `tree-of-life`, `pink-lily` — semuanya istilah **Jawa** yang
salah untuk Sunda, dan beberapa **membohongi** pembaca berikutnya (mis. komentar
"overlay sengaja BEDA dari tepi radial" — untuk Sunda keduanya **sama**).

Daftar sapuan yang perlu (di luar prefix & hook):
```bash
grep -inE 'jawa|javanese|kawung|wayang|gunungan|sogan|joglo|tree-of-life|lily|batik' index.*
```
Padanan Sunda: gunungan→**siger**, kawung/batik band→**motif band**,
joglo→**imah panggung**, sogan→**gold/emas**, pink-lily→**marigold-anggrek**.
Sisakan sebutan "Jawa/Minang/Bali" **hanya** kalau memang komentar pembanding.

### 12.5. BARU: `#btn-show-qr` DUPLIKAT itu normal — jangan "diperbaiki"

Harness §10.4-ku melaporkan `#btn-show-qr` 2× sebagai pelanggaran (mengira kasus
memory `game-theme-clone-invsource-duplicate-id`). **Alarm palsu** — sudah
dibuktikan di kode host, bukan diasumsikan:

- Host **mendelegasikan** tombol: `target.closest('#btn-show-qr')`
  (`ThemeWrapper.tsx:521` & `:809`) → dua tombol dua-duanya jalan.
- Yang **wajib unik** cuma elemen yang dibaca host **by value** via
  `getElementById`: `wish-name`, `wish-message`, `rsvp-status`, `rsvp-guests`,
  `rsvp-code`, `bg-music`, `play-icon`, `pause-icon`. Di situlah duplikat bikin
  host membaca **salinan kosong**.
- Minang & Jawa juga 2× dan **hidup di produksi**.

Tombol inline + tombol floating memang sengaja berbagi ID. **Aturan: pisahkan
cek "unik" (by-value) dari cek "ada" (delegated).**

### 12.6. Catatan harness §10.4 (dua alarm palsu lagi)

Konsisten dengan §7 & §10.4 — **harness-nya** yang salah, bukan temanya:

1. **`{{...}}` di dalam komentar CSS** dilaporkan "CSS ikut ke-parse". Itu cuma
   dokumentasi. **Buang komentar dulu** sebelum cek (persis §7 koreksi 2, tapi
   untuk CSS).
2. **`.mock-app-screen` dobel**: `index.html` tema **sudah** punya elemen itu;
   harness-ku membungkusnya lagi → cek "`.sn-page-bg` anak pertama" gagal padahal
   benar. Render `index.html` **apa adanya**, jangan dibungkus.
3. Hitungan tag `{{#hidden}}`/`{{/hidden}}` **terlihat timpang (3 vs 6)** →
   **normal**: parser asli (`templateParser.ts:56`) memakai regex
   `\{\{\s*([#\^])(if|each|unless|hidden)\s+...` — `#` **dan** `^` sama-sama
   pembuka. Jadi 3 `#` + 3 `^` = 6 `/` **seimbang**. Identik dengan §10.4.

**Yang terbukti manjur:** jangan bikin parser tiruan — **transpile
`templateParser.ts` asli** dengan `typescript` milik repo lalu render:
```js
const ts = require('<repo>/node_modules/typescript');
const js = ts.transpileModule(src, {compilerOptions:{module: ts.ModuleKind.CommonJS}}).outputText;
const mod = {exports:{}}; new Function('exports','module','require', js)(mod.exports, mod, require);
mod.exports.parseTemplate(html, data);   // lalu assert pakai jsdom
```
(Mesin ini **tidak punya** `python`, `tsx`, atau `--experimental-strip-types`;
`require` dari scratchpad harus pakai path absolut ke `node_modules` repo.)

### 12.7. Video motion: URL ikut ter-rename otomatis — pastikan hidup

Pola §10.1 (`assets.inviee.id/heritage/<Daerah>-Motion-HD.mp4`) **masih berlaku**
di angkatan 2025 walau nama aset lain berubah total. sed `Jawa`→`Sunda` kebetulan
menghasilkan URL yang benar; **tetap buktikan**, jangan diandalkan:
```bash
curl -sIL -o /dev/null -w "%{http_code} %{content_type}\n" \
  "https://assets.inviee.id/heritage/Sunda-Motion-HD.mp4"   # -> 200 video/mp4
```
`MOTION-SUNDA-1-FALLBACK.webp` = poster/fallback video, **bukan** slot aset.

---

## 13. Bukti pakai: 6 tema sekaligus (klon ke-5..10, 2026-07-15)

`banjar`, `batak`, `betawi`, `bugis`, `dayak`, `palembang` — dibuat **paralel**
(6 builder + 6 reviewer adversarial), skeleton = `sunda-heritage`. Semua lolos
§7 + §10.4 + harness render independen.

| tema | prefix | radial center → edge | overlay | slot |
|---|---|---|---|---|
| banjar | `bj-` | `#722C2C` → `#361111` | `#361111` | 7 |
| batak | `bt-` | `#B3534F` → `#98121C` | `#98121C` | 8 |
| betawi | `bw-` | `#5D946C` → `#2A623A` | `#2A623A` | 7 |
| bugis | `bu-` | `#6A9951` → `#29421C` | `#29421C` | 8 |
| dayak | `dy-` | `#727272` → `#1B1B1B` | `#1B1B1B` | 7 |
| palembang | `pl-` | `#8A1B26` → `#4C030A` | `#4C030A` | 7 |

**Keenamnya `150px auto` / `opacity .3` / `multiply`** → §12.1 makin kuat:
Sunda (200px/.35) memang **satu-satunya** pengecualian sejauh ini. Tetap `grep`.

### 13.1. BARU: inviee punya (minimal) TIGA angkatan, bukan dua

| angkatan | contoh | skema nama |
|---|---|---|
| 2024/12 | minang, bali, jawa, **batak**, **bugis** | `<DAERAH>-BACKGROUND/PATTERN/MOTIF-ATAS/COUPLE-N.webp` (UPPERCASE) |
| 2025/02 | **banjar**, **betawi**, **dayak**, **palembang** | `<Daerah>-Background/Seamless-Pattern/Motif-Atas/Couple-Belakang-N.webp` (Titlecase) |
| 2025/07-08 | sunda, chinese | nama bebas (`MOTION-SUNDA-1-FIXED-BG`, `chinese-bg-all-<hash>`) |

Konsekuensi penomoran slot:
- **2024/12 punya `COUPLE-2`** (bunga terpisah) → **8 slot**; frame cover pakai
  slot 8 **dua kali** → `.flower-br` **WAJIB** `scaleX(-1)`.
- **2025/02 TIDAK punya** padanan `COUPLE-2` → **7 slot**; frame cover memakai
  ulang pasangan cermin slot 4/5 → **TANPA** `scaleX(-1)`.

> Jadi aturan scaleX bukan "selalu jangan": **1 gambar dipakai 2× → PERLU
> scaleX; 2 artwork cermin asli → JANGAN scaleX.** Cek dulu tema ini punya
> berapa artwork untuk peran itu.

### 13.2. BARU (PENTING): nomor `COUPLE-N` TIDAK konsisten antar-tema

Source CSS membuktikan slot kiri/kanan **terbalik** antara dua tema seangkatan:

| tema | KIRI (25% 60%) | KANAN (75% 60%) |
|---|---|---|
| batak | `BATAK-COUPLE-3` | `BATAK-COUPLE-1` |
| **bugis** | **`BUGIS-COUPLE-1`** | **`BUGIS-COUPLE-3`** |
| banjar/betawi/dayak/palembang | `…-Couple-Belakang-2` | `…-Couple-Belakang-1` |

Dan `BUGIS-COUPLE-1` **byte-identik** dengan `BATAK-COUPLE-3` (83.228 bytes) —
artwork sama, penomoran beda. **Menyalin peta slot antar-tema = artwork
terbalik.** Selalu ambil dari `background-position` di CSS source tema itu.

### 13.3. BARU: aset bisa ngumpet di HTML, bukan cuma CSS (§2 langkah 1b kurang)

`<Daerah>-Icon.webp` (mahkota) **tidak muncul** di sapuan `grep url(...) *.css` —
di angkatan 2025/02 ikon dipasang sebagai `<img src=...>` di **HTML**. Nyaris
terlewat; ketahuan karena curiga "kok tema lain punya ICON". Sapu **dua-duanya**:
```bash
grep -rhoiE '[A-Za-z0-9-]+\.(webp|png)' "Nama Situs.html" | sort -u   # <img src>
```
Lalu **buktikan** URL tebakan hidup (`curl -sIL -w '%{http_code}'`) **dan**
file-nya benar gambar — 404 WordPress balasnya **HTTP 200 + halaman HTML**, jadi
`http_code` saja menipu. Cek magic bytes:
```bash
head -c 4 file.webp   # harus RIFF; kalau '<!DO' itu halaman 404
```
Ini kejadian: `Betawi-Background.webp` (tebakan) → 404 HTML, sedangkan nama
**asli**-nya `Betawi-Backgroud.webp` — **typo milik source**. Jangan "betulkan"
nama file source.

### 13.4. Nama file source yang menyimpang (jangan diseragamkan)

| tema | menyimpang |
|---|---|
| betawi | `Betawi-Backgroud.webp` (typo asli) |
| palembang | `Palembang-Motif-Bawah-**1**.webp`, `Palembang-**Pattern-Seamless**.webp` (dibalik dari `Seamless-Pattern`) |

### 13.5. Prefix: awas bentrok dengan ID host

Prefix bugis **tidak boleh** `bg-` → bentrok `#bg-music` (ID host) dan
`.<p>-red-bg`. Dipakai `bu-`. Cek prefix baru terhadap daftar ID host §1.3.

### 13.6. Harness §10.4: DUA alarm palsu baru (punyaku sendiri, lagi)

Konsisten dengan §7/§10.4/§12.6 — kalau alarm menyala, **buktikan dulu**:

1. **"leftover sunda"** — 6 tema kena, semuanya **PALSU**. Yang ke-match itu
   komentar *lineage/pembanding* yang justru **diminta** §12.4 (mis. `Cloned in
   structure from "sunda-heritage"`, `150px/.3 di sini — Sunda yang 200px/.35`).
   → cek leftover **hanya pada KODE**: buang komentar CSS/JS **dan** `<!-- -->`
   HTML dulu, lalu match identifier saja (`__sundaCleanup`, `sn-`, `snFloat`).
2. **`getElementById` "hilang"** (`wedding-calendar`, `story-carousel`):
   - `wedding-calendar` itu **cabang pertama rantai `||`**:
     `getElementById('wedding-calendar') || getElementById('<p>-wed-date')`
     (memory `theme-countdown-sources`). Absen **memang desainnya** di keluarga
     `timeless`; ada di `black-gold`/`netflix`/dll. Cukup **rantainya** resolve.
   - `story-carousel` ada di balik `{{#if flag_pakai_additional_feature_story_balasan_instagram}}`
     → fixture render harus **menyalakan flag**-nya, kalau tidak elemennya tak
     pernah ada. **Ambil nama flag dari tema** (`grep '{{#if' index.html`),
     jangan mengarang (`flag_use_story` dsb **tidak ada**).

**Kalibrasi harness: uji dulu ke tema yang SUDAH benar** (`sunda`, `jawa`) —
kalau di situ merah, harness-nya yang salah. Tapi **jangan** samakan parameter:
`minang`/`bali` (7 slot) **memang** 1 gambar + `scaleX(-1)`, jadi "gagal" di cek
pasangan-cermin = benar, bukan bug (§13.1).

### 13.7. Cara kerja yang terbukti untuk batch besar

6 builder paralel + **6 reviewer adversarial** (1:1 per tema) + **harness
independen** milik sendiri. Reviewer meloloskan semuanya, dan harness-ku juga —
setelah 2 alarm palsu **milik harness** dikoreksi. Kunci: SPEC ditulis **sekali**
dari source (§13.2/§13.4 di dalamnya), lalu builder **dilarang** menurunkan
angka sendiri.

---

## 14. Bukti pakai: `jawa-blue-heritage` ("Blue Javanese", klon ke-11, 2026-07-15)

Angkatan **2025/07-08** (seangkatan `chinese`). Ini klon pertama yang **BUKAN**
keluarga resep 3-layer — jadi §4 **tidak berlaku**. Lolos §7 + harness render.

### 14.1. BARU: cek folder source LAGI sebelum bilang "tinggal N tema"

User menambah `jawa-blue` **di tengah sesi**, setelah listing awalku. Untung
user menyuruh cek ulang. **Sebelum menyimpulkan sisa pekerjaan, `ls` ulang** —
folder source itu hidup, bukan snapshot.

### 14.2. BARU: angkatan 2025/07-08 = struktur beda, bukan sekadar tukar warna

| | heritage (minang..palembang) | **jawa-blue** |
|---|---|---|
| panel | `radial-gradient` + pattern `multiply` | **flat `#4E647A`**, teks putih |
| pattern | `<D>-PATTERN` 150px/.3/**multiply** | `batik-overlay3` **35% auto**, **opacity .15**, **TANPA** `mix-blend-mode` |
| motif band | 2 aset (atas/bawah) | **TIDAK ADA** |
| mahkota/ICON | ada | **TIDAK ADA** |
| aksen sudut | pasangan cermin | **TIDAK ADA** |
| video | `assets.inviee.id/**heritage**/<D>-Motion-HD.mp4` | `assets.inviee.id/**motion**/Blue-Javanese-HD-1.mp4` |
| slot | 7–9 | **5** |

**Konsekuensi yang gampang terlewat:** menghapus band = **wajib** buang
`.has-motif { padding: 165px }` juga; kalau tidak, tersisa lubang kosong 165px
atas-bawah. Menghapus mahkota = ada `margin-top:auto` yang **berpindah pemilik**
(§6 "dua elemen renggang") — di sini `.closing-inner` yang mengambil alih.

> `chinese` (seangkatan) bahkan lebih jauh: tak ada Akad/Resepsi, tak ada QS
> Ar-Rum, ada "Our Story". jawa-blue **masih** punya Akad/Resepsi/QS Ar-Rum 21 →
> copy skeleton heritage tetap cocok. **Cek copy-nya, jangan asumsi per angkatan.**

### 14.3. §13.1 dikonfirmasi dari sisi sebaliknya

jawa-blue cuma punya **1** artwork bunga (`bunga-jawa-biru.webp`) untuk 2 sudut
→ `.jb-flower-br` **WAJIB** `scaleX(-1)`. Jadi aturannya tetap:
**1 gambar dipakai 2× → PERLU scaleX; 2 artwork cermin asli → JANGAN scaleX.**
Hitung dulu asetnya, jangan hafal "jangan pakai scaleX".

### 14.4. BARU: reskin lintas-palet meninggalkan warna di tempat yang tak ter-`grep`

Setelah agen menyapu, **masih tersisa** coklat hangat warisan sunda:
- `rgba(46,26,16,...)` di **2 scrim** (`.opening-scrim`, `.card-inner::after`) →
  video & kartu cover ke-tint **coklat** di tema **biru**. Lolos karena yang
  disapu cuma `--var` + hex, sedangkan ini `rgba()` literal.
- `#fff9f2` di **inline style HTML** sidebar (§10.5 persis terulang).

**Sapuan yang benar** (bukan cuma hex):
```bash
# rgba() hangat: R jelas > B
grep -onE 'rgba\([0-9]+, ?[0-9]+, ?[0-9]+' index.css \
 | awk -F'[(,]' '{gsub(/ /,"",$2);gsub(/ /,"",$3);gsub(/ /,"",$4);
                  if ($2>$4+12 && $3>=$4 && $2>40) print $0}'
# hex hangat di HTML **dan** CSS (inline style tak kena --var)
grep -noiE '#(fbf6f0|f2e7dc|33241a|6b4a33|c2a568|c79369|e7b791|cfa476|997949|fff8f0|fdf6ee|fff9f2)' index.css index.html
```

### 14.5. Harness §10.4: 1 bug NYATA + 2 assert yang terlalu kaku

Agen builder menemukan **bug asli di harness-ku** (bukan alarm palsu):
- Nama hook diturunkan dari argumen CLI → tema ber-tanda-hubung menghasilkan
  `__jawa-blueCleanup`, **mustahil** jadi identifier JS. Cek itu cuma "lulus"
  untuk tema satu-kata — **kebetulan**, bukan karena benar.
  **Perbaikan:** assert **bentuknya**, lalu pastikan hook itu **dipanggil**:
  ```js
  const hook = (jsSrc.match(/window\.__(\w+)Cleanup\s*=/) || [])[1];   // temukan
  ok(!!hook, 'registers a global cleanup hook');
  ok(new RegExp('window\.__'+hook+'Cleanup\(\)').test(jsNoC), 'dipanggil saat entry');
  ```
- Cek `.spray-l/-r` & urutan motif band **mengasumsikan** tiap tema punya
  keduanya → jawa-blue "gagal" padahal memang tak punya. Jadikan **kondisional**
  (SKIP + alasan), jangan paksa tema menyesuaikan harness.

> **Uji harness-nya sendiri.** Cek yang tak bisa gagal = tak berguna. Sabotase
> sengaja lalu pastikan MERAH (mis. ganti panggilan hook → harus FAIL), **dan
> kembalikan filenya** (`cp` pakai path absolut — `cp` relatif setelah `cd`
> sempat gagal senyap dan file sabotase **hampir tertinggal**). Lalu jalankan
> **regresi ke semua tema lama** setelah mengendurkan assert, buktikan tidak ada
> yang jadi longgar.

---

## 15. Bukti pakai: `chinese-heritage` (klon ke-12 & TERAKHIR dari batch ini, 2026-07-16)

Angkatan **2025/07-08**, seangkatan `jawa-blue`. **Di-clone dari `jawa-blue`,
BUKAN sunda** — dan itu keputusan yang menghemat paling banyak: jawa-blue sudah
melewati semua pembongkaran struktural (buang motif band, mahkota, spray, panel
flat, cover-art terpisah). Lolos §7 + harness render **percobaan pertama**.

> **Aturan clone: pilih induk dari ANGKATAN yang sama, bukan yang "paling bagus".**
> minang→sunda (beda angkatan) = banyak bongkar. jawa-blue→chinese (seangkatan)
> = tinggal tukar palet/aset/copy.

### 15.1. BARU (PALING PENTING): source bisa beda AGAMA — cek, jangan asumsi

Sepuluh tema heritage sebelumnya seragam Islami (`Akad Nikah`, `Resepsi`,
`QS. Ar-Rum : 21`). §11.3 bahkan menyimpulkan "anggap default-nya begitu".
**`chinese` mematahkan itu** — terverifikasi dari HTML source:

| | 10 tema lain | **chinese** |
|---|---|---|
| akad | `Akad Nikah` | **`Holy Matrimony`** |
| ayat | `QS. Ar-Rum : 21` | **`~ 1 Corinthians 13:4-8 ~`** (`QS` = **0 hit**) |
| resepsi | ada | tidak ada |
| kisah | — | `We Found Love` |

Cek wajib per source baru:
```bash
grep -oiE 'QS\.[^<]{0,25}|Ar-Rum|Corinthians|Korintus|Holy Matrimony|Akad Nikah' "Nama Situs.html" | sort -u
```
**Ini keputusan produk, bukan teknis → TANYA USER.** (Di sini user memilih
"ikut source": Holy Matrimony + 1 Korintus.)

### 15.2. BARU: mengganti ayat ≠ mengarang ayat

Skeleton meng-hardcode terjemahan Ar-Rum. Godaannya: tulis terjemahan
1 Korintus 13:4-8 dari ingatan. **JANGAN** — itu §10.3 versi paling berbahaya
(mengarang teks kitab suci di produk yang dipakai orang).

Yang benar, dan memang begitu di source: **sitasinya** saja yang di tema
(`~ 1 Corinthians 13:4-8 ~`), **bunyi ayatnya dari tenant** (`{{quote_1}}` /
Master Quotes). Jadi: hapus string hardcode, biarkan variabel yang mengisi.

### 15.3. §14.4 terbukti lagi — dan ada tempat persembunyian BARU

Sapuan warna `--var`+hex **tetap** meninggalkan warna induk. Di sini ditemukan:
- `rgba(145,166,187,…)` = `#91A6BB` biru jawa-blue (hero glow, countdown inset)
- `rgba(31,41,51,…)` scrim slate
- `rgba(46,26,16,…)` / `rgba(71,42,28,…)` **coklat sunda** — masih menetes lewat
  jawa-blue, **dua generasi** setelah sumbernya
- **BARU: hex di dalam data-URI SVG** → `stroke='%234e647a'` di panah `<select>`.
  Tak kena `grep '#4e647a'` karena `#` ter-encode jadi `%23`.

Sapuan yang benar:
```bash
grep -noiE '#(4e647a|91a6bb)|%23(4e647a|91a6bb)|4e647a|91a6bb' index.css index.html
grep -onE 'rgba\([0-9]+, ?[0-9]+, ?[0-9]+' index.css      # cek literal warna induk
```
> **Warna induk itu menular lintas generasi klon.** Tiap klon baru mewarisi sisa
> klon sebelumnya. Sapu terhadap palet **semua** leluhur, bukan cuma induk langsung.

### 15.4. minang & bali "gagal" di harness = parameter salah, BUKAN regresi

Kalau menjalankan harness §12.6 ke `minang`/`bali` dengan asumsi pasangan-cermin,
akan MERAH (`spray L/R use DIFFERENT artwork`, `no scaleX(-1)`). **Itu benar
adanya**: keduanya desain LAMA → `l=slot4 r=slot4` (**1 gambar**) + `scaleX(-1)`,
sesuai §13.1. Sudah ada di git jauh sebelum batch ini. **Jangan "perbaiki".**

### 15.5. Status akhir katalog heritage (12 tema)

| angkatan | tema | slot | pola |
|---|---|---|---|
| 2024/12 | minang, bali | 7 | 3-layer, 1 gambar + `scaleX(-1)` |
| 2024/12 | jawa, batak, bugis | 8 | 3-layer, pasangan cermin asli |
| 2025/02 | banjar, betawi, dayak, palembang | 7 | 3-layer, pasangan cermin asli |
| 2025/07-08 | sunda | 9 | 3-layer, **200px/.35** (pengecualian) |
| 2025/07-08 | **jawa-blue** | 5 | flat panel, tanpa band/mahkota |
| 2025/07-08 | **chinese** | 4 | flat panel, tanpa band/mahkota/bunga |

Semua lolos harness render (`verify-theme.cjs`, parser asli + jsdom), kecuali
minang/bali yang butuh parameter desain-lama (§15.4).
