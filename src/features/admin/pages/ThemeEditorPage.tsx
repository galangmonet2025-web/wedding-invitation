import { useState, useEffect, useRef, useCallback } from 'react';
import { themeApi, tenantApi, publicApi } from '@/core/api/endpoints';
import { Theme, PlanType, Tenant, InvitationContent, ImageRecord } from '@/types';
import { useParams, useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineSave, HiOutlineEye, HiOutlineInformationCircle, HiOutlineRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { ThemeGuideModal } from '../components/ThemeGuideModal';
import { parseTemplate } from '@/utils/templateParser';
import Editor from '@monaco-editor/react';
import { fetchProxyImageBase64 } from '@/shared/components/ProxyImage';

export function ThemeEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [showDataBinding, setShowDataBinding] = useState(true);
    const [showCover, setShowCover] = useState(true);
    const [isFocusMode, setIsFocusMode] = useState(false);

    // Form and Editor State
    const [name, setName] = useState('');
    const [planType, setPlanType] = useState<PlanType>('basic');
    const [previewImage, setPreviewImage] = useState('');
    const [htmlCode, setHtmlCode] = useState('<!-- Tambahkan tombol dengan id="btn-open-invitation" di cover -->\n<div class="wedding-theme">\n  <h1>{{bride_name}} & {{groom_name}}</h1>\n  <button id="btn-open-invitation">Buka Undangan</button>\n</div>');
    const [cssCode, setCssCode] = useState('.wedding-theme {\n  text-align: center;\n  padding: 50px;\n}');
    const [jsCode, setJsCode] = useState('console.log("Theme Loaded!");');
    const [flagDraft, setFlagDraft] = useState(true);
    const [imageTypes, setImageTypes] = useState<string[]>([]);
    const [newImageType, setNewImageType] = useState('');

    const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
    const [activeTabPanel, setActiveTabPanel] = useState<'editor' | 'settings'>('editor');

    // Preview iframe
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Tenants for preview selector
    const [allTenants, setAllTenants] = useState<Tenant[]>([]);
    const [selectedPreviewTenantId, setSelectedPreviewTenantId] = useState<string>('');
    const [previewContent, setPreviewContent] = useState<Partial<InvitationContent>>({});
    const [previewImages, setPreviewImages] = useState<ImageRecord[]>([]);
    const [previewImagesB64, setPreviewImagesB64] = useState<Record<string, string>>({});
    const [loadingPreview, setLoadingPreview] = useState(false);

    // One real tenant for preview context (derived from selection)
    const [previewTenant, setPreviewTenant] = useState<Tenant | null>(null);

    const loadData = async () => {
        try {
            // Load all tenants for the preview selector
            const tenantRes = await tenantApi.getTenants();
            if (tenantRes.success && tenantRes.data.length > 0) {
                setAllTenants(tenantRes.data);
                setSelectedPreviewTenantId(tenantRes.data[0].id);
                setPreviewTenant(tenantRes.data[0]);
            }

            if (!isNew) {
                const res = await themeApi.getThemes();
                if (res.success) {
                    const theme = res.data.find(t => t.id === id);
                    if (theme) {
                        setName(theme.name);
                        setPlanType(theme.plan_type);
                        setPreviewImage(theme.preview_image || '');
                        setHtmlCode(theme.html_template || '');
                        setCssCode(theme.css_template || '');
                        setJsCode(theme.js_template || '');
                        setFlagDraft(theme.flag_draft !== false && theme.flag_draft !== 'false');
                        setImageTypes(theme.image_types || []);
                    } else {
                        toast.error('Theme not found');
                        navigate('/themes');
                    }
                }
            }
        } catch (err) {
            toast.error('Gagal memuat data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    // When the selected preview tenant changes, fetch their real content + images
    const loadTenantPreviewData = useCallback(async (tenantId: string) => {
        const tenant = allTenants.find(t => t.id === tenantId);
        if (!tenant) return;
        setPreviewTenant(tenant);
        setLoadingPreview(true);
        try {
            const res = await publicApi.getInvitation(tenant.domain_slug);
            if (res.success) {
                setPreviewContent(res.data.content || {});
                const imgs: ImageRecord[] = res.data.images || [];
                setPreviewImages(imgs);

                // Pre-convert all proxy images to base64 for faster preview
                const b64map: Record<string, string> = {};
                await Promise.all(imgs.map(async (img) => {
                    if (img.cdn_url) {
                        try {
                            b64map[img.image_type] = await fetchProxyImageBase64(img.cdn_url);
                        } catch { }
                    }
                }));
                setPreviewImagesB64(b64map);
            }
        } catch (e) {
            console.error('Failed to load tenant preview data:', e);
        } finally {
            setLoadingPreview(false);
        }
    }, [allTenants]);

    useEffect(() => {
        if (selectedPreviewTenantId && allTenants.length > 0) {
            loadTenantPreviewData(selectedPreviewTenantId);
        }
    }, [selectedPreviewTenantId, allTenants]);

    const handleSave = async (isDraft: boolean) => {
        if (!name.trim()) return toast.error('Theme Name is required');

        setSaving(true);
        try {
            const payload = {
                name,
                plan_type: planType,
                preview_image: previewImage,
                html_template: htmlCode,
                css_template: cssCode,
                js_template: jsCode,
                flag_draft: isDraft,
                image_types: imageTypes
            };

            if (isNew) {
                const res = await themeApi.createTheme(payload);
                if (res.success) {
                    toast.success('Theme created successfully');
                    setFlagDraft(isDraft);
                    navigate(`/themes/editor/${res.data.id}`, { replace: true });
                } else {
                    toast.error(res.message);
                }
            } else {
                const res = await themeApi.updateTheme({ id: id!, ...payload });
                if (res.success) {
                    toast.success('Theme saved successfully');
                    setFlagDraft(isDraft);
                }
                else toast.error(res.message);
            }
        } catch (err) {
            toast.error('Gagal menyimpan tema');
        } finally {
            setSaving(false);
        }
    };

    const updatePreview = () => {
        if (!iframeRef.current) return;

        const doc = iframeRef.current.contentWindow?.document;
        if (!doc) return;

        // Dummy tenant data mapped just like in InvitationPage
        const t = previewTenant || { bride_name: 'Fiona', groom_name: 'Galang', wedding_date: '2026-10-20' };

        let finalHtml = htmlCode;

        if (showDataBinding) {
            const c = previewContent;
            const imgs = previewImagesB64;

            // Helper to get real image URL or fallback to a dummy
            const dummies = [
                'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?q=80&w=800&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800&auto=format&fit=crop'
            ];
            const realImg = (type: string, fallbackIdx = 0) =>
                imgs[type] || dummies[fallbackIdx % dummies.length];

            let timeline: any[] = [];
            try { timeline = c.timeline_kisah ? JSON.parse(c.timeline_kisah) : []; } catch { }

            const galleryImgs = previewImages
                .filter(img => img.image_type === 'gallery')
                .map(img => ({ url: imgs[img.image_type] || img.cdn_url || '', caption: img.file_name || '' }));

            const mockData: Record<string, any> = {
                bride_name: t.bride_name || 'Fiona',
                groom_name: t.groom_name || 'Galang',
                wedding_date: t.wedding_date ? new Date(t.wedding_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Senin, 10 Agustus 2026',
                tanggal_akad: c.tanggal_akad ? new Date(c.tanggal_akad).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Minggu, 9 Agustus 2026',
                jam_akad: `${c.jam_awal_akad || '08:00'} - ${c.jam_akhir_akad || 'Selesai'}`,
                jam_resepsi: `${c.jam_awal_resepsi || '11:00'} - ${c.jam_akhir_resepsi || '14:00'}`,
                nama_lokasi_akad: c.nama_lokasi_akad || 'Masjid Istiqlal',
                keterangan_lokasi_akad: c.keterangan_lokasi_akad || 'Jl. Taman Wijaya Kusuma',
                akad_map: c.akad_map || '#',
                tanggal_resepsi: t.wedding_date ? new Date(t.wedding_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Senin, 10 Agustus 2026',
                nama_lokasi_resepsi: c.nama_lokasi_resepsi || 'Gedung Serbaguna',
                keterangan_lokasi_resepsi: c.keterangan_lokasi_resepsi || 'Jl. Sudirman No 10',
                resepsi_map: c.resepsi_map || '#',
                nama_bapak_laki_laki: c.nama_bapak_laki_laki || 'Bpk. Ahmad',
                nama_ibu_laki_laki: c.nama_ibu_laki_laki || 'Ibu Siti',
                nama_bapak_perempuan: c.nama_bapak_perempuan || 'Bpk. Budi',
                nama_ibu_perempuan: c.nama_ibu_perempuan || 'Ibu Ani',
                ig_laki_laki: c.account_media_sosial_laki_laki || 'galang',
                ig_perempuan: c.account_media_sosial_perempuan || 'fiona',
                guest_name: 'Bpk/Ibu/Sdr/i (Tamu undangan)',
                kalimat_pembuka: c.kalimat_pembuka_undangan || 'Dengan memohon rahmat dan ridho Allah SWT...',
                kalimat_penutup: c.kalimat_penutup_undangan || 'Merupakan suatu kehormatan dan kebahagiaan bagi kami...',
                quote: c.custom_kalimat_1 || 'Dan di antara tanda-tanda kekuasaan-Nya...',
                custom_kalimat_1: c.custom_kalimat_1 || '',
                custom_kalimat_2: c.custom_kalimat_2 || '',
                custom_kalimat_3: c.custom_kalimat_3 || '',
                custom_kalimat_4: c.custom_kalimat_4 || '',
                bank_1: c.nama_bank_1 || 'BCA',
                rek_1: c.nomor_rekening_bank_1 || '1234567890',
                nama_rek_1: c.nama_rekening_bank_1 || t.groom_name || 'Galang',
                bank_2: c.nama_bank_2 || 'Mandiri',
                rek_2: c.nomor_rekening_bank_2 || '0987654321',
                nama_rek_2: c.nama_rekening_bank_2 || t.bride_name || 'Fiona',
                link_backsound_music: c.link_backsound_music || '',
                link_live_streaming: c.link_live_streaming || '',
                platform_live_streaming: c.platform_live_streaming || 'YouTube',
                flag_pakai_timeline_kisah: timeline.length > 0,
                timeline_kisah: timeline.length > 0 ? timeline : [
                    { tanggal: 'Januari 2020', judul: 'Pertama Kali Bertemu', deskripsi: 'Kami bertemu dalam sebuah acara komunitas.' },
                    { tanggal: 'Maret 2022', judul: 'Memutuskan Bersama', deskripsi: 'Kami resmi berpacaran dan memiliki komitmen.' },
                    { tanggal: 'Desember 2024', judul: 'Lamaran', deskripsi: 'Momen berharga ketika dua keluarga bertemu.' }
                ],
                tampilkan_amplop_online: true,
                flag_lokasi_akad_dan_resepsi_berbeda: true,
                flag_tampilkan_nama_orang_tua: true,
                flag_tampilkan_sosial_media_mempelai: true,
                is_fitur_gallery: galleryImgs.length > 0,
                galleries: galleryImgs.length > 0 ? galleryImgs : [
                    { url: dummies[0], caption: 'Prewedding 1' },
                    { url: dummies[1], caption: 'Prewedding 2' },
                    { url: dummies[2], caption: 'Prewedding 3' }
                ],
                is_fitur_cerita: true,
                is_fitur_live_streaming: !!(c.flag_pakai_live_streaming),
                live_streaming: { url: c.link_live_streaming || 'https://youtube.com', platform: c.platform_live_streaming || 'YouTube' },

                // Standard photo variables (real base64 or dummy fallback)
                photo_hero_cover: realImg('hero_cover', 0),
                photo_groom_photo: realImg('groom_photo', 1),
                photo_bride_photo: realImg('bride_photo', 2),
                photo_background: realImg('background', 3),
                photo_closing: realImg('closing', 0),
                photo_story_photo: realImg('story_photo', 1),
                photo_gallery: galleryImgs.length > 0 ? galleryImgs : [
                    { url: dummies[0] }, { url: dummies[1] }, { url: dummies[2] }
                ],
            };

            // Inject dynamic image type variables (real base64 or dummy fallback)
            imageTypes.forEach((key, index) => {
                mockData[key] = imgs[key] || dummies[index % dummies.length];
            });

            finalHtml = parseTemplate(htmlCode, mockData);
        }

        // Construct HTML content to render inside iframe
        const iframeContent = `
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <!-- Google Fonts -->
                <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap" rel="stylesheet">
                <!-- UIkit V3 (Locked) -->
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/css/uikit.min.css" />
                <script src="https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/js/uikit.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/uikit@3.21.0/dist/js/uikit-icons.min.js"></script>
                <!-- Bootstrap 5 (Locked) -->
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
                
                <style>
                    /* Reset body margin for iframe */
                    body { margin: 0; padding: 0; box-sizing: border-box; }
                    ${cssCode}
                </style>
            </head>
            <body>
                ${finalHtml}
                
                <script>
                    // Execute JS template content
                    try {
                        ${jsCode}
                    } catch(e) {
                        console.error("Theme JS Error:", e);
                    }

                    // Mock QR Button for Preview
                    document.addEventListener('click', function(e) {
                        if (e.target.closest('#btn-show-qr')) {
                            e.preventDefault();
                            alert("Simulasi: Di halaman publik, ini akan menampilkan Modal QR Code Kehadiran Tamu.");
                        }
                    });

                    ${!showCover ? `
                    // Auto-open invitation to bypass cover
                    setTimeout(() => {
                        const btn = document.getElementById('btn-open-invitation');
                        if (btn) btn.click();
                    }, 150);
                    ` : ''}
                </script>
            </body>
            </html>
        `;

        doc.open();
        doc.write(iframeContent);
        doc.close();
    };

    // Auto update preview when code changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            updatePreview();
        }, 800);
        return () => clearTimeout(timer);
    }, [htmlCode, cssCode, jsCode, previewTenant, showDataBinding, showCover]);

    const handleEditorWillMount = (monaco: any) => {
        monaco.editor.defineTheme('monokai', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '272822', foreground: 'f8f8f2' },
                { token: 'comment', foreground: '75715e' },
                { token: 'keyword', foreground: 'f92672' },
                { token: 'string', foreground: 'e6db74' },
                { token: 'number', foreground: 'ae81ff' },
                { token: 'regexp', foreground: 'fd971f' },
                { token: 'type', foreground: '66d9ef' },
                { token: 'class', foreground: 'a6e22e' },
                { token: 'function', foreground: 'a6e22e' },
                { token: 'variable', foreground: 'f8f8f2' },
            ],
            colors: {
                'editor.background': '#272822',
                'editor.foreground': '#f8f8f2',
                'editorCursor.foreground': '#f8f8f0',
                'editor.lineHighlightBackground': '#3e3d32',
                'editor.selectionBackground': '#49483e',
                'editorIndentGuide.background': '#464741',
                'editorIndentGuide.activeBackground': '#767771',
            }
        });
    };

    const toggleFocusMode = async (enable: boolean) => {
        setIsFocusMode(enable);
        try {
            if (enable) {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                }
            } else {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                }
            }
        } catch (err) {
            console.error("Error attempting to toggle fullscreen:", err);
        }
    };

    // Listen for native Fullscreen exits (e.g. Esc key)
    useEffect(() => {
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFocusMode(false);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Memuat Editor Tema...</div>;

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col bg-gray-50 dark:bg-gray-900 -mx-4 -my-6 sm:-mx-6 lg:-mx-8">
            {/* Toolbar */}
            <div className="flex-none flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/themes')} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <HiOutlineArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-bold text-gray-800 dark:text-white">
                                {isNew ? 'Membuat Tema Baru' : 'Edit Tema'}
                            </h1>
                            {!isNew && (
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${flagDraft
                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                    : 'bg-green-100 text-green-800 border border-green-200'
                                    }`}>
                                    {flagDraft ? 'Draft' : 'Published'}
                                </span>
                            )}
                            <button
                                onClick={() => toggleFocusMode(true)}
                                className="ml-2 px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors"
                            >
                                Focus Mode 🔲
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">{name || 'Belum ada nama'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="flex items-center gap-2 py-2 px-4 shadow-sm disabled:opacity-50 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
                    >
                        {saving ? '...' : (
                            <>
                                <HiOutlineSave className="w-4 h-4 text-gray-500" />
                                Simpan Draf
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2 py-2 px-4 shadow-md disabled:opacity-50"
                    >
                        {saving ? 'Menyimpan...' : (
                            <>
                                <HiOutlineSave className="w-4 h-4 text-white" />
                                Simpan & Publish
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Editor Split Area */}
            <div className={`flex flex-col lg:flex-row min-h-0 ${isFocusMode ? 'fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex-1' : 'flex-1'}`}>
                {/* Left Panel (Editor / Settings) */}
                <div className="w-full lg:w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 justify-between items-center">
                        <div className="flex flex-1">
                            <button
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTabPanel === 'editor' ? 'border-gold-500 text-gold-600 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTabPanel('editor')}
                            >
                                <span className="flex justify-center items-center gap-2">&lt;/&gt; Code</span>
                            </button>
                            <button
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTabPanel === 'settings' ? 'border-gold-500 text-gold-600 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTabPanel('settings')}
                            >
                                <span className="flex justify-center items-center gap-2">⚙️ Pengaturan</span>
                            </button>
                            <button
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors border-transparent text-gray-500 hover:text-gray-700`}
                                onClick={() => setIsGuideOpen(true)}
                                title="Panduan Pembuatan Tema"
                            >
                                <span className="flex justify-center items-center gap-2"><HiOutlineInformationCircle className="w-5 h-5" /> Panduan</span>
                            </button>
                        </div>
                        {isFocusMode && (
                            <button
                                onClick={() => toggleFocusMode(false)}
                                className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                                ✖ Exit Focus Mode
                            </button>
                        )}
                    </div>

                    {activeTabPanel === 'settings' && (
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Tema *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="input-field"
                                    placeholder="Contoh: Gold Ivy Template"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
                                <select
                                    value={planType}
                                    onChange={e => setPlanType(e.target.value as PlanType)}
                                    className="input-field"
                                >
                                    <option value="basic">Basic</option>
                                    <option value="pro">Pro</option>
                                    <option value="premium">Premium</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preview Image URL</label>
                                <input
                                    type="text"
                                    value={previewImage}
                                    onChange={e => setPreviewImage(e.target.value)}
                                    className="input-field"
                                    placeholder="https://..."
                                />
                                {previewImage && <img src={previewImage} alt="Preview" className="mt-2 h-32 w-auto rounded-lg object-cover border border-gray-200" />}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daftar Variabel Gambar (Dinamis)</label>
                                <p className="text-xs text-gray-500 mb-2">Tambahkan nama variabel gambar untuk diupload tenant (contoh: <code>hero_cover</code>)</p>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newImageType}
                                        onChange={e => setNewImageType(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = newImageType.trim().replace(/[^a-zA-Z0-9_]/g, '');
                                                if (val && !imageTypes.includes(val)) {
                                                    setImageTypes([...imageTypes, val]);
                                                    setNewImageType('');
                                                }
                                            }
                                        }}
                                        placeholder="hero_cover"
                                        className="input-field"
                                    />
                                    <button
                                        onClick={() => {
                                            const val = newImageType.trim().replace(/[^a-zA-Z0-9_]/g, '');
                                            if (val && !imageTypes.includes(val)) {
                                                setImageTypes([...imageTypes, val]);
                                                setNewImageType('');
                                            }
                                        }}
                                        className="btn-primary"
                                    >Tambah</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {imageTypes.map(it => (
                                        <span key={it} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gold-100 text-gold-800 border border-gold-200">
                                            {it}
                                            <button onClick={() => setImageTypes(imageTypes.filter(i => i !== it))} className="text-gold-600 hover:text-gold-900">&times;</button>
                                        </span>
                                    ))}
                                    {imageTypes.length === 0 && <span className="text-xs text-gray-400 italic">Belum ada variabel gambar</span>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTabPanel === 'editor' && (
                        <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
                            {/* Editor Tabs */}
                            <div className="flex bg-[#2d2d2d]">
                                {(['html', 'css', 'js'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 text-xs font-mono border-t-2 ${activeTab === tab ? 'border-gold-500 bg-[#1e1e1e] text-white' : 'border-transparent text-gray-400 hover:bg-[#3d3d3d] hover:text-gray-200'}`}
                                    >
                                        index.{tab}
                                    </button>
                                ))}
                            </div>
                            {/* Editor Textarea */}
                            <div className="flex-1 w-full min-h-0">
                                <Editor
                                    height="100%"
                                    theme="monokai"
                                    beforeMount={handleEditorWillMount}
                                    path={`index.${activeTab === 'js' ? 'javascript' : activeTab}`}
                                    defaultLanguage={activeTab === 'js' ? 'javascript' : activeTab}
                                    value={activeTab === 'html' ? htmlCode : activeTab === 'css' ? cssCode : jsCode}
                                    onChange={(value: string | undefined) => {
                                        if (activeTab === 'html') setHtmlCode(value || '');
                                        else if (activeTab === 'css') setCssCode(value || '');
                                        else setJsCode(value || '');
                                    }}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        wordWrap: 'on',
                                        padding: { top: 16 },
                                        scrollBeyondLastLine: false,
                                        smoothScrolling: true,
                                        cursorBlinking: 'smooth',
                                        cursorSmoothCaretAnimation: 'on',
                                        formatOnPaste: true,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel (Live Preview) */}
                <div className="w-full lg:w-1/2 flex flex-col bg-gray-100 dark:bg-gray-900 border-t lg:border-t-0 border-gray-200 dark:border-gray-700">
                    <div className="flex-none px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <HiOutlineEye className="w-4 h-4" /> Live Preview
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer tooltip tooltip-left" title="Tampilkan Halaman Cover Depan">
                                <span className={`text-xs font-medium ${!showCover ? 'text-gray-500' : 'text-gold-600'}`}>Halaman Cover</span>
                                <div className="relative inline-flex items-center">
                                    <input type="checkbox" className="sr-only peer" checked={showCover} onChange={() => setShowCover(!showCover)} />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-300 dark:peer-focus:ring-gold-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-gold-500"></div>
                                </div>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer tooltip tooltip-left" title="Tampilkan injeksi data asli vs tag {{variabel}}">
                                <span className={`text-xs font-medium ${!showDataBinding ? 'text-gray-500' : 'text-gold-600'}`}>Data Binding</span>
                                <div className="relative inline-flex items-center">
                                    <input type="checkbox" className="sr-only peer" checked={showDataBinding} onChange={() => setShowDataBinding(!showDataBinding)} />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold-300 dark:peer-focus:ring-gold-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-gold-500"></div>
                                </div>
                            </label>
                            <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-4 py-1">
                                <span className="text-xs text-gray-500 whitespace-nowrap">Data Tenant:</span>
                                <select
                                    value={selectedPreviewTenantId}
                                    onChange={e => setSelectedPreviewTenantId(e.target.value)}
                                    className="text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-gold-400 max-w-[140px]"
                                    disabled={loadingPreview}
                                >
                                    {allTenants.length === 0 && <option value="">Demo</option>}
                                    {allTenants.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.bride_name} & {t.groom_name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => selectedPreviewTenantId && loadTenantPreviewData(selectedPreviewTenantId)}
                                    className="text-gray-400 hover:text-gold-500 transition-colors"
                                    title="Reload data tenant"
                                    disabled={loadingPreview}
                                >
                                    <HiOutlineRefresh className={`w-4 h-4 ${loadingPreview ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Full width preview wrapper */}
                    <div className="flex-1 overflow-auto p-0 flex items-center justify-center min-h-[400px]">
                        <div className="w-full h-full bg-white relative">
                            {/* Iframe for isolated styling */}
                            <iframe
                                ref={iframeRef}
                                className="w-full h-full border-0 bg-white"
                                title="Theme Preview"
                            />
                        </div>
                    </div>
                </div>
            </div>
            {/* Guide Modal */}
            <ThemeGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
                previewTenant={previewTenant}
                imageTypes={imageTypes}
            />
        </div>
    );
}
