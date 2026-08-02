/* =========================================================================
   JAVA VINTAGE — theme JS

   Kontrak host (ThemeWrapper) yang dipatuhi di sini:
    - Skrip ini DIHAPUS lalu DIJALANKAN ULANG setiap kali inputnya berubah,
      jadi ia wajib memanggil cleanup hook miliknya sendiri di awal
      (window.__jvCleanup) supaya interval/observer/listener tidak menumpuk.
    - HTML di-inject ulang saat tamu mengirim RSVP/ucapan, sementara JS TIDAK
      ikut dijalankan ulang. Karena itu semua navigasi & tombol memakai
      listener yang di-delegasikan ke document, bukan dipasang per elemen.
    - Tema TIDAK BOLEH memutar audio sendiri. Host memiliki player-nya dan
      juga satu-satunya yang menulis ikon play/pause. Kita hanya menyediakan
      #btn-toggle-music untuk di-intercept host.
   ========================================================================= */
(function () {
    'use strict';

    // ---- Bersihkan instance sebelumnya, lalu buka registry baru -----------
    if (typeof window.__jvCleanup === 'function') {
        try { window.__jvCleanup(); } catch (e) { /* noop */ }
    }
    var cleanupFns = [];
    window.__jvCleanup = function () {
        cleanupFns.forEach(function (fn) { try { fn(); } catch (e) { /* noop */ } });
        cleanupFns = [];
    };

    function on(target, type, handler, opts) {
        if (!target) return;
        target.addEventListener(type, handler, opts);
        cleanupFns.push(function () { target.removeEventListener(type, handler, opts); });
    }

    var screenEl = document.getElementById('jv-screen');

    // =====================================================================
    // TINGGI LAYAR NYATA (--jv-vh)
    // `100vh`/`100dvh` mengukur viewport, tapi host membungkus tema dalam
    // beberapa lapis wrapper ber-`min-h-screen`; kalau ada yang menggeser
    // posisi tema, sampul jadi lebih tinggi dari ruang yang benar-benar
    // terlihat dan bagian bawahnya terpotong. Di sini tingginya diukur
    // langsung dari posisi tema terhadap viewport.
    // =====================================================================
    (function tinggiLayar() {
        var root = document.querySelector('.jv-root');
        if (!root) return;

        function ukur() {
            var atas = root.getBoundingClientRect().top + (window.pageYOffset || 0);
            var tinggi = Math.max(240, window.innerHeight - Math.max(0, atas));
            document.documentElement.style.setProperty('--jv-vh', tinggi + 'px');
        }

        ukur();
        on(window, 'resize', ukur, { passive: true });
        on(window, 'orientationchange', ukur, { passive: true });
        cleanupFns.push(function () {
            document.documentElement.style.removeProperty('--jv-vh');
        });
    })();

    // =====================================================================
    // VIDEO LATAR
    // Video di-hotlink dari server sumber, jadi HARUS tahan gagal: kalau
    // tak bisa dimuat, mural statis di bawahnya yang tampil. Video baru
    // dimunculkan setelah frame pertama ter-decode supaya tidak berkedip
    // hitam. Host TIDAK boleh dianggap mengurus video ini.
    // =====================================================================
    (function videoLatar() {
        var videos = document.querySelectorAll('.jv-video');

        Array.prototype.forEach.call(videos, function (v) {
            function siap() {
                // readyState >= 2 = frame pertama sudah tersedia.
                if (v.readyState >= 2) v.classList.add('is-ready');
            }

            on(v, 'loadeddata', siap);
            on(v, 'canplay', siap);
            // Gagal muat: biarkan tersembunyi, mural statis yang dipakai.
            on(v, 'error', function () { v.classList.remove('is-ready'); });
            siap();

            // TIDAK ADA video yang diputar di sini. Panel kiri desktop kini
            // memakai foto sampul tenant (bukan video lagi), dan dua video
            // yang tersisa (#jv-video-hero & #jv-video-sticky) berada di
            // dalam kolom undangan yang masih tertutup sampul. Keduanya baru
            // dibangunkan oleh buka() supaya tamu tidak mengunduh berkas
            // video besar yang belum tentu ia lihat.
        });

        // Jeda video saat tab tidak aktif — hemat baterai & data.
        function onVisibility() {
            Array.prototype.forEach.call(videos, function (v) {
                if (document.hidden) {
                    v.pause();
                } else if (v.classList.contains('is-ready')) {
                    var p = v.play();
                    if (p && typeof p.catch === 'function') p.catch(function () { /* noop */ });
                }
            });
        }
        on(document, 'visibilitychange', onVisibility);

        cleanupFns.push(function () {
            Array.prototype.forEach.call(videos, function (v) {
                try { v.pause(); } catch (e) { /* noop */ }
            });
        });
    })();

    // =====================================================================
    // TOAST
    // =====================================================================
    var toastTimer = null;
    function showToast(msg) {
        var box = document.getElementById('jv-toast');
        var span = document.getElementById('jv-toast-msg');
        if (!box || !span) return;
        span.textContent = msg;
        box.classList.add('is-show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { box.classList.remove('is-show'); }, 2600);
    }
    cleanupFns.push(function () { if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; } });

    // =====================================================================
    // TANGGAL — dipakai countdown dan blok tanggal besar (20 / SEP / 2026)
    //
    // Host tidak memberi tanggal dalam format ISO ke tema, jadi kita parse
    // teks tanggal akad (mis. "Sabtu, 20 September 2026"). Kalau akad kosong
    // atau tak terbaca, jatuh ke tanggal resepsi.
    // =====================================================================
    var BULAN = {
        januari: 0, january: 0, jan: 0,
        februari: 1, february: 1, feb: 1, pebruari: 1,
        maret: 2, march: 2, mar: 2,
        april: 3, apr: 3,
        mei: 4, may: 4,
        juni: 5, june: 5, jun: 5,
        juli: 6, july: 6, jul: 6,
        agustus: 7, august: 7, agu: 7, aug: 7,
        september: 8, sep: 8, sept: 8,
        oktober: 9, october: 9, okt: 9, oct: 9,
        november: 10, nov: 10, nopember: 10,
        desember: 11, december: 11, des: 11, dec: 11
    };
    var BULAN_SINGKAT = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

    function parseTanggal(raw) {
        if (!raw) return null;
        var s = String(raw).trim();
        if (!s) return null;

        // Format ISO: 2026-09-20
        var iso = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], 0, 0, 0, 0);

        // Format teks Indonesia/Inggris: "Sabtu, 20 September 2026"
        var teks = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
        if (teks) {
            var bln = BULAN[teks[2].toLowerCase()];
            if (bln !== undefined) return new Date(+teks[3], bln, +teks[1], 0, 0, 0, 0);
        }

        // Format angka: 20/09/2026 atau 20-09-2026
        var num = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
        if (num) return new Date(+num[3], +num[2] - 1, +num[1], 0, 0, 0, 0);

        var d = new Date(s);
        return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    }

    function tanggalAcara() {
        var src = document.getElementById('jv-date-src');
        if (!src) return null;
        return parseTanggal(src.getAttribute('data-akad'))
            || parseTanggal(src.getAttribute('data-resepsi'));
    }

    // ---- Blok tanggal besar ----------------------------------------------
    (function bigDate() {
        var day = tanggalAcara();
        if (!day) return;
        var d = document.getElementById('jv-big-day');
        var m = document.getElementById('jv-big-month');
        var y = document.getElementById('jv-big-year');
        if (d) d.textContent = String(day.getDate()).padStart(2, '0');
        if (m) m.textContent = BULAN_SINGKAT[day.getMonth()];
        if (y) y.textContent = String(day.getFullYear());
    })();

    // =====================================================================
    // COUNTDOWN
    // Interval disimpan di window supaya sisa interval dari eksekusi
    // sebelumnya tetap terbunuh walau cleanup hook sempat terlewat.
    // =====================================================================
    (function countdown() {
        if (window.__jvCdTimer) {
            clearInterval(window.__jvCdTimer);
            window.__jvCdTimer = null;
        }

        var day = tanggalAcara();
        if (!day) return;

        // Akhir acara = jam terakhir yang tertulis di jam resepsi. Dipakai
        // untuk membedakan "hari-H" dengan "acara sudah selesai".
        function akhirAcara() {
            var el = document.getElementById('jv-jam-resepsi');
            var txt = el ? (el.textContent || '') : '';
            var jam = txt.match(/(\d{1,2})[:.](\d{2})/g) || [];
            var h = 23, mnt = 59;
            if (jam.length >= 2) {
                var p = jam[jam.length - 1].split(/[:.]/);
                h = +p[0]; mnt = +p[1];
            } else if (jam.length === 1) {
                var q = jam[0].split(/[:.]/);
                h = Math.min(23, +q[0] + 3); mnt = +q[1];
            }
            var end = new Date(day.getTime());
            end.setHours(h, mnt, 0, 0);
            return end;
        }

        var end = akhirAcara();

        function set(id, val) {
            var el = document.getElementById(id);
            if (el) el.textContent = String(val).padStart(2, '0');
        }

        function selesai(msg) {
            var box = document.getElementById('jv-countdown');
            var st = document.getElementById('jv-cd-status');
            if (box) box.style.display = 'none';
            if (st) { st.textContent = msg; st.style.display = 'block'; }
            if (window.__jvCdTimer) { clearInterval(window.__jvCdTimer); window.__jvCdTimer = null; }
        }

        function tick() {
            var sisa = day.getTime() - Date.now();
            if (sisa > 0) {
                set('days', Math.floor(sisa / 864e5));
                set('hours', Math.floor((sisa % 864e5) / 36e5));
                set('minutes', Math.floor((sisa % 36e5) / 6e4));
                set('seconds', Math.floor((sisa % 6e4) / 1000));
            } else if (Date.now() <= end.getTime()) {
                selesai('Hari yang kami nantikan telah tiba.');
            } else {
                selesai('Acara kami telah selesai. Terima kasih atas doa & restunya.');
            }
        }

        tick();
        window.__jvCdTimer = setInterval(tick, 1000);
        cleanupFns.push(function () {
            if (window.__jvCdTimer) { clearInterval(window.__jvCdTimer); window.__jvCdTimer = null; }
        });
    })();

    // =====================================================================
    // GOYANGAN DAUN
    // Delay NEGATIF membuat tiap daun langsung mulai di fase acak siklusnya
    // (tanpa jeda menunggu), dan durasi acak 4–7s membuatnya tak pernah
    // bergoyang serempak. Ini yang membuat gerakannya terasa organik.
    // =====================================================================
    (function daunAcak() {
        var daun = document.querySelectorAll('.daun-goyang');
        for (var i = 0; i < daun.length; i++) {
            daun[i].style.animationDelay = (Math.random() * -10).toFixed(2) + 's';
            daun[i].style.animationDuration = (Math.random() * 3 + 4).toFixed(2) + 's';
        }
    })();

    // =====================================================================
    // SCROLL REVEAL — meniru mekanisme entrance Elementor:
    // elemen mulai tak terlihat, lalu diberi kelas animasi + delay saat
    // masuk viewport.
    // =====================================================================
    (function reveal() {
        function tampilkan(el) {
            if (el.classList.contains('jv-in')) return; // idempoten
            var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
            // Delay hanya untuk animasi pembuka di sampul. Untuk isi undangan
            // delay dibuang: elemen yang ditampilkan setelah host meng-inject
            // ulang HTML akan tersangkut di frame awal animasi (opacity 0)
            // selama delay-nya, dan itu terlihat sebagai konten yang hilang.
            if (delay > 0 && el.closest('.jv-cover')) {
                el.style.animationDelay = delay + 'ms';
            } else {
                el.style.animationDelay = '0ms';
            }
            el.classList.add('jv-in');
        }

        // Tandai <html> HANYA setelah kita yakin bisa mengurus reveal-nya.
        // CSS memakai penanda ini untuk memutuskan boleh-tidaknya
        // menyembunyikan konten (lihat catatan `.jv-anim` di index.css).
        // Kalau baris ini tak pernah tercapai karena JS error, konten tetap
        // terlihat — undangan tidak pernah jadi layar kosong.
        document.documentElement.classList.add('jv-js');
        cleanupFns.push(function () {
            document.documentElement.classList.remove('jv-js');
        });

        var io = null;

        function pasang() {
            var items = document.querySelectorAll('.jv-anim:not(.jv-in)');
            if (!items.length) return;

            if (!io) {
                for (var i = 0; i < items.length; i++) tampilkan(items[i]);
                return;
            }
            var batasAtas = screenEl ? screenEl.getBoundingClientRect().top : 0;
            var batasBawah = screenEl ? screenEl.getBoundingClientRect().bottom : window.innerHeight;

            for (var j = 0; j < items.length; j++) {
                var el = items[j];

                // Isi sampul ditampilkan seketika: ia sudah berada di viewport
                // sejak awal, jadi observer tak akan pernah memicunya.
                if (el.closest('.jv-cover')) { tampilkan(el); continue; }

                // Elemen yang SUDAH tampak juga ditampilkan langsung.
                // IntersectionObserver hanya menyala saat perpotongan
                // BERUBAH; elemen yang sejak awal sudah di dalam viewport
                // scroller (mis. hasil re-inject saat halaman ter-scroll)
                // tidak pernah memicunya dan akan tetap opacity:0 selamanya.
                var r = el.getBoundingClientRect();
                if (r.top < batasBawah && r.bottom > batasAtas) tampilkan(el);
                else io.observe(el);
            }
        }

        if ('IntersectionObserver' in window && screenEl) {
            // root = scroller undangan (.jv-screen), bukan viewport — isi
            // undangan di-scroll di dalam elemen itu, bukan di halaman host.
            io = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    tampilkan(en.target);
                    io.unobserve(en.target);
                });
            }, { root: screenEl, threshold: 0.12 });
            cleanupFns.push(function () { io.disconnect(); });
        }

        pasang();

        // Host meng-inject ulang HTML tema (mis. saat gambar menyusul atau
        // tamu mengirim RSVP/ucapan) TANPA menjalankan ulang JS. Elemen baru
        // itu kembali tanpa `.jv-in`, jadi tanpa pengawas ini seluruh isi
        // undangan akan menghilang begitu saja. MutationObserver memasang
        // ulang reveal pada elemen yang baru masuk.
        if ('MutationObserver' in window) {
            var mo = new MutationObserver(function () { pasang(); });
            mo.observe(document.body, { childList: true, subtree: true });
            cleanupFns.push(function () { mo.disconnect(); });
        }
    })();

    // =====================================================================
    // RSVP — dua tombol pilihan yang menyetel <select id="rsvp-status">
    //
    // Host membaca kehadiran dari `#rsvp-status`, dan nilainya HARUS
    // lowercase `hadir` / `tidak-hadir` — kalau tidak, host mencatat tamu
    // sebagai MENOLAK. Tombol di sini hanya lapisan tampilan; sumber
    // kebenarannya tetap <select> tersembunyi itu.
    //
    // Klik DI-DELEGASIKAN ke document supaya tetap hidup setelah host
    // meng-inject ulang HTML tema tanpa menjalankan ulang JS.
    // =====================================================================
    (function pilihanRsvp() {
        function sinkron() {
            var sel = document.getElementById('rsvp-status');
            var box = document.getElementById('jv-choice');
            if (!sel || !box) return;
            var btns = box.querySelectorAll('.jv-choice-btn');
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.toggle('is-on', btns[i].getAttribute('data-rsvp') === sel.value);
            }
        }

        on(document, 'click', function (e) {
            var btn = e.target && e.target.closest && e.target.closest('.jv-choice-btn');
            if (!btn) return;
            var sel = document.getElementById('rsvp-status');
            if (!sel) return;
            sel.value = btn.getAttribute('data-rsvp');
            // `change` dipicu manual: host/skrip lain mungkin menyimaknya.
            try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (err) { /* noop */ }
            sinkron();
        });

        sinkron();

        if ('MutationObserver' in window) {
            var mo = new MutationObserver(function () { sinkron(); });
            mo.observe(document.body, { childList: true, subtree: true });
            cleanupFns.push(function () { mo.disconnect(); });
        }
    })();

    // =====================================================================
    // DAFTAR UCAPAN — huruf awal nama + jumlah ucapan
    //
    // Dipasang ulang lewat MutationObserver: host menulis ulang daftar ini
    // setiap kali ada ucapan baru masuk, tanpa menjalankan ulang JS tema.
    // =====================================================================
    (function daftarUcapan() {
        function pasang() {
            var items = document.querySelectorAll('[data-wish-item]');
            for (var i = 0; i < items.length; i++) {
                var ava = items[i].querySelector('.jv-wish-ava');
                var nama = items[i].querySelector('[data-wish-field="name"]');
                if (!ava || !nama) continue;
                var teks = (nama.textContent || '').trim();
                var huruf = teks ? teks.charAt(0).toUpperCase() : '?';
                // Hanya tulis kalau berubah — menulis terus-menerus memicu
                // MutationObserver lagi dan berujung gelung tak berujung.
                if (ava.textContent !== huruf) ava.textContent = huruf;
            }
            var hitung = document.getElementById('jv-wishes-count');
            if (hitung) {
                var teksJml = items.length ? items.length + ' ucapan' : 'Belum ada ucapan';
                if (hitung.textContent !== teksJml) hitung.textContent = teksJml;
            }
        }

        pasang();

        if ('MutationObserver' in window) {
            var mo2 = new MutationObserver(function () { pasang(); });
            mo2.observe(document.body, { childList: true, subtree: true });
            cleanupFns.push(function () { mo2.disconnect(); });
        }
    })();

    // =====================================================================
    // GALERI — layar besar + rel thumbnail, auto-slide 4 detik
    // =====================================================================
    (function galeri() {
        var stage = document.getElementById('jv-stage-img');
        var link = document.getElementById('jv-stage-link');
        var track = document.getElementById('jv-thumbs');
        if (!stage || !track) return;

        var thumbs = Array.prototype.slice.call(track.querySelectorAll('.jv-thumb'));
        if (!thumbs.length) return;

        var idx = 0;
        var timer = null;
        var fadeTimer = null;

        function tampil(i, geser) {
            idx = (i + thumbs.length) % thumbs.length;
            var url = thumbs[idx].getAttribute('data-full') || '';

            // Crossfade manual 300ms — sama seperti galeri aslinya.
            stage.style.opacity = '0';
            if (fadeTimer) clearTimeout(fadeTimer);
            fadeTimer = setTimeout(function () {
                stage.src = url;
                if (link) link.setAttribute('href', url);
                stage.style.opacity = '1';
            }, 300);

            thumbs.forEach(function (t, n) { t.classList.toggle('is-active', n === idx); });

            // Geser rel supaya thumbnail aktif berada di tengah. Sengaja
            // memakai scrollTo pada rel (bukan scrollIntoView) agar halaman
            // tidak ikut melompat.
            if (geser !== false) {
                var t = thumbs[idx];
                track.scrollTo({
                    left: t.offsetLeft - track.clientWidth / 2 + t.clientWidth / 2,
                    behavior: 'smooth'
                });
            }
        }

        function mulaiAuto() {
            if (timer) clearInterval(timer);
            timer = setInterval(function () { tampil(idx + 1); }, 4000);
        }

        thumbs.forEach(function (t, n) {
            on(t, 'click', function () { tampil(n); mulaiAuto(); });
        });

        // Frame pertama tanpa crossfade supaya tidak berkedip saat dibuka.
        stage.src = thumbs[0].getAttribute('data-full') || '';
        if (link) link.setAttribute('href', stage.src);
        thumbs[0].classList.add('is-active');
        mulaiAuto();

        cleanupFns.push(function () {
            if (timer) { clearInterval(timer); timer = null; }
            if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
        });
    })();

    // =====================================================================
    // PENUTUP — sembunyikan kalimat penutup tenant kalau kosong
    //
    // Elemennya SELALU berisi spasi/baris baru dari indentasi HTML, jadi
    // `:empty` di CSS tak pernah cocok; harus diperiksa dari teksnya.
    // =====================================================================
    (function penutupTenant() {
        var el = document.querySelector('.jv-closing-tenant');
        if (!el) return;
        if (!el.textContent.replace(/\s+/g, '')) el.classList.add('jv-kosong');
    })();

    // =====================================================================
    // LOVE STORY — tulang punggung linimasa yang tumbuh mengikuti guliran
    //
    // Simpul & kartu tiap bab sudah ditangani pengamat `.jv-anim` yang ada
    // (ia menambahkan .jv-in), jadi di sini HANYA tinggi garis emasnya.
    // =====================================================================
    (function loveStory() {
        var wrap = document.getElementById('jv-ls');
        var line = document.getElementById('jv-ls-line');
        if (!wrap || !line) return;

        var spine = wrap.querySelector('.jv-ls-spine');
        // Scroller-nya .jv-screen, BUKAN window — undangan digulir di dalam
        // kolomnya sendiri (lihat kontrak host).
        var scroller = document.querySelector('.jv-screen');
        if (!spine || !scroller) return;

        var rafId = 0;

        function hitung() {
            rafId = 0;
            var sp = spine.getBoundingClientRect();
            var sc = scroller.getBoundingClientRect();
            if (sp.height <= 0) return;

            // Garis terisi sampai titik ~65% tinggi layar: bab yang sedang
            // dibaca terasa "baru saja dilewati" garisnya, bukan tertinggal
            // jauh di bawah.
            var garisBaca = sc.top + sc.height * 0.65;
            var isi = garisBaca - sp.top;
            if (isi < 0) isi = 0;
            if (isi > sp.height) isi = sp.height;
            line.style.height = isi + 'px';
        }

        function jadwalkan() {
            if (rafId) return; // satu hitungan per frame
            rafId = requestAnimationFrame(hitung);
        }

        on(scroller, 'scroll', jadwalkan, { passive: true });
        on(window, 'resize', jadwalkan, { passive: true });
        hitung();

        cleanupFns.push(function () {
            if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        });
    })();

    // =====================================================================
    // PARALLAX PANEL KIRI (desktop) — bergerak halus mengikuti kursor
    // =====================================================================
    (function parallaxSisi() {
        // Mural DAN foto sampul sama-sama digeser: keduanya lapisan latar
        // yang saling menumpuk, jadi kalau cuma satu yang bergerak,
        // tepinya akan terlihat bergeser satu sama lain.
        var lapis = document.querySelectorAll('.jv-side-bg, .jv-side-photo');
        if (!lapis.length) return;
        function onMove(e) {
            if (window.innerWidth < 1024) return;
            var x = (e.clientX / window.innerWidth) - 0.5;
            var y = (e.clientY / window.innerHeight) - 0.5;
            var t = 'translate(' + (x * -22) + 'px,' + (y * -22) + 'px)';
            for (var i = 0; i < lapis.length; i++) lapis[i].style.transform = t;
        }
        on(document, 'mousemove', onMove);
    })();

    // =====================================================================
    // NAVIGASI, SALIN, TOMBOL — SEMUA didelegasikan ke document supaya
    // tetap hidup setelah host meng-inject ulang HTML (RSVP/ucapan).
    // =====================================================================
    (function interaksi() {
        function tutupMenu() {
            var m = document.getElementById('jv-menu');
            if (m) m.classList.remove('is-open');
        }

        function onClick(e) {
            var t = e.target.closest
                ? e.target.closest('[data-scroll], [data-copy], #btn-show-menu, #jv-menu-close, #jv-btn-top, #jv-btn-save-date, #jv-menu')
                : null;
            if (!t) return;

            // Klik latar gelap menu → tutup.
            if (t.id === 'jv-menu') {
                if (e.target === t || e.target.classList.contains('jv-menu-bg')) tutupMenu();
                return;
            }

            if (t.id === 'btn-show-menu') {
                var m = document.getElementById('jv-menu');
                if (m) m.classList.add('is-open');
                return;
            }

            if (t.id === 'jv-menu-close') { tutupMenu(); return; }

            if (t.id === 'jv-btn-top') {
                if (screenEl) screenEl.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            if (t.id === 'jv-btn-save-date') {
                simpanKalender();
                return;
            }

            var copyId = t.getAttribute('data-copy');
            if (copyId) {
                salin(copyId, t);
                return;
            }

            var target = t.getAttribute('data-scroll');
            if (target) {
                tutupMenu();
                var sec = document.getElementById(target);
                if (sec) setTimeout(function () { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 140);
            }
        }
        on(document, 'click', onClick);

        function salin(id, btn) {
            var el = document.getElementById(id);
            if (!el) return;
            var teks = (el.innerText || el.textContent || '').trim();
            if (!teks) return;

            var label = btn.textContent;
            function selesai() {
                btn.textContent = 'Tersalin!';
                setTimeout(function () { btn.textContent = label; }, 2000);
                showToast('Berhasil disalin');
            }
            function cadangan() {
                var ta = document.createElement('textarea');
                ta.value = teks;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); selesai(); } catch (err) { /* noop */ }
                document.body.removeChild(ta);
            }
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(teks).then(selesai).catch(cadangan);
            } else {
                cadangan();
            }
        }

        // "Save The Date" → unduh berkas .ics agar bisa masuk kalender tamu.
        function simpanKalender() {
            var day = tanggalAcara();
            if (!day) { showToast('Tanggal acara belum tersedia'); return; }

            function stamp(d) {
                return d.getFullYear()
                    + String(d.getMonth() + 1).padStart(2, '0')
                    + String(d.getDate()).padStart(2, '0');
            }
            var besok = new Date(day.getTime() + 864e5);
            var judul = document.querySelector('.jv-menu-names');
            var nama = judul ? judul.textContent.trim() : 'Wedding';

            var ics = [
                'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//java-vintage//ID',
                'BEGIN:VEVENT',
                'DTSTART;VALUE=DATE:' + stamp(day),
                'DTEND;VALUE=DATE:' + stamp(besok),
                'SUMMARY:Wedding of ' + nama,
                'END:VEVENT', 'END:VCALENDAR'
            ].join('\r\n');

            var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'save-the-date.ics';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            showToast('Save the date tersimpan');
        }
    })();

    // =====================================================================
    // VISIBILITAS TOMBOL "KE ATAS"
    // =====================================================================
    (function tombolAtas() {
        if (!screenEl) return;
        var btn = document.getElementById('jv-btn-top');
        if (!btn) return;
        function onScroll() {
            btn.style.display = screenEl.scrollTop > 480 ? 'flex' : 'none';
        }
        on(screenEl, 'scroll', onScroll, { passive: true });
        onScroll();
    })();

    // =====================================================================
    // MUSIK — SENGAJA TIDAK ADA KODE DI SINI.
    //
    // Host (ThemeWrapper) yang memegang state musik dan SATU-SATUNYA yang
    // menulis ikon: display #play-icon/#pause-icon dan kelas .music-playing
    // pada #btn-toggle-music. Tema hanya menyediakan tombolnya; animasi
    // piringan vinyl mengikuti kelas .music-playing lewat CSS.
    //
    // Jangan menambahkan listener 'play'/'pause' pada <audio id="bg-music">
    // dan jangan memanggil audio.play(): host tidak memutar <audio> milik
    // tema (ia punya player sendiri), sehingga audio.paused SELALU true dan
    // handler tema akan menimpa ikon yang barusan di-set host.
    // =====================================================================

    // =====================================================================
    // MEMBUKA SAMPUL
    // Sengaja TIDAK didaftarkan ke cleanupFns: host menjalankan ulang skrip
    // ini saat isOpened berubah, dan kalau animasi buka ikut dibongkar, ia
    // tak pernah sempat berjalan pada undangan yang live.
    // =====================================================================
    (function bukaSampul() {
        var cover = document.getElementById('theme-cover');
        var fab = document.getElementById('theme-fab-container');

        function buka() {
            // .reveal-content = penanda host "sudah dibuka" (host juga
            // menambahkannya sendiri); .jv-open penanda milik tema supaya
            // pratinjau Theme Editor — yang tak punya host — tetap jalan.
            // Keduanya melepas kunci overflow-y pada .jv-screen.
            if (screenEl) {
                screenEl.classList.add('jv-open');
                screenEl.classList.add('reveal-content');
            }
            if (cover) cover.classList.add('jv-cover-gone');
            if (fab) fab.style.display = 'block';

            // Video baru dijalankan SETELAH sampul dibuka. Selama sampul
            // masih menutup, tak ada video yang terlihat, jadi memuatnya
            // lebih awal cuma memboroskan kuota tamu — dua berkasnya
            // berukuran ~7,6 MB. Klik "Open" juga merupakan gesture
            // pengguna, yang membuat browser mengizinkan pemutaran.
            var vids = document.querySelectorAll('.jv-video');
            for (var v = 0; v < vids.length; v++) {
                var vid = vids[v];
                try {
                    // preload="none" menahan unduhan; longgarkan di sini.
                    if (vid.preload === 'none') vid.preload = 'auto';
                    if (!vid.getAttribute('data-jv-armed')) {
                        vid.setAttribute('data-jv-armed', '1');
                        vid.load();
                    }
                    var p = vid.play();
                    if (p && p.catch) p.catch(function () { /* autoplay ditolak */ });
                } catch (e) { /* noop */ }
            }

            // Elemen yang SUDAH berada di dalam viewport scroller saat
            // undangan dibuka tidak memicu IntersectionObserver (posisinya
            // tak berubah), jadi section teratas ditampilkan langsung.
            setTimeout(function () {
                var atas = document.querySelectorAll('#jv-home .jv-anim:not(.jv-in), #couple .jv-anim:not(.jv-in)');
                for (var i = 0; i < atas.length; i++) atas[i].classList.add('jv-in');
            }, 60);
        }

        // DI-DELEGASIKAN ke document, bukan dipasang langsung ke tombol:
        // host meng-inject ulang HTML tema (mis. setelah RSVP/ucapan) tanpa
        // menjalankan ulang JS, jadi listener yang menempel ke elemen akan
        // putus. Sengaja TIDAK didaftarkan ke cleanupFns (lihat catatan di
        // atas) supaya animasi buka tetap hidup saat host re-exec.
        document.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('#btn-open-invitation')) buka();
        });

        // Kalau undangan sudah dalam keadaan terbuka (HTML di-inject ulang
        // setelah dibuka, atau host yang memicu open), cerminkan keadaannya.
        var sudahDibuka = (screenEl && screenEl.classList.contains('reveal-content'))
            || !!document.querySelector('.theme-wrapper.is-opened');

        if (sudahDibuka) {
            if (screenEl) screenEl.classList.add('jv-open');
            if (cover) cover.classList.add('jv-cover-gone');
            if (fab) fab.style.display = 'block';
        }

        // JARING PENGAMAN: kalau tombol "Open" ternyata berada di luar layar
        // (viewport sangat pendek, bilah alamat mobile, dsb.), tamu tidak
        // punya cara membuka undangan sama sekali. Deteksi kondisi itu dan
        // geser isi sampul agar tombolnya pasti terjangkau.
        if (!sudahDibuka) {
            setTimeout(function () {
                var b = document.getElementById('btn-open-invitation');
                var inner = document.querySelector('.jv-cover-inner');
                if (!b || !inner) return;
                var r = b.getBoundingClientRect();
                var batas = (cover ? cover.getBoundingClientRect().bottom : window.innerHeight);
                if (r.bottom > batas + 1) {
                    // Isi tidak muat: rapatkan jarak & gulirkan tombol ke tampak.
                    inner.style.gap = '2vh';
                    inner.style.justifyContent = 'flex-start';
                    b.scrollIntoView({ block: 'center' });
                }
            }, 400);
        }
    })();

})();
