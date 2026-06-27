---
name: asset-adjust-skill
description: >
  Pasang "alat penyesuaian aset" ke tema GAME undangan yang SUDAH jadi (3 file index.html +
  index.css + index.js, sprite-nya masih digambar prosedural via code). Gunakan setiap kali user
  minta menambah/mengatur aset gambar tema game yang baru di-generate (mis. "tambahkan adjustment
  asset image", "buatkan sprite sheet dari game ini + slider posisi sprite", "asset adjuster"). DUA
  output yang LANGSUNG dimodif ke 3 file tema: (1) EXPORTER — tombol yang meng-generate satu PNG
  sprite sheet dari tekstur prosedural game saat ini, tiap frame diberi BORDER UNGU sebagai penanda
  batas yang dibaca index.js, sehingga user bisa me-replace isi tiap kotak lalu upload balik ke
  asset tema → langsung ter-apply (engine meng-key-out border ungu). (2) SPRITE TUNER — tombol di
  pojok KANAN-BAWAH (hanya PC), klik → pop-up di sisi KANAN layar berisi LIST sprite + SLIDER
  naik/turun + ANGKA indikator; pop-up TIDAK mem-pause game & config LANGSUNG ter-apply (live). User
  yang menentukan nilainya; nilai final di-"Salin" lalu diserahkan untuk kamu BAKE ke kode — ATAU
  (3) SIMPAN KE TEMA — tombol "💾 Simpan" di panel tuner yang, dengan OTORISASI SUPERADMIN
  (dialog username/password), mem-BAKE nilai tuner saat ini ke baris default offset di source JS
  tema lalu MENYIMPANNYA ke DB lewat API yang SAMA dengan tombol Save di halaman Edit Tema
  (login → updateTheme chunked), sehingga nilai jadi default permanen untuk semua tamu tanpa
  intervensi developer. Patuh kontrak host (ThemeWrapper) — cleanup hook, ID host verbatim,
  jangan putar backsound tenant.
---

# Skill: Pemasang "Asset Adjuster" untuk Tema Game Undangan yang Sudah Jadi

Kamu adalah **Tools/Engine Engineer**. Tema game (Phaser 3, hasil `clone-skill` lalu di-generate
jadi 3 file) sudah berjalan dengan **sprite prosedural** (digambar via `graphics.generateTexture`).
Karena sudah jalan, **semua sprite & frame-map sudah ADA di dalam `index.js`**. Tugas skill ini:
**memodifikasi 3 file tema itu** untuk menambahkan dua alat penyesuaian aset, **tanpa mengubah
gameplay**.

> ## 🎯 OUTPUT SKILL INI (LANGSUNG ke 3 file tema, bukan dokumen)
>
> Skill ini **mengedit** `src/sample-theme/<nama>/index.html`, `index.css`, `index.js` milik tema
> target. Dua fitur yang ditambahkan:
>
> 1. **EXPORTER sprite sheet PNG** — tombol yang, dari **tekstur prosedural yang sudah dibuat
>    game**, menggambar SATU PNG sprite sheet (semua frame, layout = frame-map yang dibaca
>    `index.js`), tiap frame dibingkai **border UNGU** sebagai penanda batas. User download PNG itu,
>    **mengganti isi tiap kotak** dengan art buatannya (mempertahankan posisi/ukuran kotak), lalu
>    **upload ke asset tema** → engine memuat & **meng-slice di koordinat yang sama** → langsung
>    ter-apply. Border ungu **di-key-out** engine saat load (lihat §4).
> 2. **SPRITE TUNER** — tombol kecil di **pojok kanan-bawah** (muncul **hanya di PC**), klik →
>    **pop-up di sisi kanan layar** berisi **list tiap sprite + slider naik/turun (−/+) + angka px**.
>    Pop-up **tidak mem-pause** game; menggeser slider **langsung menggeser** sprite hidup di layar
>    (live-apply) **dan** disimpan ke `localStorage`. Tombol **"Salin nilai"** menyalin hasil
>    (JSON `{id: offsetPx}`) agar user kirim balik → kamu **bake** ke kode sebagai offset permanen.
> 3. **SIMPAN KE TEMA (superadmin)** — tombol **"💾 Simpan"** di foot panel tuner. Klik → **dialog
>    otorisasi username/password**. Bila login valid **dan** role `superadmin`, tema **menulis ulang
>    baris default-offset di source JS-nya sendiri** dengan nilai tuner saat ini, lalu **menyimpan
>    source itu ke DB** lewat **API yang sama** dengan tombol Save di halaman Edit Tema (`login` →
>    `updateTheme` chunked). Hasil: nilai jadi **default permanen** untuk **semua tamu**, tanpa
>    developer perlu mem-bake manual. Ini melengkapi §5: user bisa **menyimpan sendiri** tanpa
>    mengirim JSON. (§2.5 — perlu *bridge global* dari host; di luar Editor Tema tombol hanya memberi
>    toast bahwa Simpan khusus editor.)

> **GOLDEN REFERENCE (WAJIB dipelajari, JANGAN disalin buta):**
> `src/sample-theme/metalslug-wedding/` **sudah** memiliki Sprite Tuner lengkap yang persis sesuai
> brief ini — pelajari implementasinya & tiru polanya untuk tema target:
> - `index.js`: `TUNE_KEY`, `TUNE_SPECS`, `TUNE_MIN/MAX`, `loadTune/saveTune/tuneY`, `buildTuner`,
>   `toggleTuner`, `resetTuner`, `copyTuner`, dan `GameScene.prototype.applyLiveTune` (live-apply
>   tanpa pause), serta pemanggilan `tuneY('<id>', y)` di tiap spawner.
> - `index.html`: blok `#msw-tuner-btn` (pojok kanan-bawah) + panel `#msw-tuner` (list + foot
>   Reset/Salin).
> - `index.css`: `.msw-tuner-btn` (`position:absolute;right:12px;bottom:16px`), `.msw-tuner`
>   (`right:0;width:300px`), dan **media query PC** `@media (hover:hover) and (pointer:fine)` yang
>   membuat tombol **hanya tampil di PC**.
> - **FITUR SIMPAN (§2.5) SUDAH ADA di metalslug** — pelajari & tiru: tombol `#msw-tuner-save`,
>   dialog `#msw-tuner-auth` (user/pass), dan di `index.js`: `openSaveAuth`/`closeSaveAuth`/
>   `doSaveTune`, `buildDefaultsLiteral`, `patchJsSource`, `mswApiPost`, `splitJsColumns`, plus
>   pembacaan bridge `window.__MSW_API_URL/__MSW_THEME_ID/__MSW_THEME_JS`. Di host:
>   `ThemeEditorPage.tsx` meng-inject 3 global itu ke `<head>` iframe preview.
> Tuner di metalslug = **bukti pola bekerja**. Untuk tema lain kamu menyesuaikan daftar sprite-nya.
> EXPORTER PNG **belum** ada di metalslug — itu bagian BARU yang kamu tambahkan (§3–§4).

---

## 0. SEBELUM MENGEDIT — pahami tema target dulu

1. **Tentukan tema target.** Dari prompt user / file yang sedang dibuka. Path:
   `src/sample-theme/<nama>/{index.html,index.css,index.js}`. Bila ambigu, tanyakan tema mana.
2. **BACA `index.js` tema itu** dan **inventarisasi sprite** (ini sumber kebenaran exporter+tuner):
   - **Daftar tekstur prosedural**: cari semua `tex(scene, '<key>', w, h, …)` /
     `generateTexture('<key>', …)` → kumpulkan `{ key, w, h }`.
   - **Anim & multi-frame**: cari `anims.create({key,…frames})` untuk tahu key mana yang punya
     beberapa frame (mis. `t_player_run0..3`, `t_flame` 3-frame) → kelompokkan jadi satu baris
     sprite-sheet (frame horizontal).
   - **Origin & hitbox**: catat `setOrigin`, `body.setSize/Offset`, dan `setScale` per sprite —
     dipakai exporter agar kotak sheet mewakili ukuran tampil yang benar, dan dipakai tuner agar
     `applyLiveTune` menggeser dengan benar.
   - **Pemetaan ID host & cleanup**: pastikan ada `window.__<prefix>Cleanup` (re-inject hook),
     prefix elemen tema (mis. `msw-`), dan cara delegated-click di-wire. **Pakai prefix yang sama**.
3. **Patuh kontrak host (JANGAN langgar).** ID host verbatim (`btn-toggle-music`, dst.), JS tema
   di-re-inject → semua listener/elemen baru harus didaftarkan ke **cleanup hook** yang sudah ada;
   jangan `audio.play()` backsound tenant. (Rujukan lengkap di `clone-skill/reference/host-contract.md`.)
4. **Game WAJIB tetap jalan** sebelum & sesudah modif, **dengan atau tanpa** PNG terupload — fitur
   ini **aditif**, bukan mengganti baseline prosedural. Tuner & exporter tidak boleh menyentuh
   logika gameplay.

---

## 1. LANGKAH KERJA (ringkas)

1. **Inventaris sprite** dari `index.js` (§0.2) → bangun **`TUNE_SPECS`** (list id+label+keys) &
   **`SHEET_MAP`** (frame-map untuk exporter: key → kotak [x,y,w,h] di sheet).
2. **Pasang SPRITE TUNER** (§2): HTML tombol+panel, CSS (PC-only, kanan), JS (slider live-apply
   tanpa pause + persist + Salin). Tiru pola `metalslug-wedding`.
3. **Pasang SIMPAN KE TEMA** (§2.5): tombol "💾 Simpan" + dialog auth superadmin di panel tuner;
   JS yang login → mem-patch baris default-offset di source JS tema → `updateTheme` chunked. Pasang
   **bridge global** di `ThemeEditorPage.tsx`. Tiru pola `metalslug-wedding`.
4. **Pasang EXPORTER PNG** (§3): tombol "Export Sprite Sheet (PNG)" di panel tuner → fungsi yang
   meng-compose tekstur game → 1 canvas + **border ungu** per kotak → `download`.
5. **Pasang LOADER + KEY-OUT** (§4): saat tema memuat asset gambar dari slot `{{asset_image_N}}`,
   slice di `SHEET_MAP` yang sama, **buang piksel border ungu**, bake ke key tekstur game →
   langsung ter-apply. Sediakan **fallback prosedural** (tanpa upload tetap jalan).
6. **Verifikasi** (§6) lewat Theme Editor / minta user (screenshot headless tak bisa di mesin ini).
7. **Bake adjustment** (§5): saat user mengirim hasil "Salin nilai", terapkan sebagai offset
   permanen di kode (atau biarkan dibaca dari `localStorage` — sesuai pilihan §5). Bila user
   memakai tombol **💾 Simpan** (§2.5), bake terjadi **otomatis** ke DB — langkah manual ini opsional.

---

## 2. SPRITE TUNER (tiru `metalslug-wedding`)

**Perilaku WAJIB (sesuai brief user):**
- **Satu tombol** kecil di **pojok kanan-bawah** (`position:absolute; right:12px; bottom:16px`),
  **hanya tampil di PC**: bungkus tampilannya di `@media (hover:hover) and (pointer:fine)` (default
  `display:none`). Di mobile/touch tombol & panel tidak muncul.
- Klik tombol → **toggle pop-up di sisi KANAN layar** (`position:absolute; top:0; right:0; bottom:0;
  width:~300px`). **JANGAN `scene.pause()`** — game terus jalan.
- Pop-up berisi **list tiap sprite** (satu baris per id di `TUNE_SPECS`): **nama** + **angka
  indikator** (mis. `+12px` / `−8px`) + **slider** `range` (`min=-60 max=60 step=1`).
- Menggeser slider → panggil `applyLiveTune(id, nilai)` yang **langsung menggeser** sprite hidup
  bertanda id itu di layar **dan** `saveTune()` ke `localStorage`. Tidak ada tombol "Apply".
- Foot panel: **"Reset semua"** (set semua ke 0, live) + **"Salin nilai"** (copy JSON
  `{id: px, …}` ke clipboard + toast) → user kirim balik untuk di-bake.

**Implementasi (pola terbukti — sesuaikan prefix & daftar sprite ke tema target):**

- **`TUNE_SPECS`** = array `{ id, label, keys:[<texKey>…] }`. `id` = nama sprite logis
  (player/musuhX/item…); `keys` = semua tekstur engine yang ikut tergeser saat slider id itu
  digerakkan (mis. player punya banyak pose → semua key pose-nya). Turunkan dari inventaris §0.2.
- **State**: `TUNE_KEY='<prefix>_tune_v1'`, `TUNE = loadTune()` (default semua 0, try/catch),
  `saveTune()`, `tuneY(id, y){ return y + (TUNE[id]||0); }`.
- **Pakai `tuneY('<id>', y)` di SETIAP spawn anchor** sprite tersebut (agar nilai tuner ikut saat
  sprite dibuat). Tandai tiap sprite dengan `setData('tuneId','<id>')` + simpan `baseY` bila ia
  ber-bob, supaya `applyLiveTune` bisa menggesernya saat hidup.
- **`buildTuner()`**: render baris+slider; pasang **satu** delegated `input` listener pada list
  (guard `__bound`) → baca `data-tune` → update angka indikator → `applyLiveTune` (atau persist saja
  bila scene belum hidup).
- **`applyLiveTune(id, newVal)`** (method scene): hitung `delta = newVal - old`, `TUNE[id]=newVal;
  saveTune()`. Untuk **player/boss** (anchor khusus via body-offset/homeY) → re-derive offsetnya.
  Untuk sprite lain → loop grup, geser `s.y += delta` untuk yang `getData('tuneId')===id` (dan
  update `baseY` bila ada). Tanpa pause; berlaku seketika.
- **Wiring tombol** lewat delegated-click yang sudah dipakai tema (daftarkan id tombol tuner di
  peta ACTIONS) **dan** daftarkan listener apa pun ke **cleanup hook**.
- **HTML**: tombol `#<prefix>-tuner-btn` + panel `#<prefix>-tuner` (head judul+✕, hint, list
  `#<prefix>-tuner-list`, foot Reset+Salin). **CSS**: tiru `.msw-tuner-btn`/`.msw-tuner` + media
  query PC-only.

> **Golden Rule §2:** *Tuner murni KOSMETIK posisi — tidak menyentuh hitbox/gameplay.* Live-apply,
> tanpa pause, persist, PC-only, kanan layar. Nilai final = milik user; kamu hanya menyediakan alat
> + kelak mem-bake angkanya.

---

## 2.5 SIMPAN KE TEMA (otorisasi superadmin → bake otomatis ke DB)

**Tujuan.** Tombol **"💾 Simpan"** di panel tuner agar **superadmin** bisa menjadikan nilai tuner
saat ini sebagai **default permanen tema** — **tanpa** mengirim JSON ke developer untuk di-bake
manual (§5). Saat diklik: muncul **dialog username/password**; bila login **valid & role
`superadmin`**, tema **menulis ulang baris default-offset di source JS-nya sendiri**, lalu
**menyimpan source itu ke DB** memakai **API yang SAMA** dengan tombol Save di halaman Edit Tema.

### 2.5.1 KEBUTUHAN (mengapa perlu "bridge" host)

Tema berjalan di dalam **iframe** preview Theme Editor (`doc.write(iframeContent)` di
`ThemeEditorPage.tsx`). Di dalam iframe itu tema **tidak punya**:
- **URL API** (`import.meta.env.VITE_API_URL` hanya ada saat build React, bukan di string tema).
- **`id` tema** yang sedang diedit (untuk target `updateTheme`).
- **source JS tema saat ini** (yang barisnya akan di-patch — tema tak bisa membaca file-nya sendiri).

Maka host **WAJIB meng-inject 3 global** ke `<head>` iframe sebelum JS tema berjalan:

```js
// di ThemeEditorPage.tsx, di dalam template `iframeContent`, SEBELUM <style>/JS tema:
<script>
  window.__MSW_API_URL = ${JSON.stringify(import.meta.env.VITE_API_URL || '')};
  window.__MSW_THEME_ID = ${JSON.stringify(id || '')};          // null utk tema baru blm tersimpan
  window.__MSW_THEME_JS = ${JSON.stringify(jsCodeRef.current || '')}; // source JS editor saat ini
</script>
```

> **Pakai prefix tema target**, mis. `__GW_API_URL` untuk tema lain. Di `metalslug-wedding` namanya
> `__MSW_*`. Yang penting: **API URL + theme id + JS source** tersedia di `window` iframe.
> **Di LUAR Theme Editor** (undangan publik) bridge ini **tidak ada** → tombol Simpan harus hanya
> menampilkan toast "Simpan hanya tersedia di Editor Tema" dan **tidak** mencoba menyimpan.

### 2.5.2 KONTRAK API (identik dengan halaman Edit Tema)

- **Transport:** `POST` ke `__MSW_API_URL`, header `Content-Type: text/plain` (WAJIB — agar tidak
  memicu CORS preflight ke Apps Script; sama seperti `apiClient.ts`). Body = JSON string.
- **Login:** `{ action:'login', username, password }` → sukses balas
  `{ success:true, data:{ token, user:{ role, … } } }`. **Tolak** bila `user.role !== 'superadmin'`.
- **Simpan JS (chunked):** `{ action:'updateTheme', id, __chunked:true, token, tenant_id:'system',
  js_template, js_extra_1..js_extra_10 }`. Backend (`Code.gs > ThemeService.updateTheme`) saat
  `__chunked` menyalin tiap kolom **apa adanya** (tiap kolom **≤50.000 char**). Karena JS tema satu
  file biasanya < 550k, **satu** request `updateTheme` cukup (11 kolom sekaligus, total masih jauh
  di bawah limit body Apps Script).
- `tenant_id:'system'` untuk superadmin (lihat injeksi `apiClient.ts`).

### 2.5.3 IMPLEMENTASI di `index.js` (tiru `metalslug-wedding`)

1. **Baca bridge:** helper `apiUrl()/themeId()/themeJs()` baca `window.__<PFX>_API_URL/_THEME_ID/
   _THEME_JS` (string, default `''`).
2. **`buildDefaultsLiteral()`** — bangun ulang baris konstanta default-offset (di metalslug:
   `var TUNE_DEFAULTS = { … };`) dari nilai `TUNE` saat ini, **mempertahankan urutan/grup key yang
   sama** dengan source supaya diff bersih. *Sesuaikan ke nama konstanta default tema target.*
3. **`patchJsSource(src)`** — ganti blok default lama dengan yang baru:
   ```js
   var re = /var\s+TUNE_DEFAULTS\s*=\s*\{[\s\S]*?\};/;   // non-greedy → blok pertama saja
   if (!re.test(src)) return null;                        // marker hilang → batal aman
   return src.replace(re, buildDefaultsLiteral());        // .replace non-global → HANYA match pertama
   ```
   **PENTING:** deklarasi default ASLI harus **kemunculan pertama** di file. Karena fungsi
   `buildDefaultsLiteral` sendiri **mengandung** string `'var TUNE_DEFAULTS = {…'`, dan ia berada
   **setelah** deklarasi asli, `.replace` non-global aman menimpa **hanya** deklarasi asli. Verifikasi
   dengan mensimulasikan patch (lihat §6) — pastikan builder tetap utuh & hasilnya `node --check` lolos.
4. **`apiPost(body)`** — `fetch(apiUrl(), { method:'POST', headers:{'Content-Type':'text/plain'},
   body: JSON.stringify(body) }).then(r=>r.json())`.
5. **`splitJsColumns(s)`** — pecah jadi `js_template` (0–50k) + `js_extra_1..10` (kelipatan 50k).
6. **`openSaveAuth()`** — guard: bila `!apiUrl()` → toast "khusus Editor Tema"; bila `!themeId()` →
   toast "Simpan tema dulu sekali (belum punya ID)"; selain itu tampilkan dialog (`.show`), fokus
   input user, kosongkan password & pesan.
7. **`doSaveTune()`** — alur:
   - validasi user/pass terisi; `patched = patchJsSource(themeJs())`; bila `null` → pesan "marker
     TUNE_DEFAULTS tak ditemukan".
   - disable tombol (guard `_saving`), tampilkan "Memvalidasi otorisasi…".
   - `apiPost({action:'login',username,password})` → cek `success && data.token` **dan**
     `data.user.role==='superadmin'` (kalau bukan → throw "Hanya superadmin").
   - `apiPost({action:'updateTheme', id, __chunked:true, token, tenant_id:'system', ...splitJsColumns(patched)})`.
   - sukses → `window.__<PFX>_THEME_JS = patched` (agar simpan kedua mem-patch source BARU), toast
     sukses, tutup dialog. Selalu re-enable tombol di `.then` final (mirip `finally`).
8. **Wiring:** daftarkan id tombol/aksi ke peta **delegated-click** yang sudah dipakai tema:
   `'<pfx>-tuner-save': openSaveAuth`, `'<pfx>-tuner-auth-cancel': closeSaveAuth`,
   `'<pfx>-tuner-auth-ok': doSaveTune`. (Delegated-click sudah ter-cleanup → tak perlu listener baru.)

### 2.5.4 HTML & CSS

- **HTML:** tambah tombol `#<pfx>-tuner-save` ("💾 Simpan") di **foot** panel tuner, dan **dialog
  auth** `#<pfx>-tuner-auth` (overlay di dalam panel, `position:absolute; inset:0`) berisi judul,
  sub-teks, input `#…-auth-user` (text) + `#…-auth-pass` (password), baris pesan `#…-auth-msg`, dan
  foot tombol `#…-auth-cancel` + `#…-auth-ok` ("Login & Simpan").
- **CSS:** tombol Simpan diberi aksen (mis. merah) agar terbaca aksi commit; `.<pfx>-tuner-auth`
  default `display:none`, `.show{display:flex}`, kartu di tengah panel; input full-width; pesan
  error merah, sukses (`.ok`) hijau; tombol disabled saat menyimpan.

> **Golden Rule §2.5:** *Simpan = bake otomatis, tapi HANYA superadmin & HANYA di Editor Tema.*
> Tema tidak boleh menyimpan ke DB tanpa token superadmin valid, dan tidak boleh mencoba menyimpan
> di luar editor (bridge global absen). Patch hanya menyentuh **baris konstanta default-offset** —
> **jangan** menulis ulang seluruh file dari nol (rawan merusak); cari-ganti baris itu saja.

---

## 3. EXPORTER SPRITE SHEET PNG (border ungu) — fitur BARU

**Tujuan:** dari tekstur prosedural yang **sudah dibuat game**, hasilkan **satu file PNG** yang =
peta sprite sheet siap-isi. User mengganti isi tiap kotak dengan art-nya (tanpa menggeser kotak),
upload balik → engine slice di koordinat sama → ter-apply.

**`SHEET_MAP` (sumber kebenaran tunggal exporter & loader).** Bangun dari inventaris §0.2:
satu array entri `{ key, w, h, frames:[[x,y]…] | layout }`. Susun layout deterministik:
- **Per-ROW**: satu entity/anim = satu baris; frame-frame-nya horizontal kiri→kanan.
- Catat **koordinat absolut tiap frame** `[x, y, w, h]` di kanvas sheet (inilah yang dipakai
  loader §4 untuk slice — **harus identik**). Sisakan margin tepi + **tebal border ungu**
  (mis. 2px) di sekeliling tiap frame.
- Ukuran kotak = ukuran tekstur game (boleh di-scale **≥80px** bila kamu juga menaikkan resolusi
  saat slice — opsional; default 1:1 dengan tekstur game agar pasti cocok).

**Fungsi `exportSpriteSheet()` (dipanggil dari tombol di panel tuner):**
1. Buat `<canvas>` seukuran sheet (lebar/tinggi dari `SHEET_MAP`).
2. Untuk tiap frame: ambil **source image tekstur game** via
   `scene.textures.get(key).getSourceImage()` (atau `getFrame(key).cut*`/`canvasData`), `drawImage`
   ke posisi `[x,y]` kotak itu.
3. Gambar **border UNGU** (`#a000ff` / `rgb(160,0,255)`, garis 2px) tepat **mengelilingi tiap
   kotak frame** sebagai penanda batas.
4. (Opsional) tulis label kecil nama key di atas baris (warna ungu) untuk memudahkan user — boleh,
   asal **di luar area frame** (jangan menimpa piksel art).
5. `canvas.toDataURL('image/png')` → trigger download (`<a download="<nama>-sprite-sheet.png">`).
   Sediakan fallback: bila canvas ter-taint/gagal, `showError`/toast yang jelas.

**Letak tombol:** tambahkan di **panel tuner** (foot), mis. **"Export Sprite Sheet (PNG)"** —
sehingga seluruh alat aset ada di satu tempat PC-only. (Boleh juga tombol terpisah, tapi default:
di dalam tuner.)

> **Golden Rule §3:** *Kotak yang digambar exporter = kotak yang dibaca loader.* Keduanya membaca
> `SHEET_MAP` yang SAMA. Kalau koordinat exporter dan loader beda, art user akan ter-slice meleset.

---

## 4. LOADER + KEY-OUT BORDER UNGU (upload balik → ter-apply)

Agar PNG yang sudah user isi **langsung ter-apply** saat di-upload ke asset tema:

1. **Baca slot asset.** Host menyediakan `{{asset_image_N}}` (URL/base64) yang dinomori dari
   **urutan upload** (lihat `clone-skill/reference/sprite-sheet-assets.md` P.0/P.5). Beri elemen
   tersembunyi `data-asset="sprite_sheet"` berisi `{{asset_image_N}}`; tema membaca `src`-nya.
   Bila kosong / masih literal `{{…}}` → **fallback prosedural** (jangan blank).
2. **Load gambar** ke tekstur (`scene.load.image` di `preload`, atau `Image()`+`textures.addImage`),
   lalu **slice di `SHEET_MAP`** (koordinat IDENTIK dengan exporter §3) → untuk tiap frame:
   potong kotak, **key-out border ungu**, downscale bila perlu, lalu **bake ke key tekstur game**
   (`textures.addCanvas(key, …)` / `texture.add(frameName,…)`) sehingga semua `create/tile/scale/anim`
   yang ada memakai art baru **tanpa diubah**. Bangun ulang anim multi-frame (guard `anims.exists`).
3. **KEY-OUT border ungu (WAJIB).** Border ungu = **penanda visual saja**, tidak boleh ikut
   ter-render. Saat slice, **buang piksel ungu**: untuk tiap piksel frame, jika warnanya dekat ungu
   penanda (mis. `R>120 && B>180 && G<80`, toleransi ~40) → set `alpha=0`. Karena border ada **di
   tepi** kotak, ini cukup; tidak akan memakan art di tengah. (Bila tema memakai ungu sebagai warna
   art, pakai ungu penanda yang **tidak dipakai** game + dokumentasikan di tombol/hint.)
4. **Fallback wajib**: flag `usingSheetAsset` → `false` saat slot kosong/gagal → game pakai tekstur
   prosedural lama. **Tanpa upload, game tetap fully playable.**

> **Golden Rule §4:** *Replace isi kotak, jangan geser kotak.* User cukup menimpa gambar di dalam
> tiap bingkai ungu; engine slice di koordinat tetap + key-out ungu → art langsung muncul.

---

## 5. BAKE HASIL ADJUSTMENT (saat user mengirim nilai "Salin")

Alur: user main → buka tuner → atur slider sampai pas → klik **"Salin nilai"** → kirim JSON
`{ "<id>": <px>, … }` kepadamu. Lalu:

- **Default (disukai): bake ke kode.** Jadikan nilai itu **default** di `TUNE` (atau konstanta
  offset per-sprite di config), sehingga tampil benar untuk **semua tamu** tanpa bergantung
  `localStorage`. Pastikan `tuneY()`/anchor memakai nilai baru. Sisakan tuner tetap ada (bisa
  di-`display:none` via flag dev) atau biarkan untuk penyesuaian lanjutan.
- **Alternatif**: biarkan nilai hanya di `localStorage` per-device (kurang disukai untuk produksi —
  device lain tak dapat). Pilih ini hanya bila user eksplisit minta.
- **Self-save (§2.5):** bila tema sudah punya tombol **💾 Simpan**, **superadmin bisa mem-bake
  sendiri** ke DB dari Editor Tema tanpa mengirim JSON ke developer. Bake-manual ini lalu jadi
  **opsional** — pakai hanya bila kamu yang diminta menyetel angkanya, atau untuk tema tanpa tombol Simpan.

Konfirmasikan ke user pilihan bake sebelum menghapus tombol tuner dari UI publik.

---

## 6. VERIFIKASI (jebakan mesin ini)

- **Screenshot headless Chrome TIDAK bekerja** di mesin ini (selalu blank) — jangan dipercaya.
- **Cara benar:** paste 3 file ke **Theme Editor** host
  ([`ThemeEditorPage.tsx`](src/features/admin/pages/ThemeEditorPage.tsx)) → buka preview, **atau**
  minta user mencoba. Cek: (a) tombol tuner muncul **hanya di PC**, pop-up kanan, game **tak
  pause**, slider **menggeser sprite live** + angka update; (b) tombol Export menghasilkan PNG
  dengan **kotak ber-border ungu** per frame; (c) upload PNG (isi diganti) → art ter-apply & border
  ungu **tidak terlihat** (ter-key-out); (d) **tanpa** upload, game tetap jalan (prosedural).
- **Simpan (§2.5):** (e) tombol **💾 Simpan** → dialog auth muncul; login **non-superadmin/ salah**
  → pesan error, **tidak** menyimpan; login **superadmin valid** → toast sukses & nilai tersimpan
  (refresh tema / buka ulang → default sudah berubah). (f) Di **luar** Editor Tema → tombol hanya
  toast "khusus editor", tak ada request. (g) **Simulasi patch** sebelum kirim ke user: tulis script
  Node yang menjalankan `patchJsSource` pada `index.js` tema → pastikan **hanya** deklarasi
  default ASLI yang tertimpa (fungsi builder utuh), lalu `node --check` hasilnya **lolos**. Juga
  jalankan `tsc -b` setelah mengubah `ThemeEditorPage.tsx` (build type-check bagian dari build).
- Logika game boleh diuji via **harness Node** (RAF di-stub) bila perlu, tapi tuner/exporter bersifat
  UI/DOM → paling andal lewat Theme Editor.

---

## 7. ANTI-PATTERN (jangan lakukan)

- ❌ Tombol tuner muncul di **mobile** → harus PC-only (`@media (hover:hover) and (pointer:fine)`).
- ❌ Pop-up **mem-pause** game / butuh tombol "Apply" → harus live-apply tanpa pause, persist otomatis.
- ❌ Pop-up muncul di tengah/kiri → harus **kanan layar**, tombol pemicu **pojok kanan-bawah**.
- ❌ Koordinat **exporter ≠ loader** → art ter-slice meleset. Keduanya baca `SHEET_MAP` yang sama.
- ❌ **Lupa key-out border ungu** → garis ungu ikut ter-render di game.
- ❌ Tidak ada **fallback prosedural** → slot kosong = blank canvas (harus tetap jalan tanpa upload).
- ❌ Tuner/exporter **mengubah hitbox/gameplay** → murni kosmetik posisi + tooling.
- ❌ **Simpan tanpa cek role superadmin** → siapa pun bisa menimpa source tema. WAJIB tolak bila
  `user.role !== 'superadmin'`.
- ❌ **Simpan mencoba jalan di luar Editor Tema** (bridge global absen) → harus guard & toast saja.
- ❌ **Menulis ulang seluruh file** saat Simpan → hanya cari-ganti **baris konstanta default-offset**
  (regex non-greedy, `.replace` non-global). Menimpa seluruh file rawan korup.
- ❌ **Lupa bridge** di `ThemeEditorPage.tsx` (`__<PFX>_API_URL/_THEME_ID/_THEME_JS`) → tombol Simpan
  mati di editor. Inject di `<head>` iframe **sebelum** JS tema.
- ❌ Memakai `Content-Type: application/json` untuk POST API → memicu CORS preflight yang ditolak
  Apps Script. Pakai **`text/plain`** (sama dengan `apiClient.ts`).
- ❌ Listener baru **tidak** didaftarkan ke cleanup hook → menumpuk tiap re-inject host.
- ❌ Melanggar kontrak host (ID verbatim, `audio.play()` backsound tenant).
- ❌ Mengarang prefix/elemen baru yang bentrok — **pakai prefix tema target** (mis. `msw-`).

---

## Rujukan

- **Golden reference Tuner + Simpan:** `src/sample-theme/metalslug-wedding/{index.js,index.html,index.css}`
  (`TUNE_SPECS`, `buildTuner`, `applyLiveTune`, `#msw-tuner*`, media-query PC-only) **dan** fitur
  Simpan (`#msw-tuner-save`/`#msw-tuner-auth`, `openSaveAuth`/`doSaveTune`/`patchJsSource`/
  `buildDefaultsLiteral`/`mswApiPost`/`splitJsColumns`). Tiru polanya.
- **Bridge host (Simpan):** [`ThemeEditorPage.tsx`](src/features/admin/pages/ThemeEditorPage.tsx) —
  injeksi `window.__MSW_API_URL/__MSW_THEME_ID/__MSW_THEME_JS` di `<head>` `iframeContent`.
- **Kontrak API save:** `apiClient.ts` (POST `text/plain`, inject token/tenant_id) + `Code.gs >
  ThemeService.updateTheme` (cabang `__chunked`, kolom `js_template`+`js_extra_1..10` ≤50k) +
  `AuthService.login` (balas `data.user.role`).
- **Mekanisme asset & urutan upload + key-out + frame-map + fallback:**
  [`clone-skill/reference/sprite-sheet-assets.md`](../clone-skill/reference/sprite-sheet-assets.md)
  (APPENDIX P): P.0 slot `{{asset_image_N}}` dari urutan upload, P.4 slice+key-out+downscale+fallback.
- **Kontrak host:** [`clone-skill/reference/host-contract.md`](../clone-skill/reference/host-contract.md).
- **Verifikasi:** [`ThemeEditorPage.tsx`](src/features/admin/pages/ThemeEditorPage.tsx) (Theme Editor).
