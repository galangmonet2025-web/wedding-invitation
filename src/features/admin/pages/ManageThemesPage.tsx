import { useState, useEffect } from 'react';
import { themeApi } from '@/core/api/endpoints';
import { Theme, Guest } from '@/types';
import { DataTable } from '@/shared/components';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { 
    HiOutlinePlus, 
    HiOutlinePencilAlt, 
    HiOutlineTrash, 
    HiOutlineInformationCircle, 
    HiOutlineDuplicate, 
    HiOutlineRefresh,
    HiOutlineViewList,
    HiOutlineViewGrid,
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineX,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineEye,
    HiOutlineGlobeAlt,
    HiOutlineUserGroup,
    HiOutlineChatAlt2,
    HiOutlineExternalLink
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ThemeGuideModal } from '../components/ThemeGuideModal';
import { ThemeInjectModal } from '../components/ThemeInjectModal';
import { injectSampleThemes } from '../utils/injectSampleThemes';
import { useThemeStore } from '../store/themeStore';
import { useDemoGuestStore } from '../store/demoGuestStore';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { createPortal } from 'react-dom';
import { useBasePath } from '@/shared/hooks/useBasePath';
import { safeGetItem, safeSetItem } from '@/shared/utils/safeStorage';

// Demo tenant slug used by the theme-preview URL (/#/preview/<theme_code>/<slug>).
// Forces the chosen theme onto this demo tenant's real invitation data so admins
// can see a live invitation. Must match an ACTIVE tenant's domain_slug.
const PREVIEW_DEMO_SLUG = 'dini-galang';

