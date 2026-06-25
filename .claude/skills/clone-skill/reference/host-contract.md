# Kontrak Host (ThemeWrapper)

> Sumber: [`ThemeWrapper.tsx`](src/features/invitation/components/ThemeWrapper.tsx) +
> [`InvitationPage.tsx`](src/features/invitation/pages/InvitationPage.tsx). Patuhi persis.

## Bagaimana tema disuntik

- **HTML** → `dangerouslySetInnerHTML` ke dalam container.
- **CSS** → `<style>`.
- **JS** → dibungkus IIFE dalam `<script id="theme-custom-js">`, **DIHAPUS & DIJALANKAN ULANG**
  setiap `jsBase`, `isOpened`, atau `htmlBase` berubah.
- **Binding di-resolve host SEBELUM JS jalan** (templateParser). Jadi `{{vars}}` sudah jadi
  teks/URL di DOM. **Tidak ada substitusi `data-var` runtime.**

## WAJIB: cleanup hook

Karena JS di-inject ulang, JS tema harus, **di baris paling awal**, memanggil cleanup global
dari run sebelumnya lalu mendaftarkan yang baru:

```js
(function () {
  if (window.__gwCleanup) { try { window.__gwCleanup(); } catch (e) {} }
  const disposers = [];
  window.__gwCleanup = () => { disposers.forEach(d => { try { d(); } catch (e) {} }); };
  // ... saat membuat RAF/interval/listener/Phaser.Game, push pembersihnya ke disposers:
  // disposers.push(() => game.destroy(true));
  // disposers.push(() => cancelAnimationFrame(rafId));
  // disposers.push(() => window.removeEventListener('resize', onResize));
})();
```

Tanpa ini, RAF loop / listener / `Phaser.Game` lama menumpuk → bocor & lag.

## ID hardcoded host (verbatim, tanpa prefix)

| ID | Fungsi host |
|---|---|
| `btn-show-qr` | Buka popup QR (intercept capture-phase) |
| `btn-show-menu` | Buka menu navigasi |
| `btn-toggle-music` / `btn-music` | Toggle `isPlaying`; host swap ikon & dispatch event |
| `bg-music` | Target mirror event play/pause (BUKAN player asli; tanpa `<source>`) |
| `play-icon` / `pause-icon` | Host set `display` sesuai state |
| `btn-submit-ucapan` + `wish-name` + `wish-message` | Submit ucapan (host yang fetch) |
| `btn-submit-kehadiran` + `rsvp-status` + `rsvp-guests` + `rsvp-code` | Submit RSVP |
| `btn-submit-hadiah` + `gift-name` + `gift-amount` + `gift-bank` | Konfirmasi hadiah (opsional) |
| `alert-submit-kehadiran` / `alert-submit-ucapan` / `alert-submit-hadiah` | Container pesan hasil |

Opsional struktur: `id="theme-cover"` (wrapper cover) + `id="main-content"`
(`display:none` default) → host atur visibility saat undangan dibuka via
`#btn-open-invitation`. Game theme boleh kelola buka/tutup sendiri, asal konsisten.

## Musik — JANGAN diputar tema

Host (`InvitationPage`) memegang `new Audio(link_backsound_music)` / iframe YouTube; hanya
play saat `isPlaying && isOpened`. Tema **hanya** boleh:
- klik `#btn-toggle-music` untuk mengubah niat play/pause,
- **mirror** ikon (host juga dispatch `play`/`pause` Event ke `#bg-music`).

Jangan panggil `audio.play()` backsound tenant. (SFX game via Web Audio internal bebas.)

> **Mirror musik HARUS idempotent (bug mahal yang sudah dibayar).** Mengklik `#btn-toggle-music`
> dua kali (karena membaca class lama sebelum React flip state) justru mematikan musik lagi →
> "musik tidak jalan". Pola aman: simpan **intent** (`musicWanted`) + generation guard, dan
> hanya klik bila state host **masih** salah, dengan retry terjadwal. Lihat memory
> `retromario-host-music`.

## RSVP / ucapan / hadiah — panggil fungsi global host (+ fallback)

Memasang ID host saja **tidak cukup**. Tema harus memanggil fungsi global host bila tersedia,
dengan **fallback lokal** (optimistic UI) bila tidak:

```js
// Ucapan — input WAJIB pakai ID host verbatim: wish-name, wish-message, btn-submit-ucapan
if (typeof window.submitUcapan === 'function') { window.submitUcapan(); return; }
// … else: render thank-you + sisipkan ke list secara lokal …

// RSVP — btn-submit-kehadiran + rsvp-status/rsvp-guests/rsvp-code
if (typeof window.submitRsvp === 'function') { window.submitRsvp(); return; }
```

Mengubah/memberi prefix ID host = fitur backend-nya **mati diam-diam**. Ini berlaku juga saat
form dipanggil dari dalam modal kepingan / reveal.

> **Countdown** (`{{countdown_hari/jam/menit/detik}}`) di-render host jadi `<span>` ber-ID yang
> **di-update host tiap detik**. Jangan menimpa innerHTML container itu lewat RAF game.

## Deteksi section riil — `{{#if flag}}` harus MEMBUNGKUS `<section>`, bukan isinya

Jumlah kepingan dinamis bergantung pada keberadaan `<section data-info="<key>">` di DOM. Agar
section yang flag-nya false **hilang** (sehingga kepingannya tidak muncul), flag fitur harus
**membungkus seluruh section**:

