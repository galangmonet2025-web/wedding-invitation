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
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { tenantApi, themeApi, additionalFeatureApi } from '@/core/api/endpoints';
import { imageApi } from '@/core/api/imageApi';
import { ImageUpload } from '@/shared/components/ImageUpload';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { Lightbox } from '@/shared/components/Lightbox';
import type { Tenant, Theme, TenantActiveFeature, PlanType, TenantStatus } from '@/types';
import { HiOutlinePencil, HiOutlineSave, HiOutlineRefresh, HiOutlineExclamationCircle, HiOutlineTrash } from 'react-icons/hi';
import { useThemeStore } from '@/features/admin/store/themeStore';
import { useTenantStore } from '@/features/admin/store/tenantStore';

const COLORS = ['#C6A769', '#10B981', '#6366F1'];

import { useDashboardStore } from '../store/dashboardStore';

export function GlobalDashboardPage() {
    const {
        globalDashboard: dashboard,
        loading,
        fetchGlobalDashboard,
        hasLoadedGlobal
    } = useDashboardStore();

    const [pendingTenants, setPendingTenants] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'charts' | 'pending'>('pending');
    const { themes, fetchThemes } = useThemeStore();
    const { updateTenant: updateTenantInStore, fetchTenants } = useTenantStore();
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [editForm, setEditForm] = useState<Partial<Tenant>>({});
    const [tenantFeatures, setTenantFeatures] = useState<TenantActiveFeature[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
    const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, featureId: string, type: 'output' } | null>(null);
    const [isDeletingImg, setIsDeletingImg] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [tooltipState, setTooltipState] = useState<{ visible: boolean; x: number; y: number; item: any | null }>({ visible: false, x: 0, y: 0, item: null });

    // Priority map for plan types
    const planPriority: Record<string, number> = {
        'basic': 1,
        'pro': 2,
        'premium': 3
    };

    useEffect(() => {
        fetchDashboard();
        fetchPendingActions();
        fetchThemes(); // Background fetch if not loaded
    }, []);

    useEffect(() => {
        if (pendingTenants.length === 0) {
            setActiveTab('charts');
        } else {
            setActiveTab('pending');
        }
    }, [pendingTenants.length]);

    const fetchDashboard = async (force = false) => {
        if (force) {
            toast.loading('Refreshing dashboard...', { id: 'refresh-global' });
        }
        const success = await fetchGlobalDashboard(force);
        if (force) {
            await fetchPendingActions(); // Also refresh pending actions widget
            if (success) toast.success('Dashboard updated!', { id: 'refresh-global' });
            else toast.error('Failed to refresh dashboard', { id: 'refresh-global' });
        }
    };

    const fetchPendingActions = async () => {
        try {
            const res = await dashboardApi.getPendingActions();
            if (res.success) {
                setPendingTenants(res.data?.incomplete_tenants || []);
            }
        } catch { }
    };


    const handleOpenEditModal = async (item: any) => {
        setSelectedTenant(item);
        setEditForm(item);
        setShowEditModal(true);

        // Fetch specific features for this tenant
        try {
            const res = await additionalFeatureApi.getTenantFeatures(item.id);
            if (res.success) {
                const features = res.data || [];
                // Only show features already purchased by tenant
                const purchasedFeatures = features.filter(f => !!f.id);
                setTenantFeatures(purchasedFeatures);
                // Initialize expanded features: all shown are purchased, so expand all
                const initialExpanded = new Set(purchasedFeatures.map(f => f.additional_feature_id));
                setExpandedFeatures(initialExpanded);
            }
        } catch {
            toast.error('Gagal memuat fitur tambahan');
        }
    };

    const toggleFeatureExpansion = (id: string) => {
        setExpandedFeatures(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleFeatureUpdateLocal = (featureId: string, updates: Partial<TenantActiveFeature>) => {
        setTenantFeatures(prev => prev.map(f => f.additional_feature_id === featureId ? { ...f, ...updates } : f));
    };

    const handleUpdateTenant = async () => {
        if (!selectedTenant) return;

        setSavingId(selectedTenant.id);
        const toastId = toast.loading('Menyimpan fitur...');
        setShowEditModal(false); // Close modal immediately so user sees the inline loading

        try {
            if (tenantFeatures.length > 0) {
                // Execute sequentially to prevent Google Apps Script rate limiting
                for (const f of tenantFeatures) {
                    await additionalFeatureApi.updateTenantFeature({
                        tenant_id: selectedTenant.id,
                        additional_feature_id: f.additional_feature_id,
                        active: f.active,
                        payment_status: f.payment_status,
                        output_data: f.output_data
                    }, { skipLoader: true } as any);
                }

                if (imagesToDelete.length > 0) {
                    await Promise.all(imagesToDelete.map(id => imageApi.deleteImage(id).catch(() => { })));
                }
            }

            toast.success('Fitur berhasil disimpan', { id: toastId });
            setImagesToDelete([]);
            await fetchPendingActions(); // Refresh the list and wait for it to finish
        } catch {
            toast.error('Gagal menyimpan fitur', { id: toastId });
        } finally {
            setSavingId(null);
        }
    };


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
            <div className="flex items-center justify-end mb-1">
                <button
                    onClick={() => fetchDashboard(true)}
                    className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
                    title="Refresh Data"
                >
                    <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>

            {!dashboard && loading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
                </div>
            ) : !dashboard ? (
                <div className="card text-center py-12">
                    <p className="text-gray-500">No dashboard data available.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
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

                    {/* Mobile Tab Switcher for Compact View */}
                    <div className="flex lg:hidden bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl gap-1">
                        <button
                            onClick={() => setActiveTab('pending')}
                            type="button"
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'pending'
                                    ? 'bg-white dark:bg-gray-700 text-gold-600 dark:text-gold-400 shadow-sm border border-gray-100 dark:border-gray-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <HiOutlineExclamationCircle className="w-4 h-4" />
                            <span>Fitur Tertunda</span>
                            {pendingTenants.length > 0 && (
                                <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none">
                                    {pendingTenants.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('charts')}
                            type="button"
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'charts'
                                    ? 'bg-white dark:bg-gray-700 text-gold-600 dark:text-gold-400 shadow-sm border border-gray-100 dark:border-gray-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <HiOutlineChartBar className="w-4 h-4" />
                            <span>Grafik Tren</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Tenant Growth (Charts Tab) */}
                        <div className={`${activeTab === 'charts' ? 'block' : 'hidden lg:block'} lg:col-span-2 card`}>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Tenant Growth</h3>
                            <ResponsiveContainer width="100%" height={200}>
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

                        <div className="space-y-6 lg:block flex-1">
                            {/* Plan Distribution (Charts Tab) */}
                            <div className={`${activeTab === 'charts' ? 'block' : 'hidden lg:block'} card`}>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Plan Distribution</h3>
                                <ResponsiveContainer width="100%" height={160}>
                                    <PieChart>
                                        <Pie
                                            data={dashboard.plan_distribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {dashboard.plan_distribution.map((_: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Pending Actions Widget (Pending Tab) */}
                            <div className={`${activeTab === 'pending' ? 'block' : 'hidden lg:block'} card`}>
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
                                                        {item.pending_features.slice(0, 2).map((f: any) => (
                                                            <span key={f.name} className="text-[10px] bg-white dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-600">
                                                                {f.name}
                                                            </span>
                                                        ))}
                                                        {item.pending_features.length > 2 && (
                                                            <span className="text-[10px] text-gray-400">+{item.pending_features.length - 2}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {/* Warning Icon with Floating Tooltip Event Triggers */}
                                                    <div 
                                                        className="p-2 cursor-help"
                                                        onMouseEnter={(e) => setTooltipState({ visible: true, x: e.clientX, y: e.clientY, item })}
                                                        onMouseMove={(e) => setTooltipState(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                                                        onMouseLeave={() => setTooltipState(prev => ({ ...prev, visible: false }))}
                                                    >
                                                        <HiOutlineExclamationCircle className="w-4 h-4 text-amber-500" />
                                                    </div>
                                                    
                                                    {savingId === item.id ? (
                                                        <div className="p-2">
                                                            <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin"></div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleOpenEditModal(item)}
                                                            className="btn-ghost p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Lengkapi Data"
                                                        >
                                                            <HiOutlinePencil className="w-4 h-4 text-gold-600" />
                                                        </button>
                                                    )}
                                                </div>
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
                        size="xl"
                        footer={
                            <>
                                <button onClick={() => setShowEditModal(false)} className="btn-ghost">Batal</button>
                                <button onClick={() => handleUpdateTenant()} className="btn-primary">
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
                                        <input type="text" value={editForm.bride_name || ''} disabled className="input-field text-sm bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-70" />
                                    </div>
                                    <div>
                                        <label className="label-field text-xs text-gray-500 mb-1 block">Nama Mempelai Pria</label>
                                        <input type="text" value={editForm.groom_name || ''} disabled className="input-field text-sm bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-70" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-field text-xs text-gray-500 mb-1 block">Tipe Paket</label>
                                        <select
                                            value={editForm.plan_type}
                                            disabled
                                            className="select-field text-sm bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-70"
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
                                            disabled
                                            className="select-field text-sm bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-70"
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
                                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                            {tenantFeatures.map((f) => {
                                                const isExpanded = expandedFeatures.has(f.additional_feature_id);
                                                const isPurchased = true; // All features here are already purchased

                                                return (
                                                    <div
                                                        key={f.additional_feature_id}
                                                        className={`border rounded-xl transition-all duration-200 ${isPurchased
                                                                ? (f.active ? 'border-amber-200 dark:border-amber-900/50 bg-white dark:bg-gray-900 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/10')
                                                                : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40'
                                                            }`}
                                                    >
                                                        {/* Accordion Header */}
                                                        <div
                                                            className="flex items-center justify-between gap-4 p-3 cursor-pointer select-none"
                                                            onClick={() => toggleFeatureExpansion(f.additional_feature_id)}
                                                        >
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-sm text-gray-800 dark:text-white">{f.feature_name}</span>
                                                                    {isPurchased && <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0 rounded font-bold">SUDAH DIPESAN</span>}
                                                                </div>
                                                                <div className="flex gap-2 mt-1">
                                                                    {isPurchased && (
                                                                        <>
                                                                            <span className={`text-[9px] px-1.5 py-0 rounded font-medium ${f.payment_status === 'Sudah dibayar' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                                {f.payment_status}
                                                                            </span>
                                                                            <span className={`text-[9px] px-1.5 py-0 rounded font-medium ${f.active ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                {f.active ? 'Aktif' : 'Menunggu Aktivasi'}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm shrink-0"
                                                                    onClick={(e) => e.stopPropagation()} // Prevent accordion toggle when clicking activation checkbox
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={f.active}
                                                                        onChange={(e) => {
                                                                            handleFeatureUpdateLocal(f.additional_feature_id, { active: e.target.checked });
                                                                            // Auto expand if activated
                                                                            if (e.target.checked && !expandedFeatures.has(f.additional_feature_id)) {
                                                                                toggleFeatureExpansion(f.additional_feature_id);
                                                                            }
                                                                        }}
                                                                        className="w-4 h-4 rounded text-gold-500 focus:ring-gold-500"
                                                                    />
                                                                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Aktifkan</span>
                                                                </div>
                                                                <div className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Accordion Content */}
                                                        {isExpanded && (
                                                            <div className="px-3 pb-3 pt-0 animate-fade-in">
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800/50">
                                                                    {/* Payment Status Toggle for Admin */}
                                                                    <div>
                                                                        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-1 font-bold">Status Pembayaran</p>
                                                                        <select
                                                                            value={f.payment_status}
                                                                            onChange={(e) => handleFeatureUpdateLocal(f.additional_feature_id, { payment_status: e.target.value as any })}
                                                                            className="select-field text-[11px] py-1 h-8 w-full"
                                                                        >
                                                                            <option value="Menunggu pembayaran">Menunggu pembayaran</option>
                                                                            <option value="Sudah dibayar">Sudah dibayar</option>
                                                                        </select>
                                                                    </div>

                                                                    {/* Tenant Input Readonly */}
                                                                    <div>
                                                                        <p className="text-[9px] uppercase tracking-wider text-gray-400 mb-1 font-bold">Data dari Tenant</p>
                                                                        <div className="min-h-[32px] flex items-center">
                                                                            {!f.is_required_tenant_input || f.input_data_type === 'empty' ? (
                                                                                <p className="text-[11px] text-gray-400 italic">Tidak perlu input</p>
                                                                            ) : (
                                                                                <>
                                                                                    {!f.input_tenant_data ? (
                                                                                        <p className="text-[11px] text-red-400 italic font-medium">Belum di isi oleh tenant</p>
                                                                                    ) : f.input_data_type === 'gambar' ? (
                                                                                        <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                                                                                            <ProxyImage
                                                                                                src={f.input_tenant_data}
                                                                                                alt={f.feature_name}
                                                                                                className="w-full h-full object-cover cursor-pointer"
                                                                                                onClick={() => setLightboxUrl(f.input_tenant_data)}
                                                                                            />
                                                                                        </div>
                                                                                    ) : f.input_data_type === 'link' ? (
                                                                                        <a href={f.input_tenant_data} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 hover:underline line-clamp-1">{f.input_tenant_data}</a>
                                                                                    ) : (
                                                                                        <p className="text-[11px] text-gray-700 dark:text-gray-300 line-clamp-2">{f.input_tenant_data}</p>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Admin Result Output */}
                                                                    {f.output_data_type && f.output_data_type !== 'empty' && (
                                                                        <div>
                                                                            <p className="text-[9px] uppercase tracking-wider text-gold-500 font-bold mb-1">Result Admin</p>
                                                                            <div className="min-h-[32px] flex items-center">
                                                                                {f.output_data_type === 'gambar' ? (
                                                                                    <div className="w-full">
                                                                                        {f.output_data ? (
                                                                                            <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                                                                                                <ProxyImage
                                                                                                    src={f.output_data.includes('|') ? f.output_data.split('|')[1] : f.output_data}
                                                                                                    alt="Result"
                                                                                                    className="w-full h-full object-cover cursor-pointer"
                                                                                                    onClick={() => setLightboxUrl(f.output_data.includes('|') ? f.output_data.split('|')[1] : f.output_data)}
                                                                                                />
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        const [id] = f.output_data.split('|');
                                                                                                        setDeleteConfirm({ id, featureId: f.additional_feature_id, type: 'output' });
                                                                                                    }}
                                                                                                    className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                                >
                                                                                                    <HiOutlineTrash className="w-4 h-4" />
                                                                                                </button>
                                                                                                {isDeletingImg === f.additional_feature_id && (
                                                                                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-[1px] rounded-lg">
                                                                                                        <div className="w-6 h-6 border-[3px] border-white/20 border-t-red-500 rounded-full animate-spin mb-1" />
                                                                                                        <span className="text-[10px] text-white font-medium">Menghapus...</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <ImageUpload
                                                                                                imageType={`feature-out-${f.additional_feature_id}`}
                                                                                                title="Upload"
                                                                                                onUploadSuccess={async (img) => {
                                                                                                    const newVal = `${img.id}|${img.cdn_url || img.drive_url}`;
                                                                                                    handleFeatureUpdateLocal(f.additional_feature_id, { output_data: newVal });
                                                                                                    await additionalFeatureApi.updateTenantFeature({
                                                                                                        tenant_id: selectedTenant!.id,
                                                                                                        additional_feature_id: f.additional_feature_id,
                                                                                                        output_data: newVal
                                                                                                    }, { skipLoader: true } as any);
                                                                                                }}
                                                                                                onDeleteSuccess={() => { }}
                                                                                                aspectRatio="auto"
                                                                                                className="!p-2 !text-xs min-h-[96px]"
                                                                                            />
                                                                                        )}
                                                                                    </div>
                                                                                ) : f.output_data_type === 'link' || f.output_data_type === 'text' ? (
                                                                                    <div className="flex gap-2 w-full">
                                                                                        <input
                                                                                            type={f.output_data_type === 'link' ? 'url' : 'text'}
                                                                                            value={f.output_data || ''}
                                                                                            onChange={(e) => handleFeatureUpdateLocal(f.additional_feature_id, { output_data: e.target.value })}
                                                                                            className="input-field text-[11px] py-1 h-8 flex-1"
                                                                                            placeholder={f.output_data_type === 'link' ? 'https://...' : 'Input...'}
                                                                                        />
                                                                                    </div>
                                                                                ) : f.output_data_type === 'boolean' ? (
                                                                                    <div className="flex items-center gap-2">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={f.output_data === 'TRUE' || f.output_data === 'true'}
                                                                                            onChange={(e) => handleFeatureUpdateLocal(f.additional_feature_id, { output_data: e.target.checked ? 'TRUE' : 'FALSE' })}
                                                                                            className="w-4 h-4 rounded text-gold-500 focus:ring-gold-500"
                                                                                        />
                                                                                        <span className="text-[11px]">{f.output_data === 'TRUE' || f.output_data === 'true' ? 'Selesai' : 'Belum'}</span>
                                                                                    </div>
                                                                                ) : null}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </Modal>

                    {lightboxUrl && (
                        <Lightbox
                            images={[{ url: lightboxUrl }]}
                            onClose={() => setLightboxUrl(null)}
                        />
                    )}
                </>
            )}

            {/* Global Floating Tooltip for Pending Actions */}
            {tooltipState.visible && tooltipState.item && (
                <div 
                    className="fixed z-[100] w-80 p-4 bg-gray-800 text-white text-xs leading-relaxed rounded-xl shadow-2xl pointer-events-none border border-gray-700"
                    style={{ left: tooltipState.x - 325, top: tooltipState.y + 15 }}
                >
                    <p className="text-sm font-bold mb-2 border-b border-gray-700 pb-2">Tindakan diperlukan:</p>
                    <ul className="space-y-2">
                        {tooltipState.item.pending_features.map((f: any) => (
                            <li key={f.name} className="flex gap-2.5">
                                <span className="text-amber-400 mt-0.5">•</span>
                                <span>Additional feature <span className="font-semibold text-gold-400">{f.name}</span> {f.reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <ConfirmDialog
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Hapus Gambar"
                warningTitle="Konfirmasi Hapus"
                message="Apakah Anda yakin ingin menghapus gambar ini? Tindakan ini tidak dapat dibatalkan."
                confirmLabel="Ya, Hapus"
                loading={!!isDeletingImg}
                onConfirm={async () => {
                    if (!deleteConfirm) return;
                    const { id, featureId } = deleteConfirm;
                    setDeleteConfirm(null);
                    setIsDeletingImg(featureId);

                    try {
                        await additionalFeatureApi.updateTenantFeature({
                            tenant_id: selectedTenant!.id,
                            additional_feature_id: featureId,
                            output_data: ''
                        }, { skipLoader: true } as any);

                        if (id) {
                            await imageApi.deleteImage(id).catch(() => {});
                        }

                        handleFeatureUpdateLocal(featureId, { output_data: '' });
                        toast.success('Gambar berhasil dihapus!');
                    } catch (error) {
                        toast.error('Gagal menghapus gambar');
                    } finally {
                        setIsDeletingImg(null);
                    }
                }}
            />
        </div>
    );
}
