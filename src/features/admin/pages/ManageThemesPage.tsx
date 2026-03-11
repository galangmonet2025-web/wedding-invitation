import { useState, useEffect } from 'react';
import { themeApi } from '@/core/api/endpoints';
import { Theme } from '@/types';
import { DataTable } from '@/shared/components';
import { HiOutlinePlus, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineInformationCircle } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ThemeGuideModal } from '../components/ThemeGuideModal';

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
                    <button onClick={() => navigate(`/themes/editor/${item.id}`)} className="p-1 text-gold-600 hover:bg-gold-50 rounded">
                        <HiOutlinePencilAlt className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
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
                <button onClick={() => navigate('/themes/editor/new')} className="btn-primary flex items-center gap-2">
                    <HiOutlinePlus className="w-5 h-5" />
                    <span>Add Theme</span>
                </button>
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
