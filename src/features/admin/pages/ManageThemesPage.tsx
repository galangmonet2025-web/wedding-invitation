import { useState, useEffect } from 'react';
import { themeApi } from '@/core/api/endpoints';
import { Theme } from '@/types';
import { DataTable } from '@/shared/components';
import { HiOutlinePlus, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineInformationCircle, HiOutlineDuplicate, HiOutlineRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ThemeGuideModal } from '../components/ThemeGuideModal';
import { PREMIUM_THEME_PAYLOAD } from '../utils/premiumThemePayload';

export function ManageThemesPage() {
    const navigate = useNavigate();
    const [themes, setThemes] = useState<Theme[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    const fetchThemes = async () => {
        setLoading(true);
        try {
            const res = await themeApi.getThemes();
            if (res.success) setThemes(res.data);
            else toast.error(res.message);
        } catch {
            toast.error('Failed to load themes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchThemes();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this theme?')) return;
        try {
            const res = await themeApi.deleteTheme(id);
            if (res.success) {
                toast.success('Theme deleted');
                fetchThemes();
            } else {
                toast.error(res.message);
            }
        } catch {
            toast.error('Failed to delete theme');
        }
    };

    const handleInjectPremiumTheme = async () => {
        if (!confirm('Ingin melakukan auto-inject tema Premium Emas ke Backend GAS?')) return;
        try {
            toast.loading('Menginjeksi tema...', { id: 'inject-theme' });
            const res = await themeApi.createTheme(PREMIUM_THEME_PAYLOAD as any);
            if(res.success) {
                toast.success('Tema Premium Emas berhasil dimasukkan ke Spreadsheet/GAS!', { id: 'inject-theme' });
                fetchThemes();
            } else {
                toast.error(res.message || 'Failed to inject theme', { id: 'inject-theme' });
            }
        } catch {
            toast.error('Gagal memasukkan data.', { id: 'inject-theme' });
        }
    };

    const columns = [
        { 
            key: 'name', 
            header: 'Theme Name', 
            render: (item: Theme) => (
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.name}</span>
                    {(item.flag_draft === true || item.flag_draft === 'true' || item.flag_draft === 'TRUE') && (
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
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
                <span className={`px-2 py-1 rounded-full text-xs font-medium 
                    ${item.plan_type === 'basic' ? 'bg-gray-100 text-gray-700' :
                        item.plan_type === 'pro' ? 'bg-blue-100 text-blue-700' :
                            'bg-gold-100 text-gold-700'}`}>
                    {String(item.plan_type).toUpperCase()}
                </span>
            )
        },
        {
            key: 'html_template',
            header: 'HTML Snippet',
            render: (item: Theme) => (
                <span className="text-gray-400 text-xs">
                    {String(item.html_template || '').substring(0, 50)}...
                </span>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (item: Theme) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/themes/editor/${item.id}`)} className="p-1 text-gold-600 hover:bg-gold-50 rounded" title="Edit Theme">
                        <HiOutlinePencilAlt className="w-5 h-5" />
                    </button>
                    <button onClick={() => navigate('/themes/editor/new', { state: { copiedTheme: item } })} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Copy Theme">
                        <HiOutlineDuplicate className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Delete Theme">
                        <HiOutlineTrash className="w-5 h-5" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Manage Themes</h1>
                        <button
                            onClick={() => setIsGuideOpen(true)}
                            className="text-gray-400 hover:text-gold-500 transition-colors tooltip tooltip-right"
                            title="Panduan Pembuatan Tema"
                        >
                            <HiOutlineInformationCircle className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500">Create and modify themes via Advanced Builder</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => fetchThemes()} 
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                        title="Refresh Data"
                    >
                        <HiOutlineRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleInjectPremiumTheme} className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-xl shadow-lg transition-all font-medium flex items-center gap-2">
                        <i className="ri-flashlight-fill"></i>
                        <span>Inject Premium Theme</span>
                    </button>
                    <button onClick={() => navigate('/themes/editor/new')} className="btn-primary flex items-center gap-2">
                        <HiOutlinePlus className="w-5 h-5" />
                        <span>Add Theme</span>
                    </button>
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={themes}
                    loading={loading}
                    emptyMessage="No themes found. Create one!"
                />
            </div>

            <ThemeGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </div>
    );
}
