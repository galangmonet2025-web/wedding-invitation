import { useState, useEffect } from 'react';
import { themeApi } from '@/core/api/endpoints';
import { Theme } from '@/types';
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
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineX,
    HiOutlineChevronLeft,
    HiOutlineChevronRight
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ThemeGuideModal } from '../components/ThemeGuideModal';
import { PREMIUM_THEME_PAYLOAD } from '../utils/premiumThemePayload';
import { useThemeStore } from '../store/themeStore';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { createPortal } from 'react-dom';

const STYLE_CATEGORIES = ['Modern', 'Tradisional', 'Minimalis', 'Floral', 'Rustic', 'Lainnya'];

export function ManageThemesPage() {
    const navigate = useNavigate();
    const { themes, loading, fetchThemes, deleteTheme } = useThemeStore();
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [guideTab, setGuideTab] = useState<'guide' | 'variables' | 'logic'>('guide');

    const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);
    const [selectedThemeForLightbox, setSelectedThemeForLightbox] = useState<Theme | null>(null);

    // Filters and View State
    const [search, setSearch] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedPreview, setSelectedPreview] = useState('all');
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

    useEffect(() => {
        fetchThemes();
    }, []);

    const handleDelete = async () => {
        if (!themeToDelete) return;
        await deleteTheme(themeToDelete.id);
        setThemeToDelete(null);
    };

    const handleInjectPremiumTheme = async () => {
        if (!confirm('Ingin melakukan auto-inject tema Premium Emas ke Backend GAS?')) return;
        try {
            toast.loading('Menginjeksi tema...', { id: 'inject-theme' });
            const res = await themeApi.createTheme(PREMIUM_THEME_PAYLOAD as any);
            if(res.success) {
                toast.success('Tema Premium Emas berhasil dimasukkan ke Spreadsheet/GAS!', { id: 'inject-theme' });
                fetchThemes(true); // Force refresh after injection
            } else {
                toast.error(res.message || 'Failed to inject theme', { id: 'inject-theme' });
            }
        } catch {
            toast.error('Gagal memasukkan data.', { id: 'inject-theme' });
        }
    };

    // Filter Logic
    const filteredThemes = themes.filter((theme) => {
        const matchesSearch = theme.name.toLowerCase().includes(search.toLowerCase()) || 
                             (theme.style_category || 'Lainnya').toLowerCase().includes(search.toLowerCase());
        const matchesPlan = selectedPlan === 'all' || theme.plan_type === selectedPlan;
        const matchesCategory = selectedCategory === 'all' || (theme.style_category || 'Lainnya') === selectedCategory;
        
        const hasPreview = !!theme.preview_image;
        const matchesPreview = selectedPreview === 'all' || 
                               (selectedPreview === 'uploaded' && hasPreview) || 
                               (selectedPreview === 'empty' && !hasPreview);
        
        return matchesSearch && matchesPlan && matchesCategory && matchesPreview;
    });

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
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-300">{item.name}</span>
                    {(item.flag_draft === true || item.flag_draft === 'true' || item.flag_draft === 'TRUE') && (
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30">
                            Draft
                        </span>
                    )}
                </div>
            )
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
            render: (item: Theme) => (
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={() => navigate(`/private/themes/editor/${item.id}`)} 
                        className="p-1.5 rounded-lg hover:bg-gold-50 dark:hover:bg-gold-900/20 text-gold-600 transition-colors tooltip tooltip-top"
                        title="Edit Theme"
                    >
                        <HiOutlinePencilAlt className="w-4 h-4" />
                        <span className="tooltip-text">Edit</span>
                    </button>
                    <button 
                        onClick={() => navigate('/private/themes/editor/new', { state: { copiedTheme: item } })} 
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors tooltip tooltip-top"
                        title="Copy Theme"
                    >
                        <HiOutlineDuplicate className="w-4 h-4" />
                        <span className="tooltip-text">Salin</span>
                    </button>
                    <button 
                        onClick={() => setThemeToDelete(item)} 
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors tooltip tooltip-top"
                        title="Delete Theme"
                    >
                        <HiOutlineTrash className="w-4 h-4" />
                        <span className="tooltip-text">Hapus</span>
                    </button>
                </div>
            )
        }
    ];

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
                    <button onClick={handleInjectPremiumTheme} className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-xl shadow-md transition-all font-medium flex items-center gap-2 text-xs">
                        <i className="ri-flashlight-fill"></i>
                        <span>Inject Premium Theme</span>
                    </button>
                    <Button
                        onClick={() => navigate('/private/themes/editor/new')}
                        className="text-xs"
                        icon={<HiOutlinePlus className="w-4 h-4" />}
                    >
                        Tambah Tema Baru
                    </Button>
                </div>
            </div>

            {/* Filter and View Selection Panel */}
            <div className="bg-white dark:bg-wedding-dark-card p-4 rounded-2xl border border-gray-100 dark:border-gray-805 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search Input */}
                    <div className="relative">
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

                    {/* Filter Plan */}
                    <div>
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
                    </div>

                    {/* Filter Category */}
                    <div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="select-field text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 focus:bg-white dark:focus:bg-gray-900 focus:ring-gold-500 rounded-xl w-full"
                        >
                            <option value="all">Semua Kategori Style</option>
                            {STYLE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filter Preview */}
                    <div>
                        <select
                            value={selectedPreview}
                            onChange={(e) => setSelectedPreview(e.target.value)}
                            className="select-field text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-200/80 focus:bg-white dark:focus:bg-gray-900 focus:ring-gold-500 rounded-xl w-full"
                        >
                            <option value="all">Semua Status Preview</option>
                            <option value="uploaded">Sudah Upload Preview</option>
                            <option value="empty">Belum Upload Preview</option>
                        </select>
                    </div>
                </div>

                {/* View Mode Toggle Switch */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-[10px] md:text-xs text-gray-405 font-bold uppercase tracking-wider">
                        Ditemukan {filteredThemes.length} tema
                    </span>
                    
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === 'table'
                                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                        >
                            <HiOutlineViewList className="w-4 h-4" />
                            <span>Tabel</span>
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === 'card'
                                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                        >
                            <HiOutlineViewGrid className="w-4 h-4" />
                            <span>Card</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Display Component based on ViewMode */}
            {viewMode === 'card' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-fade-in">
                    {filteredThemes.map((item) => {
                        const hasPreview = !!item.preview_image;
                        return (
                            <div
                                key={item.id}
                                className="group relative flex flex-col bg-white dark:bg-wedding-dark-card rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-gold-300/50 dark:hover:border-gold-500/30 transition-all duration-300"
                            >
                                {/* Preview Thumbnail / Image */}
                                <div 
                                    className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-800 overflow-hidden cursor-pointer"
                                    onClick={() => setSelectedThemeForLightbox(item)}
                                >
                                    {hasPreview ? (
                                        <ProxyImage
                                            src={item.preview_image}
                                            alt={item.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-gray-450">
                                            <svg className="w-10 h-10 mb-2 opacity-40 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-xs font-semibold text-gray-400">Belum ada preview image</span>
                                        </div>
                                    )}

                                    {/* Badges on Thumbnail */}
                                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shadow-md text-white
                                            ${item.plan_type === 'basic' ? 'bg-gray-600' :
                                                item.plan_type === 'pro' ? 'bg-blue-600' :
                                                    'bg-gold-500'}`}
                                        >
                                            {item.plan_type}
                                        </span>
                                        {(item.flag_draft === true || item.flag_draft === 'true' || item.flag_draft === 'TRUE') && (
                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-yellow-500 text-white shadow-md">
                                                Draft
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Content Details */}
                                <div className="flex-1 p-4 flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-gray-850 dark:text-white text-sm group-hover:text-gold-500 transition-colors line-clamp-1">
                                            {item.name}
                                        </h3>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Style:</span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                                {item.style_category || 'Lainnya'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Row */}
                                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                        <div className="text-[10px] text-gray-400 font-medium">
                                            {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => navigate(`/private/themes/editor/${item.id}`)}
                                                className="p-1.5 rounded-lg hover:bg-gold-50 dark:hover:bg-gold-900/20 text-gold-600 transition-colors"
                                                title="Edit Theme"
                                            >
                                                <HiOutlinePencilAlt className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => navigate('/private/themes/editor/new', { state: { copiedTheme: item } })}
                                                className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                                                title="Copy Theme"
                                            >
                                                <HiOutlineDuplicate className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setThemeToDelete(item)}
                                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                                                title="Delete Theme"
                                            >
                                                <HiOutlineTrash className="w-4 h-4" />
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
                    />
                </div>
            )}

            <ThemeGuideModal 
                isOpen={isGuideOpen} 
                onClose={() => setIsGuideOpen(false)} 
                activeTab={guideTab}
                onTabChange={setGuideTab}
            />

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
                                    onClick={() => {
                                        setSelectedThemeForLightbox(null);
                                        navigate(`/private/themes/editor/${selectedThemeForLightbox.id}`);
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
                                            navigate('/private/themes/editor/new', { state: { copiedTheme: selectedThemeForLightbox } });
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
