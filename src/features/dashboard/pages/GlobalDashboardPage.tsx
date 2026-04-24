import { useEffect, useState } from 'react';
import { dashboardApi } from '@/core/api/endpoints';
import { StatCard } from '@/shared/components/StatCard';
import { PageLoader } from '@/shared/components/Loading';
import type { GlobalDashboard } from '@/types';
import toast from 'react-hot-toast';
import {
    HiOutlineOfficeBuilding,
    HiOutlineUsers,
    HiOutlineCurrencyDollar,
    HiOutlineStatusOnline,
    HiOutlineChartBar
} from 'react-icons/hi';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { Modal } from '@/shared/components/Modal';
import { tenantApi, themeApi, additionalFeatureApi } from '@/core/api/endpoints';
import { imageApi } from '@/core/api/imageApi';
import { ImageUpload } from '@/shared/components/ImageUpload';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { Lightbox } from '@/shared/components/Lightbox';
import type { Tenant, Theme, TenantActiveFeature, PlanType, TenantStatus } from '@/types';
import { HiOutlinePencil, HiOutlineSave, HiOutlineRefresh, HiOutlineExclamationCircle } from 'react-icons/hi';

const COLORS = ['#C6A769', '#10B981', '#6366F1'];

export function GlobalDashboardPage() {
    const [dashboard, setDashboard] = useState<GlobalDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [pendingTenants, setPendingTenants] = useState<any[]>([]);
    const [themes, setThemes] = useState<Theme[]>([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [editForm, setEditForm] = useState<Partial<Tenant>>({});
    const [tenantFeatures, setTenantFeatures] = useState<TenantActiveFeature[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    // Priority map for plan types
    const planPriority: Record<string, number> = {
        'basic': 1,
        'pro': 2,
        'premium': 3
    };

    useEffect(() => {
        fetchDashboard();
        fetchPendingActions();
        fetchThemes();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await dashboardApi.getGlobalDashboard();
            if (response.success && response.data) {
                setDashboard(response.data);
            } else {
                setDashboard(null);
            }
        } catch {
            setDashboard(null);
            toast.error('Failed to load global dashboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingActions = async () => {
        try {
            const res = await dashboardApi.getPendingActions();
            if (res.success) {
                setPendingTenants(res.data?.incomplete_tenants || []);
            }
        } catch {}
    };

    const fetchThemes = async () => {
        try {
            const res = await themeApi.getThemes();
            if (res.success) {
                setThemes(res.data || []);
            }
        } catch {}
    };

    const handleOpenEditModal = async (item: any) => {
        setSelectedTenant(item);
        setEditForm(item);
        setShowEditModal(true);
        
        // Fetch specific features for this tenant
        try {
            const res = await additionalFeatureApi.getTenantFeatures(item.id);
            if (res.success) {
                setTenantFeatures(res.data || []);
            }
        } catch {
            toast.error('Gagal memuat fitur tambahan');
        }
    };

    const handleFeatureUpdateLocal = (featureId: string, updates: Partial<TenantActiveFeature>) => {
        setTenantFeatures(prev => prev.map(f => f.additional_feature_id === featureId ? { ...f, ...updates } : f));
    };

    const handleUpdateTenant = async (updates: Partial<Tenant>) => {
        if (!selectedTenant) return;

        try {
            const response = await tenantApi.updateTenant({ id: selectedTenant.id, ...updates });
            if (response.success) {
                if (tenantFeatures.length > 0) {
                    await Promise.all(tenantFeatures.map(f => 
                        additionalFeatureApi.updateTenantFeature({
                            tenant_id: selectedTenant.id,
                            additional_feature_id: f.additional_feature_id,
                            active: f.active,
                            output_data: f.output_data
                        })
                    ));
                    
                    if (imagesToDelete.length > 0) {
                        await Promise.all(imagesToDelete.map(id => imageApi.deleteImage(id).catch(() => {})));
                    }
                }

                toast.success('Tenant updated');
                setShowEditModal(false);
                setImagesToDelete([]);
                fetchPendingActions(); // Refresh the list
            }
        } catch {
            toast.error('Failed to update tenant');
        }
    };

    if (loading) return <PageLoader />;

    // Helper for empty state detection
    const isEmpty = !dashboard || (dashboard.total_tenants === 0 && dashboard.total_guests_system === 0);

    if (isEmpty) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-wedding-dark-card rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm animate-fade-in text-center h-[50vh]">
                <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-6">
                    <HiOutlineChartBar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">No Data Available</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                    There is currently no tenant or guest data to display in the global dashboard. Data will appear here once tenants start registering and managing weddings.
                </p>
            </div>
        );
    }

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Global Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform-wide statistics and insights</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Tenants"
                    value={dashboard.total_tenants}
                    icon={<HiOutlineOfficeBuilding className="w-6 h-6" />}
                    color="gold"
                />
                <StatCard
                    title="Active Tenants"
                    value={dashboard.total_active_tenants}
                    icon={<HiOutlineStatusOnline className="w-6 h-6" />}
                    color="emerald"
                />
                <StatCard
                    title="Total Guests (System)"
                    value={dashboard.total_guests_system.toLocaleString()}
                    icon={<HiOutlineUsers className="w-6 h-6" />}
                    color="blue"
                />
                <StatCard
                    title="Revenue Estimation"
                    value={formatCurrency(dashboard.revenue_estimation)}
                    icon={<HiOutlineCurrencyDollar className="w-6 h-6" />}
                    color="violet"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Tenant Growth</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dashboard.tenant_growth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#FFF',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                }}
                            />
                            <Bar dataKey="count" fill="#C6A769" radius={[6, 6, 0, 0]} name="Tenants" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-6">
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Plan Distribution</h3>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={dashboard.plan_distribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {dashboard.plan_distribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Pending Actions Widget */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                <HiOutlineExclamationCircle className="w-5 h-5 text-amber-500" />
                                Fitur Tertunda
                            </h3>
                            <span className="bg-amber-100 text-amber-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                {pendingTenants.length}
                            </span>
                        </div>
                        {pendingTenants.length > 0 ? (
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                {pendingTenants.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-gold-300 transition-colors group">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                                {item.bride_name} & {item.groom_name}
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {item.pending_features.slice(0, 2).map((f: string) => (
                                                    <span key={f} className="text-[10px] bg-white dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-600">
                                                        {f}
                                                    </span>
                                                ))}
                                                {item.pending_features.length > 2 && (
                                                    <span className="text-[10px] text-gray-400">+{item.pending_features.length - 2}</span>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleOpenEditModal(item)}
                                            className="btn-ghost p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Lengkapi Data"
                                        >
                                            <HiOutlinePencil className="w-4 h-4 text-gold-600" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-sm text-gray-500 italic">Semua fitur sudah lengkap!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Tenant Modal (Reused from TenantPage) */}
            <Modal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setSelectedTenant(null); }}
                title={`Quick Action: ${selectedTenant?.bride_name} & ${selectedTenant?.groom_name}`}
                size="md"
                footer={
                    <>
                        <button onClick={() => setShowEditModal(false)} className="btn-ghost">Batal</button>
                        <button onClick={() => handleUpdateTenant(editForm)} className="btn-primary">
                            Simpan
                        </button>
                    </>
                }
            >
                {selectedTenant && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-field text-xs text-gray-500 mb-1 block">Nama Mempelai Wanita</label>
                                <input type="text" value={editForm.bride_name || ''} onChange={(e) => setEditForm(prev => ({ ...prev, bride_name: e.target.value }))} className="input-field text-sm" />
                            </div>
                            <div>
                                <label className="label-field text-xs text-gray-500 mb-1 block">Nama Mempelai Pria</label>
                                <input type="text" value={editForm.groom_name || ''} onChange={(e) => setEditForm(prev => ({ ...prev, groom_name: e.target.value }))} className="input-field text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-field text-xs text-gray-500 mb-1 block">Tipe Paket</label>
                                <select
                                    value={editForm.plan_type}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, plan_type: e.target.value as PlanType }))}
                                    className="select-field text-sm"
                                >
                                    <option value="basic">Basic (Gratis)</option>
                                    <option value="pro">Pro</option>
                                    <option value="premium">Premium</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-field text-xs text-gray-500 mb-1 block">Tema Terpilih</label>
                                <select
                                    value={editForm.theme_id || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, theme_id: e.target.value }))}
                                    className="select-field text-sm"
                                >
                                    <option value="">-- No Theme Selected --</option>
                                    {themes
                                        .filter(t => planPriority[t.plan_type] <= planPriority[editForm.plan_type || 'basic'])
                                        .map(t => (
                                            <option key={t.id} value={t.id}>{t.name} (Plan: {t.plan_type})</option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>

                        {/* Tenant Features Section */}
                        {tenantFeatures.length > 0 && (
                            <div className="card bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 p-4 mt-6">
                                <p className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
                                    <HiOutlineExclamationCircle className="w-5 h-5" />
                                    Lengkapi Fitur Tambahan
                                </p>
                                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                    {tenantFeatures.filter(f => f.active).map((f) => (
                                        <div key={f.additional_feature_id} className="border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 bg-white dark:bg-gray-900 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <span className="font-bold text-gray-800 dark:text-white">{f.feature_name}</span>
                                            </div>

                                            <div className="pl-0 space-y-4">
                                                {/* Tenant Input Readonly */}
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Data dari Tenant</p>
                                                    {!f.is_required_tenant_input || f.input_data_type === 'empty' ? (
                                                        <p className="text-xs text-gray-400 italic">Tidak perlu input</p>
                                                    ) : (
                                                        <>
                                                            {!f.input_tenant_data ? (
                                                                <p className="text-xs text-red-400 italic font-medium">Belum di isi oleh tenant</p>
                                                            ) : f.input_data_type === 'gambar' ? (
                                                                <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-100">
                                                                    <ProxyImage 
                                                                        src={f.input_tenant_data} 
                                                                        alt={f.feature_name} 
                                                                        className="w-full h-full object-cover cursor-pointer" 
                                                                        onClick={() => setLightboxUrl(f.input_tenant_data)}
                                                                    />
                                                                </div>
                                                            ) : f.input_data_type === 'link' ? (
                                                                <a href={f.input_tenant_data} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">{f.input_tenant_data}</a>
                                                            ) : (
                                                                <p className="text-xs text-gray-700 dark:text-gray-300">{f.input_tenant_data}</p>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {/* Admin Result Output */}
                                                {f.output_data_type && f.output_data_type !== 'empty' && (
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-wider text-gold-500 font-bold mb-1">Result / Output Admin (Harus diisi)</p>
                                                        {f.output_data_type === 'gambar' ? (
                                                            <div className="w-32">
                                                                {f.output_data ? (
                                                                    <div className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gold-200">
                                                                        <ProxyImage 
                                                                            src={f.output_data.includes('|') ? f.output_data.split('|')[1] : f.output_data} 
                                                                            alt="Result" 
                                                                            className="w-full h-full object-cover" 
                                                                        />
                                                                        <button
                                                                            onClick={() => {
                                                                                const [id] = f.output_data.split('|');
                                                                                if (id && f.output_data.includes('|')) {
                                                                                    setImagesToDelete(prev => [...prev, id]);
                                                                                }
                                                                                handleFeatureUpdateLocal(f.additional_feature_id, { output_data: '' });
                                                                            }}
                                                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                                                                        >
                                                                            Hapus
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <ImageUpload
                                                                        imageType={`feature-out-${f.additional_feature_id}`}
                                                                        title="Upload Result"
                                                                        onUploadSuccess={(img) => handleFeatureUpdateLocal(f.additional_feature_id, { output_data: `${img.id}|${img.cdn_url || img.drive_url}` })}
                                                                        onDeleteSuccess={() => {}}
                                                                        aspectRatio="auto"
                                                                    />
                                                                )}
                                                            </div>
                                                        ) : f.output_data_type === 'link' || f.output_data_type === 'text' ? (
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type={f.output_data_type === 'link' ? 'url' : 'text'}
                                                                    value={f.output_data || ''}
                                                                    onChange={(e) => handleFeatureUpdateLocal(f.additional_feature_id, { output_data: e.target.value })}
                                                                    className="input-field text-xs flex-1 border-gold-200 focus:ring-gold-500 focus:border-gold-500"
                                                                    placeholder={f.output_data_type === 'link' ? 'https://...' : 'Input text...'}
                                                                />
                                                            </div>
                                                        ) : f.output_data_type === 'boolean' ? (
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={f.output_data === 'TRUE' || f.output_data === 'true'} 
                                                                    onChange={(e) => handleFeatureUpdateLocal(f.additional_feature_id, { output_data: e.target.checked ? 'TRUE' : 'FALSE' })}
                                                                    className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500"
                                                                />
                                                                <span className="text-xs">{f.output_data === 'TRUE' || f.output_data === 'true' ? 'Selesai' : 'Belum selesai'}</span>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {lightboxUrl && <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
        </div>
    );
}