export function ManageThemesPage() {
    const navigate = useNavigate();
    const base = useBasePath();
    const { themes, loading, fetchThemes, deleteTheme, updateTheme } = useThemeStore();
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [guideTab, setGuideTab] = useState<'guide' | 'variables' | 'logic'>('guide');
    const [isInjectOpen, setIsInjectOpen] = useState(false);

    const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);
    // Row currently being saved (inline spinner) instead of a blocking dialog loader.
    const [savingDraftId, setSavingDraftId] = useState<string | null>(null);
    // Row currently being deleted (inline spinner) instead of a block-screen loader.
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedThemeForLightbox, setSelectedThemeForLightbox] = useState<Theme | null>(null);

    // "Lihat Tema" sekarang menawarkan 2 pilihan (dropdown kecil): link umum
    // atau link tamu. previewChoice = tema + posisi tombol pemicunya (null = tutup).
    // Dropdown di-render via portal & diposisikan di koordinat tombol supaya
    // bekerja sama di tabel, kartu (hover overlay), maupun lightbox (portal).
    const [previewChoice, setPreviewChoice] = useState<{ theme: Theme; x: number; y: number } | null>(null);
    // Dropdown daftar tamu (mode "Buka Link Tamu"): tema + posisi anchor.
    const [guestList, setGuestList] = useState<{ theme: Theme; x: number; y: number } | null>(null);
    // Daftar tamu tenant demo di-cache di store (pola sama seperti themeStore):
    // di-load saat halaman mount, bertahan selama sesi tab.
    const {
        guests: demoGuests,
        loading: demoGuestsLoading,
        error: demoGuestsError,
        fetchDemoGuests,
    } = useDemoGuestStore();
    const [guestSearch, setGuestSearch] = useState('');

    // Filters and View State
    const [search, setSearch] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedPreview, setSelectedPreview] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    // Mobile: keempat dropdown filter (plan/kategori/preview/status) dipindah ke
    // dalam dialog yang dibuka lewat SATU ikon filter (search tetap terlihat).
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'card'>(() => {
        const saved = safeGetItem('manageThemesViewMode');
        return saved === 'card' || saved === 'table' ? saved : 'table';
    });

    useEffect(() => {
        // Persisting a cosmetic view preference must never crash the page —
        // safeSetItem swallows QuotaExceededError / disabled storage.
        safeSetItem('manageThemesViewMode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        fetchThemes();
        // Muat daftar tamu tenant demo sejak halaman dibuka (cache di store,
        // sama seperti tema) supaya dropdown "Buka Link Tamu" langsung siap.
        fetchDemoGuests();
    }, []);

    const handleDelete = async () => {
        if (!themeToDelete) return;
        const id = themeToDelete.id;
        // Tutup dialog langsung; tampilkan loading inline di baris yang dihapus (tanpa block screen).
        setThemeToDelete(null);
        setDeletingId(id);
        try {
            await deleteTheme(id);
        } finally {
            setDeletingId(null);
        }
    };

    // Open the real invitation in a new tab using the theme-preview override URL
    // (#/preview/<kode-tema>/<slug>) so admins can see the theme rendered live on
    // the demo tenant's data. Needs the theme to have a code set.
    const handlePreviewTheme = (theme: Theme) => {
        const themeCode = (theme.code || '').trim();
        if (!themeCode) {
            toast.error('Tema belum punya kode. Isi kolom "Kode Tema" lewat Edit untuk melihat preview.');
            return;
        }
        const url = `${window.location.origin}${window.location.pathname}#/preview/${themeCode}/${PREVIEW_DEMO_SLUG}`;
        window.open(url, '_blank', 'noopener');
    };

    // Buka preview tema untuk SATU tamu spesifik: sama seperti link umum tapi
    // dengan ?guestid=<invitation_code>, sehingga undangan ter-personalisasi
    // (nama tamu, RSVP, dsb.) sambil tetap memaksa tema yang dipilih.
    const handlePreviewThemeForGuest = (theme: Theme, guest: Guest) => {
        const themeCode = (theme.code || '').trim();
        if (!themeCode) {
            toast.error('Tema belum punya kode. Isi kolom "Kode Tema" lewat Edit untuk melihat preview.');
            return;
        }
        const url = `${window.location.origin}${window.location.pathname}#/preview/${themeCode}/${PREVIEW_DEMO_SLUG}?guestid=${encodeURIComponent(guest.invitation_code)}`;
        window.open(url, '_blank', 'noopener');
    };

    // Buka dropdown 2-pilihan (Link Umum / Link Tamu) di bawah tombol pemicu.
    const openPreviewChoice = (theme: Theme, e: React.MouseEvent) => {
        const themeCode = (theme.code || '').trim();
        if (!themeCode) {
            toast.error('Tema belum punya kode. Isi kolom "Kode Tema" lewat Edit untuk melihat preview.');
            return;
        }
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPreviewChoice({ theme, x: rect.left, y: rect.bottom });
    };

    // Pilih "Buka Link Tamu": tutup dropdown pilihan, buka dropdown daftar tamu
    // di posisi anchor yang sama, lalu fetch (sekali) daftar tamunya.
    const openGuestList = (theme: Theme, x: number, y: number) => {
        setPreviewChoice(null);
        setGuestSearch('');
        setGuestList({ theme, x, y });
        void fetchDemoGuests();
    };

    // Normalisasi flag boolean-ish dari backend (bisa true / 'TRUE' / 'true').
    const isFlagTrue = (v: unknown) => v === true || v === 'true' || v === 'TRUE';
    // "Sudah isi kehadiran" = status RSVP bukan 'pending' (confirmed / declined).
    const hasFilledRsvp = (g: Guest) => g.status === 'confirmed' || g.status === 'declined';

    const isDraft = (theme: Theme) =>
        theme.flag_draft === true || theme.flag_draft === 'true' || theme.flag_draft === 'TRUE';

    // Toggle draft status inline: no blocking loader, just mark the row as saving.
    const handleToggleDraft = async (theme: Theme) => {
        if (savingDraftId) return; // guard against double-clicks while saving
        const nextValue = !isDraft(theme);
        setSavingDraftId(theme.id);
        // Optimistic update so the toggle flips immediately.
        updateTheme(theme.id, { flag_draft: nextValue });
        try {
            const res = await themeApi.updateTheme(
                {
                    id: theme.id,
                    name: theme.name,
                    plan_type: theme.plan_type,
                    flag_draft: nextValue,
                },
                { skipLoader: true } as any
            );
            if (res.success) {
                toast.success(nextValue ? 'Tema ditandai sebagai draft' : 'Tema dipublikasikan');
            } else {
                updateTheme(theme.id, { flag_draft: !nextValue }); // revert
                toast.error(res.message || 'Gagal memperbarui status draft');
            }
        } catch {
            updateTheme(theme.id, { flag_draft: !nextValue }); // revert
            toast.error('Gagal memperbarui status draft');
        } finally {
            setSavingDraftId(null);
        }
    };

    // Kick off the non-blocking inject/edit queue for the chosen sample-theme folders.
    // Progress shows in the header background-task indicator; we don't block the screen.
    const handleInjectThemes = (folders: string[], asDraft: boolean) => {
        setIsInjectOpen(false);
        if (folders.length === 0) return;
        toast.success(`Memproses ${folders.length} tema di latar belakang (${asDraft ? 'draft' : 'release'})...`);
        // Fire-and-forget: the background task store drives the UI. Refresh the list when done.
        injectSampleThemes(folders, themes, (result) => {
            fetchThemes(true);
            if (result.failCount === 0) {
                toast.success(
                    `Inject selesai: ${result.inserted.length} baru, ${result.edited.length} diperbarui.`
                );
            } else {
                toast.error(
                    `Inject selesai dengan ${result.failCount} gagal. Lihat detail di panel tugas.`
                );
            }
        }, { asDraft }).catch((err) => {
            toast.error(err?.message || 'Gagal menjalankan inject tema.');
        });
    };

    // Filter Logic
    const filteredThemes = themes.filter((theme) => {
        const matchesSearch = theme.name.toLowerCase().includes(search.toLowerCase()) || 
                             (theme.style_category || 'Lainnya').toLowerCase().includes(search.toLowerCase());
        const matchesPlan = selectedPlan === 'all' || theme.plan_type === selectedPlan;
        const matchesCategory = selectedCategory === 'all' || (theme.style_category || '').trim() === selectedCategory;
        
        const hasPreview = !!theme.preview_image;
        const matchesPreview = selectedPreview === 'all' ||
                               (selectedPreview === 'uploaded' && hasPreview) ||
                               (selectedPreview === 'empty' && !hasPreview);

        const draft = isDraft(theme);
        const matchesStatus = selectedStatus === 'all' ||
                              (selectedStatus === 'draft' && draft) ||
                              (selectedStatus === 'published' && !draft);

        return matchesSearch && matchesPlan && matchesCategory && matchesPreview && matchesStatus;
    });

    // Jumlah filter dropdown yang aktif (bukan 'all') — untuk badge di ikon filter mobile.
    const activeFilterCount =
        (selectedPlan !== 'all' ? 1 : 0) +
        (selectedCategory !== 'all' ? 1 : 0) +
        (selectedPreview !== 'all' ? 1 : 0) +
        (selectedStatus !== 'all' ? 1 : 0);

    const resetFilters = () => {
        setSelectedPlan('all');
        setSelectedCategory('all');
        setSelectedPreview('all');
        setSelectedStatus('all');
    };

    // Kategori untuk filter diambil DINAMIS dari kategori yang benar-benar ada di
    // DB (bukan daftar hardcoded). Kategori kosong diabaikan, di-dedup & diurutkan.
    const availableCategories = Array.from(
        new Set(
            themes
                .map((t) => (t.style_category || '').trim())
                .filter((c) => c !== '')
        )
    ).sort((a, b) => a.localeCompare(b, 'id'));

    const themesWithPreview = filteredThemes.filter(t => !!t.preview_image);
    const currentLightboxIndex = themesWithPreview.findIndex(t => t.id === selectedThemeForLightbox?.id);

    // Keyboard controls for Lightbox navigation
    useEffect(() => {
        if (!selectedThemeForLightbox) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedThemeForLightbox(null);
            } else if (e.key === 'ArrowRight') {
                if (themesWithPreview.length > 1) {
                    const nextIndex = (currentLightboxIndex + 1) % themesWithPreview.length;
                    setSelectedThemeForLightbox(themesWithPreview[nextIndex]);
                }
            } else if (e.key === 'ArrowLeft') {
                if (themesWithPreview.length > 1) {
                    const prevIndex = (currentLightboxIndex - 1 + themesWithPreview.length) % themesWithPreview.length;
                    setSelectedThemeForLightbox(themesWithPreview[prevIndex]);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedThemeForLightbox, currentLightboxIndex, themesWithPreview]);

    const handleNextTheme = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (themesWithPreview.length === 0) return;
        const nextIndex = (currentLightboxIndex + 1) % themesWithPreview.length;
        setSelectedThemeForLightbox(themesWithPreview[nextIndex]);
    };

    const handlePrevTheme = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (themesWithPreview.length === 0) return;
        const prevIndex = (currentLightboxIndex - 1 + themesWithPreview.length) % themesWithPreview.length;
        setSelectedThemeForLightbox(themesWithPreview[prevIndex]);
    };

    const columns = [
        { 
            key: 'name',
            header: 'Nama Tema',
            render: (item: Theme) => (
                <span className="font-semibold text-gray-800 dark:text-gray-300">{item.name}</span>
            )
        },
        {
            key: 'flag_draft',
            header: 'Status',
            render: (item: Theme) => {
                const draft = isDraft(item);
                const saving = savingDraftId === item.id;
                return (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={!draft}
                            disabled={saving}
                            onClick={(e) => { e.stopPropagation(); handleToggleDraft(item); }}
                            title={draft ? 'Klik untuk publikasikan' : 'Klik untuk jadikan draft'}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed
                                ${draft ? 'bg-amber-400 dark:bg-amber-500' : 'bg-emerald-500 dark:bg-emerald-600'}`}
                        >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
                                ${draft ? 'translate-x-1' : 'translate-x-[18px]'}`} />
                        </button>
                        {saving ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                <span className="w-3.5 h-3.5 border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin" />
                                Menyimpan…
                            </span>
                        ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border
                                ${draft
                                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900/30'
                                    : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/20'}`}>
                                {draft ? 'Draft' : 'Publik'}
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'plan_type',
            header: 'Plan',
            render: (item: Theme) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider
                    ${item.plan_type === 'basic' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
                        item.plan_type === 'pro' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20' :
                            'bg-gold-50 dark:bg-gold-950/30 text-gold-700 dark:text-gold-400 border border-gold-100 dark:border-gold-900/20'}`}>
                    {item.plan_type}
                </span>
            )
        },
        {
            key: 'preview_image',
            header: 'Foto Preview',
            render: (item: Theme) => {
                const hasPreview = !!item.preview_image;
                return (
                    <div className="flex items-center gap-3">
                        {hasPreview ? (
                            <>
                                <span 
                                    onClick={() => setSelectedThemeForLightbox(item)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
                                >
                                    <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <span>Sudah Diupload</span>
                                </span>
                                {item.preview_image && (
                                    <div className="relative group/thumb shrink-0">
                                        <ProxyImage 
                                            src={item.preview_image} 
                                            className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-gray-700 hover:scale-105 transition-transform cursor-pointer shadow-sm" 
                                            alt="Preview"
                                            onClick={() => setSelectedThemeForLightbox(item)}
                                        />
                                        {/* Large preview tooltip on hover */}
                                        <div className="absolute left-11 bottom-0 scale-0 group-hover/thumb:scale-100 origin-bottom-left transition-all duration-300 z-50 p-1.5 bg-white dark:bg-wedding-dark-card border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl w-48 aspect-[3/4] pointer-events-none">
                                            <ProxyImage src={item.preview_image} className="w-full h-full object-cover rounded-xl" />
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/20">
                                <HiOutlineXCircle className="w-4 h-4 text-red-500 shrink-0" />
                                <span>Belum Diupload</span>
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'style_category',
            header: 'Kategori Style',
            render: (item: Theme) => (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-150 dark:border-gray-700">
                    {item.style_category || 'Lainnya'}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (item: Theme) => {
                const deleting = deletingId === item.id;
                return (
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={(e) => openPreviewChoice(item, e)}
                            disabled={deleting}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 transition-colors tooltip tooltip-top disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Lihat Tema"
                        >
                            <HiOutlineEye className="w-4 h-4" />
                            <span className="tooltip-text">Lihat Tema</span>
                        </button>
                        <button
                            onClick={() => navigate(`${base}/themes/editor/${item.id}`)}
                            disabled={deleting}
                            className="p-1.5 rounded-lg hover:bg-gold-50 dark:hover:bg-gold-900/20 text-gold-600 transition-colors tooltip tooltip-top disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Edit Theme"
                        >
                            <HiOutlinePencilAlt className="w-4 h-4" />
                            <span className="tooltip-text">Edit</span>
                        </button>
                        <button
                            onClick={() => navigate(`${base}/themes/editor/new`, { state: { copiedTheme: item } })}
                            disabled={deleting}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors tooltip tooltip-top disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Copy Theme"
                        >
                            <HiOutlineDuplicate className="w-4 h-4" />
                            <span className="tooltip-text">Salin</span>
                        </button>
                        <button
                            onClick={() => setThemeToDelete(item)}
                            disabled={deleting}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors tooltip tooltip-top disabled:cursor-not-allowed"
                            title="Delete Theme"
                        >
                            {deleting ? (
                                <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                            ) : (
                                <>
                                    <HiOutlineTrash className="w-4 h-4" />
                                    <span className="tooltip-text">Hapus</span>
                                </>
                            )}
                        </button>
                    </div>
                );
            }
        }
    ];

    // Keempat dropdown filter — dipakai bersama oleh grid desktop & dialog mobile.
    const filterFields = (
        <>
            {/* Filter Plan */}
            <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="select-field text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 focus:bg-white dark:focus:bg-gray-900 focus:ring-gold-500 rounded-xl w-full"
            >
                <option value="all">Semua Plan</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
            </select>

            {/* Filter Category */}
            <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="select-field text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 focus:bg-white dark:focus:bg-gray-900 focus:ring-gold-500 rounded-xl w-full"
            >
                <option value="all">Semua Kategori Style</option>
                {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>

            {/* Filter Preview */}
            <select
                value={selectedPreview}
                onChange={(e) => setSelectedPreview(e.target.value)}
                className="select-field text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 focus:bg-white dark:focus:bg-gray-900 focus:ring-gold-500 rounded-xl w-full"
            >
                <option value="all">Semua Status Preview</option>
                <option value="uploaded">Sudah Upload Preview</option>
                <option value="empty">Belum Upload Preview</option>
            </select>

            {/* Filter Status Draft/Publish */}
            <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="select-field text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 focus:bg-white dark:focus:bg-gray-900 focus:ring-gold-500 rounded-xl w-full"
            >
                <option value="all">Semua Status</option>
                <option value="published">Publik</option>
                <option value="draft">Draft</option>
            </select>
        </>
    );

    // Kartu tema khusus MOBILE (dipakai lewat DataTable.renderMobileCard) — layout
    // thumbnail di kiri + nama/badge di kanan + baris aksi rapi di bawah. Menggantikan
    // kartu generik yang menjejalkan 4 tombol mungil di header (terasa berantakan).
    const renderThemeMobileCard = (item: Theme) => {
        const hasPreview = !!item.preview_image;
        const draft = isDraft(item);
        const saving = savingDraftId === item.id;
        const deleting = deletingId === item.id;
        const planCls =
            item.plan_type === 'basic'
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                : item.plan_type === 'pro'
                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                    : 'bg-gold-50 dark:bg-gold-950/30 text-gold-700 dark:text-gold-400';
        return (
            <div className={`card p-3 border ${deleting ? 'opacity-60 pointer-events-none border-gray-100 dark:border-gray-800' : 'border-gray-100 dark:border-gray-800'}`}>
                {/* Header: thumbnail + info */}
                <div className="flex gap-3">
                    <button
                        onClick={() => hasPreview && setSelectedThemeForLightbox(item)}
                        className="shrink-0 w-14 h-[72px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                        title={hasPreview ? 'Lihat preview' : 'Belum ada preview'}
                    >
                        {hasPreview ? (
                            <ProxyImage src={item.preview_image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>

                    <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-bold text-gray-800 dark:text-white leading-tight line-clamp-2">
                            {item.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${planCls}`}>
                                {item.plan_type}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-150 dark:border-gray-700">
                                {item.style_category || 'Lainnya'}
                            </span>
                        </div>
                        {/* Status toggle (Draft/Publik) — beri ruang, bukan dijejalkan */}
                        <button
                            type="button"
                            role="switch"
                            aria-checked={!draft}
                            disabled={saving}
                            onClick={(e) => { e.stopPropagation(); handleToggleDraft(item); }}
                            className="mt-2 inline-flex items-center gap-1.5 disabled:opacity-60"
                            title={draft ? 'Ketuk untuk publikasikan' : 'Ketuk untuk jadikan draft'}
                        >
                            <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${draft ? 'bg-amber-400 dark:bg-amber-500' : 'bg-emerald-500 dark:bg-emerald-600'}`}>
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${draft ? 'translate-x-1' : 'translate-x-[18px]'}`} />
                            </span>
                            {saving ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                                    <span className="w-3 h-3 border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin" /> Menyimpan…
                                </span>
                            ) : (
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${draft ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {draft ? 'Draft' : 'Publik'}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Action bar: 4 tombol rapi, area tap besar */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-4 gap-1.5">
                    <button
                        onClick={(e) => openPreviewChoice(item, e)}
                        disabled={deleting}
                        className="flex flex-col items-center gap-1 py-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40"
                    >
                        <HiOutlineEye className="w-[18px] h-[18px]" />
                        <span className="text-[10px] font-semibold">Lihat</span>
                    </button>
                    <button
                        onClick={() => navigate(`${base}/themes/editor/${item.id}`)}
                        disabled={deleting}
                        className="flex flex-col items-center gap-1 py-1.5 rounded-lg text-gold-600 hover:bg-gold-50 dark:hover:bg-gold-900/20 transition-colors disabled:opacity-40"
                    >
                        <HiOutlinePencilAlt className="w-[18px] h-[18px]" />
                        <span className="text-[10px] font-semibold">Edit</span>
                    </button>
                    <button
                        onClick={() => navigate(`${base}/themes/editor/new`, { state: { copiedTheme: item } })}
                        disabled={deleting}
                        className="flex flex-col items-center gap-1 py-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-40"
                    >
                        <HiOutlineDuplicate className="w-[18px] h-[18px]" />
                        <span className="text-[10px] font-semibold">Salin</span>
                    </button>
                    <button
                        onClick={() => setThemeToDelete(item)}
                        disabled={deleting}
                        className="flex flex-col items-center gap-1 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:cursor-not-allowed"
                    >
                        {deleting ? (
                            <span className="w-[18px] h-[18px] border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                        ) : (
                            <HiOutlineTrash className="w-[18px] h-[18px]" />
                        )}
                        <span className="text-[10px] font-semibold">Hapus</span>
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsGuideOpen(true)}
                        className="text-gray-400 hover:text-gold-500 transition-colors tooltip tooltip-right flex items-center gap-1 bg-white dark:bg-wedding-dark-card border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm"
                    >
                        <HiOutlineInformationCircle className="w-4 h-4" />
                        <span>Panduan Pembuatan Tema</span>
                    </button>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button
                        onClick={() => fetchThemes(true)}
                        className="p-2.5 bg-white dark:bg-wedding-dark-card border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm flex items-center justify-center"
                        title="Refresh Data"
                    >
                        <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* View Mode Toggle (icon-only) */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${
                                viewMode === 'table'
                                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                            title="Tampilan Tabel"
                            aria-label="Tampilan Tabel"
                        >
                            <HiOutlineViewList className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={`flex items-center justify-center p-1.5 rounded-lg transition-all ${
                                viewMode === 'card'
                                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                            title="Tampilan Card"
                            aria-label="Tampilan Card"
                        >
                            <HiOutlineViewGrid className="w-4 h-4" />
                        </button>
                    </div>
                    <button onClick={() => setIsInjectOpen(true)} className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-xl shadow-md transition-all font-medium flex items-center gap-2 text-xs">
                        <i className="ri-flashlight-fill"></i>
                        <span>Inject Theme</span>
                    </button>
                    <Button
                        onClick={() => navigate(`${base}/themes/editor/new`)}
                        className="text-xs"
                        icon={<HiOutlinePlus className="w-4 h-4" />}
                    >
                        Tambah Tema Baru
                    </Button>
                </div>
            </div>

            {/* Filter and View Selection Panel */}
            <div className="bg-white dark:bg-wedding-dark-card p-4 rounded-2xl border border-gray-100 dark:border-gray-805 shadow-sm space-y-4">
                {/* Baris atas: Search selalu terlihat + (mobile) ikon filter → dialog */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <HiOutlineSearch className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Cari tema..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field pl-9 text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 focus:bg-white dark:focus:bg-gray-900 focus:ring-gold-500 rounded-xl w-full"
                        />
                    </div>

                    {/* Mobile-only: satu ikon filter (badge = jumlah filter aktif) → buka dialog */}
                    <button
                        onClick={() => setShowFilterModal(true)}
                        className="sm:hidden relative shrink-0 p-2.5 bg-gray-50/50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-700 hover:border-gold-500 text-gray-500 hover:text-gold-500 rounded-xl transition-all flex items-center justify-center"
                        title="Filter"
                        aria-label="Filter"
                    >
                        <HiOutlineFilter className="w-4 h-4" />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-gold-500 text-white text-[10px] font-bold leading-none">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Desktop: keempat dropdown filter inline (disembunyikan di mobile) */}
                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {filterFields}
                </div>

                {/* Result counter */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] md:text-xs text-gray-405 font-bold uppercase tracking-wider">
                        Ditemukan {filteredThemes.length} tema
                    </span>
                    {/* Mobile: chip "Hapus filter" muncul saat ada filter aktif */}
                    {activeFilterCount > 0 && (
                        <button
                            onClick={resetFilters}
                            className="sm:hidden text-[10px] font-bold uppercase tracking-wider text-gold-600 dark:text-gold-400"
                        >
                            Hapus filter ({activeFilterCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Display Component based on ViewMode */}
            {viewMode === 'card' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-fade-in">
                    {filteredThemes.map((item) => {
                        const hasPreview = !!item.preview_image;
                        const deleting = deletingId === item.id;
                        // Per-plan hover accent so each tier feels distinct on hover
                        // (border tint + a coloured glow ring). Full class strings so
                        // Tailwind keeps them at build time.
                        const planHover =
                            item.plan_type === 'basic'
                                ? 'hover:border-slate-400/70 dark:hover:border-slate-500/60 hover:shadow-slate-400/30 dark:hover:shadow-slate-500/20'
                                : item.plan_type === 'pro'
                                    ? 'hover:border-blue-400/70 dark:hover:border-blue-500/60 hover:shadow-blue-500/30 dark:hover:shadow-blue-500/20'
                                    : 'hover:border-amber-400/80 dark:hover:border-gold-500/60 hover:shadow-amber-500/30 dark:hover:shadow-gold-500/20';
                        // Accent colour used inside the hover overlay (glow + action-hover
                        // + the per-plan name label & tinted name glow shown on hover).
                        const planAccent =
                            item.plan_type === 'basic'
                                ? { glow: 'from-slate-300/40', act: 'hover:bg-slate-400', label: 'BASIC', labelCls: 'text-slate-200 bg-slate-500/40 ring-slate-300/40', nameGlow: '[text-shadow:0_2px_10px_rgba(148,163,184,0.55)]' }
                                : item.plan_type === 'pro'
                                    ? { glow: 'from-blue-500/40', act: 'hover:bg-blue-500', label: '◆ PRO', labelCls: 'text-blue-100 bg-blue-500/40 ring-blue-300/40', nameGlow: '[text-shadow:0_2px_12px_rgba(59,130,246,0.65)]' }
                                    : { glow: 'from-amber-400/40', act: 'hover:bg-amber-500', label: '★ PREMIUM', labelCls: 'text-amber-100 bg-amber-500/40 ring-amber-300/50', nameGlow: '[text-shadow:0_2px_14px_rgba(245,158,11,0.7)]' };
                        return (
                            <div
                                key={item.id}
                                className={`group relative aspect-[3/4] box-content pb-[190px] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${planHover} ${deleting ? 'pointer-events-none' : ''}`}
                            >
                                {/* Deleting overlay — selalu terlihat (tidak bergantung hover),
                                    karena saat menghapus kartu diberi pointer-events-none
                                    sehingga overlay hover tidak pernah muncul. */}
                                {deleting && (
                                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm rounded-2xl pointer-events-auto">
                                        <span className="w-9 h-9 border-[3px] border-white/30 border-t-red-500 rounded-full animate-spin" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-white/90">Menghapus…</span>
                                    </div>
                                )}

                                {/* Full-bleed preview image */}
                                <div
                                    className="absolute inset-0 bg-gray-100 dark:bg-gray-800 cursor-pointer"
                                    onClick={() => setSelectedThemeForLightbox(item)}
                                >
                                    {hasPreview ? (
                                        <ProxyImage
                                            src={item.preview_image}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 text-center bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900">
                                            {/* Inner dashed panel so empty cards read as an intentional placeholder, not a blank container */}
                                            <div className="flex flex-col items-center justify-center gap-2 w-full h-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white/40 dark:bg-black/20">
                                                <div className="p-2.5 rounded-full bg-gray-300/70 dark:bg-gray-600/60">
                                                    <svg className="w-7 h-7 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-300">Belum ada preview</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Badges (always visible) — frosted glass style */}
                                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none z-10">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider text-white ring-1 ring-inset ring-white/25 backdrop-blur-md shadow-lg shadow-black/20
                                        ${item.plan_type === 'basic' ? 'bg-slate-500/60' :
                                            item.plan_type === 'pro' ? 'bg-blue-600/60' :
                                                'bg-amber-500/60'}`}>
                                        {item.plan_type}
                                    </span>
                                    {(item.flag_draft === true || item.flag_draft === 'true' || item.flag_draft === 'TRUE') && (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider text-white bg-orange-500/70 ring-1 ring-inset ring-white/25 backdrop-blur-md shadow-lg shadow-black/20">
                                            Draft
                                        </span>
                                    )}
                                </div>

                                {/* Per-plan colour glow at the bottom, revealed on hover */}
                                <div className={`absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t ${planAccent.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}></div>

                                {/* Hover overlay: dark transparent scrim + info + actions */}
                                <div className="absolute inset-0 flex flex-col p-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
                                    {/* Theme name — centered, bigger on hover, with a
                                        per-plan label chip + plan-tinted text glow. */}
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 px-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ring-1 ring-inset backdrop-blur-sm opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ${planAccent.labelCls}`}>
                                            {planAccent.label}
                                        </span>
                                        <h3 className={`font-bold text-white text-center text-base group-hover:text-xl leading-snug line-clamp-3 drop-shadow-lg scale-95 group-hover:scale-100 transition-all duration-300 ${planAccent.nameGlow}`}>
                                            {item.name}
                                        </h3>
                                        {/* Kode tema — muncul saat hover, di bawah nama. */}
                                        {item.code ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 ring-1 ring-inset ring-white/20 backdrop-blur-sm font-mono text-[10px] font-semibold tracking-wider text-white/90 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 delay-75 max-w-full truncate">
                                                {item.code}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-black/30 ring-1 ring-inset ring-white/10 font-mono text-[10px] italic text-white/50 opacity-0 group-hover:opacity-100 transition-all duration-300 delay-75">
                                                tanpa kode
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                        <div className="flex items-center gap-1.5">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white ring-1 ring-inset ring-white/25 backdrop-blur-md">
                                                {item.style_category || 'Lainnya'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-white/70 font-medium">
                                            {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                        </div>

                                        {/* Action Row */}
                                        <div className="pt-2 mt-1 border-t border-white/15 flex items-center gap-1.5">
                                            <button
                                                onClick={(e) => openPreviewChoice(item, e)}
                                                className="p-2 rounded-lg bg-white/15 hover:bg-emerald-500 text-white transition-colors"
                                                title="Lihat Tema"
                                            >
                                                <HiOutlineEye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`${base}/themes/editor/${item.id}`)}
                                                className={`p-2 rounded-lg bg-white/15 ${planAccent.act} text-white transition-colors`}
                                                title="Edit Theme"
                                            >
                                                <HiOutlinePencilAlt className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => navigate(`${base}/themes/editor/new`, { state: { copiedTheme: item } })}
                                                className="p-2 rounded-lg bg-white/15 hover:bg-blue-500 text-white transition-colors"
                                                title="Copy Theme"
                                            >
                                                <HiOutlineDuplicate className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setThemeToDelete(item)}
                                                disabled={deleting}
                                                className="p-2 rounded-lg bg-white/15 hover:bg-red-500 text-white transition-colors disabled:cursor-not-allowed"
                                                title="Delete Theme"
                                            >
                                                {deleting ? (
                                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="card p-0 overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                    <DataTable
                        columns={columns}
                        data={filteredThemes}
                        loading={loading}
                        emptyMessage="Tidak ada tema yang cocok dengan filter."
                        renderMobileCard={renderThemeMobileCard}
                    />
                </div>
            )}

            {/* MOBILE FILTER DIALOG — berisi keempat dropdown filter (bottom-sheet) */}
            {showFilterModal && createPortal(
                <div className="fixed inset-0 z-[9999] sm:hidden flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowFilterModal(false)} />
                    <div className="relative z-10 w-full bg-white dark:bg-wedding-dark-card rounded-t-3xl shadow-2xl border-t border-gray-100 dark:border-gray-800 max-h-[85vh] flex flex-col animate-slide-up">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <HiOutlineFilter className="w-5 h-5 text-gold-500" />
                                <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Filter Tema</h3>
                                {activeFilterCount > 0 && (
                                    <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-gold-500 text-white text-[10px] font-bold">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setShowFilterModal(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                aria-label="Tutup"
                            >
                                <HiOutlineX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body: dropdown filter dengan label */}
                        <div className="px-5 py-4 space-y-4 overflow-y-auto">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Plan</label>
                                <select
                                    value={selectedPlan}
                                    onChange={(e) => setSelectedPlan(e.target.value)}
                                    className="select-field text-xs py-2.5 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 rounded-xl w-full"
                                >
                                    <option value="all">Semua Plan</option>
                                    <option value="basic">Basic</option>
                                    <option value="pro">Pro</option>
                                    <option value="premium">Premium</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Kategori Style</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="select-field text-xs py-2.5 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 rounded-xl w-full"
                                >
                                    <option value="all">Semua Kategori Style</option>
                                    {availableCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Status Preview</label>
                                <select
                                    value={selectedPreview}
                                    onChange={(e) => setSelectedPreview(e.target.value)}
                                    className="select-field text-xs py-2.5 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 rounded-xl w-full"
                                >
                                    <option value="all">Semua Status Preview</option>
                                    <option value="uploaded">Sudah Upload Preview</option>
                                    <option value="empty">Belum Upload Preview</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Status Publikasi</label>
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="select-field text-xs py-2.5 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 rounded-xl w-full"
                                >
                                    <option value="all">Semua Status</option>
                                    <option value="published">Publik</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>
                        </div>

                        {/* Footer: Reset + Terapkan */}
                        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <button
                                onClick={resetFilters}
                                disabled={activeFilterCount === 0}
                                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-40"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setShowFilterModal(false)}
                                className="flex-1 py-2.5 text-xs font-semibold rounded-xl text-white bg-gradient-to-r from-gold-500 to-gold-600 shadow-md"
                            >
                                Terapkan{filteredThemes.length > 0 ? ` (${filteredThemes.length})` : ''}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <ThemeGuideModal
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
                activeTab={guideTab}
                onTabChange={setGuideTab}
            />

            {isInjectOpen && (
                <ThemeInjectModal
                    existingThemes={themes}
                    onClose={() => setIsInjectOpen(false)}
                    onConfirm={handleInjectThemes}
                />
            )}

            {/* Custom Premium Theme Lightbox with Full Info rendered via React Portal */}
            {selectedThemeForLightbox && createPortal(
                <div 
                    className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 md:p-10 animate-fade-in"
                    onClick={() => setSelectedThemeForLightbox(null)}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setSelectedThemeForLightbox(null)}
                        className="absolute top-6 right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10 z-[1000000] active:scale-95 shadow-2xl"
                        title="Tutup (Esc)"
                    >
                        <HiOutlineX className="w-6 h-6" />
                    </button>

                    {/* Modal Content Container */}
                    <div 
                        className="relative bg-gray-900/80 dark:bg-wedding-dark-card/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-w-5xl w-full max-h-[90vh] md:max-h-[85vh] flex flex-col md:flex-row transition-all z-[999999]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Left Side: Portrait Image View */}
                        <div className="relative flex-1 bg-black/40 flex items-center justify-center p-4 md:p-6 min-h-[350px] md:min-h-0 max-h-[50vh] md:max-h-none overflow-hidden">
                            {/* Prev & Next navigation buttons */}
                            {themesWithPreview.length > 1 && (
                                <>
                                    <button
                                        onClick={handlePrevTheme}
                                        className="absolute left-4 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-all backdrop-blur-md border border-white/10 active:scale-90 z-20 group"
                                        title="Tema Sebelumnya (←)"
                                    >
                                        <HiOutlineChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                                    </button>
                                    <button
                                        onClick={handleNextTheme}
                                        className="absolute right-4 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-all backdrop-blur-md border border-white/10 active:scale-90 z-20 group"
                                        title="Tema Selanjutnya (→)"
                                    >
                                        <HiOutlineChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </>
                            )}
                            
                            {selectedThemeForLightbox.preview_image ? (
                                <ProxyImage 
                                    src={selectedThemeForLightbox.preview_image} 
                                    className="max-w-full max-h-[40vh] md:max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-white/5 animate-scale-up animate-duration-300" 
                                    alt={selectedThemeForLightbox.name}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-white/40">
                                    <svg className="w-16 h-16 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs font-semibold">Belum ada preview image</span>
                                </div>
                            )}
                        </div>

                        {/* Right Side: Information Pane */}
                        <div className="w-full md:w-[380px] shrink-0 p-6 md:p-8 flex flex-col justify-between bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white border-t md:border-t-0 md:border-l border-white/10">
                            <div className="space-y-6">
                                {/* Header */}
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2 leading-tight">
                                        {selectedThemeForLightbox.name}
                                    </h2>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white shadow-md
                                            ${selectedThemeForLightbox.plan_type === 'basic' ? 'bg-gray-600' :
                                                selectedThemeForLightbox.plan_type === 'pro' ? 'bg-blue-600' :
                                                    'bg-gold-500'}`}
                                        >
                                            {selectedThemeForLightbox.plan_type}
                                        </span>
                                        {(selectedThemeForLightbox.flag_draft === true || selectedThemeForLightbox.flag_draft === 'true' || selectedThemeForLightbox.flag_draft === 'TRUE') && (
                                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-yellow-500 text-white shadow-md">
                                                Draft
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Information Details */}
                                <div className="space-y-4 pt-4 border-t border-white/10">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/40 font-bold uppercase tracking-wider text-xs">Style Category</span>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/90 border border-white/10">
                                            {selectedThemeForLightbox.style_category || 'Lainnya'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white/40 font-bold uppercase tracking-wider text-xs">Tanggal Dibuat</span>
                                        <span className="font-semibold text-white/90">
                                            {selectedThemeForLightbox.created_at ? new Date(selectedThemeForLightbox.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="pt-6 mt-6 border-t border-white/10 space-y-2">
                                <button
                                    onClick={(e) => openPreviewChoice(selectedThemeForLightbox, e)}
                                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <HiOutlineEye className="w-4 h-4" />
                                    <span>Lihat Tema (Preview)</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedThemeForLightbox(null);
                                        navigate(`${base}/themes/editor/${selectedThemeForLightbox.id}`);
                                    }}
                                    className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <HiOutlinePencilAlt className="w-4 h-4" />
                                    <span>Edit Tema Ini</span>
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedThemeForLightbox(null);
                                            navigate(`${base}/themes/editor/new`, { state: { copiedTheme: selectedThemeForLightbox } });
                                        }}
                                        className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <HiOutlineDuplicate className="w-3.5 h-3.5 text-blue-400" />
                                        <span>Salin</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedThemeForLightbox(null);
                                            setThemeToDelete(selectedThemeForLightbox);
                                        }}
                                        className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <HiOutlineTrash className="w-3.5 h-3.5" />
                                        <span>Hapus</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.getElementById('lightbox-root') || document.body
            )}

            {/* Dropdown pilihan preview: Buka Link Umum vs Buka Link Tamu.
                Di-render via portal, diposisikan di bawah tombol pemicu. Backdrop
                transparan menutup dropdown saat klik di luar. */}
            {previewChoice && createPortal(
                <div
                    className="fixed inset-0 z-[999998]"
                    onClick={() => setPreviewChoice(null)}
                >
                    <div
                        className="absolute w-52 bg-white dark:bg-wedding-dark-card border border-gray-150 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in py-1"
                        style={{
                            top: Math.min(previewChoice.y + 6, window.innerHeight - 110),
                            left: Math.min(previewChoice.x, window.innerWidth - 220),
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                const t = previewChoice.theme;
                                setPreviewChoice(null);
                                handlePreviewTheme(t);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-gray-700 dark:text-gray-200"
                        >
                            <HiOutlineGlobeAlt className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-semibold">Buka Link Umum</span>
                        </button>
                        <button
                            onClick={() => openGuestList(previewChoice.theme, previewChoice.x, previewChoice.y)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-gray-700 dark:text-gray-200"
                        >
                            <HiOutlineUserGroup className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold">Buka Link Tamu</span>
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {/* Dropdown daftar tamu (mode Buka Link Tamu). Portal + anchored,
                dengan search di atas dan area list yang scroll di dalamnya. */}
            {guestList && createPortal(
                <div
                    className="fixed inset-0 z-[999998]"
                    onClick={() => setGuestList(null)}
                >
                    <div
                        className="absolute w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-wedding-dark-card border border-gray-150 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col"
                        style={{
                            top: Math.min(guestList.y + 6, window.innerHeight - 400),
                            left: Math.min(guestList.x, window.innerWidth - 336),
                            maxHeight: 'min(70vh, 460px)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header + search */}
                        <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                <HiOutlineUserGroup className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-bold">Pilih Tamu</span>
                            </div>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                                    <HiOutlineSearch className="w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Cari nama / kode tamu..."
                                    value={guestSearch}
                                    onChange={(e) => setGuestSearch(e.target.value)}
                                    className="input-field pl-8 text-xs py-1.5 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 rounded-lg w-full"
                                />
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {demoGuestsLoading ? (
                                <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-gray-400">
                                    <span className="w-7 h-7 border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin" />
                                    <span className="text-xs font-medium">Memuat daftar tamu…</span>
                                </div>
                            ) : demoGuestsError ? (
                                <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center px-3">
                                    <HiOutlineXCircle className="w-8 h-8 text-red-400" />
                                    <p className="text-xs text-red-500 dark:text-red-400">{demoGuestsError}</p>
                                    <button
                                        onClick={() => { void fetchDemoGuests(true); }}
                                        className="px-3 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Coba lagi
                                    </button>
                                </div>
                            ) : (() => {
                                const q = guestSearch.trim().toLowerCase();
                                const list = (demoGuests || []).filter((g) =>
                                    !q ||
                                    g.name.toLowerCase().includes(q) ||
                                    (g.invitation_code || '').toLowerCase().includes(q)
                                );
                                if (list.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-400">
                                            <HiOutlineUserGroup className="w-8 h-8 opacity-40" />
                                            <span className="text-xs font-medium text-center px-3">
                                                {(demoGuests || []).length === 0 ? 'Tenant demo belum punya tamu.' : 'Tidak ada tamu yang cocok.'}
                                            </span>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="space-y-1.5">
                                        {list.map((g) => {
                                            const rsvp = hasFilledRsvp(g);
                                            const wished = isFlagTrue(g.flag_sudah_isi_ucapan);
                                            return (
                                                <button
                                                    key={g.id}
                                                    onClick={() => handlePreviewThemeForGuest(guestList.theme, g)}
                                                    className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-transparent hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-left group"
                                                >
                                                    {/* Avatar bulat inisial */}
                                                    <span className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                                                        {(g.name || '?').charAt(0)}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                                                            {g.name}
                                                        </span>
                                                        <span className="block text-[10px] text-gray-400 font-mono truncate">
                                                            {g.invitation_code}
                                                        </span>
                                                        {/* Status badges */}
                                                        <span className="flex flex-wrap gap-1 mt-1">
                                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border
                                                                ${rsvp
                                                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30'
                                                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700'}`}>
                                                                {rsvp ? <HiOutlineCheckCircle className="w-2.5 h-2.5" /> : <HiOutlineXCircle className="w-2.5 h-2.5" />}
                                                                {rsvp ? 'Isi Kehadiran' : 'Belum Kehadiran'}
                                                            </span>
                                                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border
                                                                ${wished
                                                                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30'
                                                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700'}`}>
                                                                <HiOutlineChatAlt2 className="w-2.5 h-2.5" />
                                                                {wished ? 'Isi Ucapan' : 'Belum Ucapan'}
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <HiOutlineExternalLink className="shrink-0 w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Modal Konfirmasi Hapus */}
            <ConfirmDialog
                isOpen={!!themeToDelete}
                onClose={() => setThemeToDelete(null)}
                onConfirm={handleDelete}
                title="Hapus Tema"
                variant="danger"
                confirmLabel="Ya, Hapus Permanen"
                message={<p>Apakah Anda yakin ingin menghapus tema <b>{themeToDelete?.name}</b>?</p>}
                description="Tema ini akan dihapus secara permanen dari sistem dan tidak dapat dikembalikan."
            />
        </div>
    );
}