```html
{{#if has_gallery}}<section data-info="gallery"> … </section>{{/if}}   <!-- BENAR -->
<section data-info="gallery">{{#if has_gallery}} … {{/if}}</section>  <!-- SALAH -->
```

> **Jebakan fatal:** kalau `{{#if}}` ditaruh **di dalam** section, section tetap ada di DOM
> walau kosong → terhitung sebagai section riil → muncul **kepingan hantu** dan
> `allInfoUnlocked()` menunggu kepingan blank → undangan **tak pernah** bisa "lengkap".
> **Bungkus section, jangan isinya.**

> **Re-inject sering terjadi:** JS tema di-inject ulang **bukan cuma saat ganti tema**, tapi
> **tiap tamu submit ucapan/RSVP/hadiah** (host me-recompute HTML undangan). Cleanup hook di
> atas wajib idempotent, atau loop/listener menumpuk setelah interaksi pertama.

## Lightbox

Host universal lightbox memicu pada `.gallery-item` / `.lightbox-injection`. Kalau mau
lightbox sendiri, pakai **class berbeda** (mis. `.gw-gallery-item`) agar tidak dibajak host.

## Kerangka HTML minimum (game theme)

> **Layout desktop = TEPAT 2 kolom.** Arah OTORITATIF (revisi): **frame game = KIRI (dipatok,
> lebar tetap) · panel info wedding = KANAN (mengisi sisa)**. JANGAN center, JANGAN 3 kolom dengan
> dekorasi identik. Di mobile, hanya `.gw-frame` yang tampil. Angka CSS + diagram + 3 bug layout
> lainnya (kamera, ground, posisi icon-button & controller) ada di
> [`layout-camera-hardwon.md`](layout-camera-hardwon.md) — **baca & tuangkan ke Bible**.

```html
<div class="gw-shell">
  <!-- FRAME GAME (desktop: KIRI, dipatok, lebar tetap 480px) = game + undangan;
       SATU-SATUNYA area interaktif. Di mobile = satu-satunya yang tampil. -->
  <div class="gw-frame">
    <div class="gw-stage" id="gw-stage"><!-- Phaser canvas masuk sini --></div>
    <!-- HUD: nyawa (kiri) · skor (tengah) · area (kanan) — dilihat, tak di-tap -->
    <!-- ICON-BUTTON: KIRI-ATAS, kolom vertikal (★ cheat, ▦ stage-select, 💌 buka undangan,
         btn-toggle-music, reset) -->
    <!-- indikator kepingan (N ikon dinamis): KANAN-ATAS, wrap rata-kanan -->
    <!-- kontrol sentuh: joystick KIRI-BAWAH + FIRE/JMP/GRENADE KANAN-BAWAH (green zone) -->
    <!-- overlay: cover (pilih kesulitan + PRESS START), briefing, area clear,
         rescue/buka-undangan, win, reset-confirm, stage-select -->
    <!-- saat undangan dibuka: section scroll vertikal DI DALAM frame ini -->
  </div>

  <!-- PANEL INFO WEDDING (desktop: KANAN, mengisi sisa) — disembunyikan di mobile.
       PURE undangan — TANPA tombol game (PRESS START / pilih-level / kontrol keyboard ada di
       cover overlay DALAM frame). Isi: <canvas> couple bertema game (pria berjas + wanita
       bergaun), nama mempelai + tanggal, jadwal Akad/Resepsi + link MAP, satu tombol
       💌 BUKA UNDANGAN LENGKAP. Lihat layout-camera-hardwon.md §9. -->
  <aside class="gw-side gw-cover">
    <canvas id="gw-couple-canvas"></canvas>   <!-- couple (jas/gaun) di scene bertema game -->
    ... nama mempelai · Akad/Resepsi + map · 💌 BUKA UNDANGAN LENGKAP (no tombol game) ...
  </aside>

  <!-- SATU-SATUNYA sumber binding: semua section sekali, {{vars}} di sini saja -->
  <div class="gw-invitation" id="inv-source">
    <section data-info="hero"> ... {{groom_nickname}} ... </section>
    <section data-info="couple"> ... </section>
    <section data-info="rsvp"> ... form RSVP (id host) ... </section>
    <section data-info="schedule"> ... </section>
    {{#if is_fitur_live_streaming}}<section data-info="streaming"> ... </section>{{/if}}
    {{#if flag_pakai_timeline_kisah}}<section data-info="story"> ... </section>{{/if}}
    {{#if has_gallery}}<section data-info="gallery"> ... </section>{{/if}}
    {{#if flag_pakai_additional_feature_story_balasan_instagram}}<section data-info="happiness"> ... </section>{{/if}}
    <section data-info="wishes"> ... form ucapan (id host) + {{#each wishes}} ... {{/each}} ... </section>
    {{#if tampilkan_amplop_online}}<section data-info="gift"> ... </section>{{/if}}
    <section data-info="closing"> ... {{kalimat_penutup}} ... </section>
  </div>

  <!-- modal kepingan + lightbox sendiri -->
  <div class="gw-modal-root" id="gw-modal-root"> ... </div>

  <!-- mirror musik host -->
  <audio id="bg-music"></audio>
</div>
```

JS saat boot men-scan `#inv-source > section[data-info]` untuk daftar section riil →
menentukan jumlah kepingan & ikon indikator (jangan hardcode). Modal/reveal meng-clone
dari `#inv-source`.
