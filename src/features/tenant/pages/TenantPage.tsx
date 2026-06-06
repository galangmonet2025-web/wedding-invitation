import { useEffect, useState } from 'react';
import { tenantApi, themeApi, additionalFeatureApi } from '@/core/api/endpoints';
import { imageApi } from '@/core/api/imageApi';
import { DataTable, Column } from '@/shared/components/DataTable';
import { Modal } from '@/shared/components/Modal';
import { PageLoader } from '@/shared/components/Loading';
import type { Tenant, CreateTenantRequest, PlanType, TenantStatus, Theme, TenantActiveFeature } from '@/types';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineExternalLink, HiOutlineRefresh, HiOutlineSave, HiOutlineTrash } from 'react-icons/hi';
import { ImageUpload } from '@/shared/components/ImageUpload';
import { ProxyImage } from '@/shared/components/ProxyImage';
import { Lightbox } from '@/shared/components/Lightbox';
import { useBackgroundTaskStore } from '@/shared/store/backgroundTaskStore';
import { exportToExcel, exportToPdf } from '@/shared/utils/exportUtils';
import { useThemeStore } from '@/features/admin/store/themeStore';
import { useTenantStore } from '@/features/admin/store/tenantStore';
import { Button } from '@/shared/components/Button';
import { IconButton } from '@/shared/components/IconButton';
import { Badge } from '@/shared/components/Badge';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';

export function TenantPage() {
    const { tenants, fetchTenants: fetchTenantsFromStore, addTenant, updateTenant: updateTenantInStore, tenantFeaturesCache, setTenantFeatures } = useTenantStore();
    const { themes, fetchThemes } = useThemeStore();
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

    const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
    const [editForm, setEditForm] = useState<Partial<Tenant>>({});
    const [tenantFeatures, setTenantFeaturesLocal] = useState<TenantActiveFeature[]>([]);
    const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
    const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, featureId: string, type: 'output' } | null>(null);
    const [isDeletingImg, setIsDeletingImg] = useState<string | null>(null);
    const [featureToRemove, setFeatureToRemove] = useState<{ featureId: string, featureName: string } | null>(null);
    const [isRemovingFeature, setIsRemovingFeature] = useState(false);
    const { tasks } = useBackgroundTaskStore();

    const [form, setForm] = useState<CreateTenantRequest & { theme_id?: string }>({
        bride_name: '',
        groom_name: '',
        wedding_date: '',
        domain_slug: '',
        plan_type: 'basic',
        admin_username: '',
        admin_password: '',
        theme_id: '',
    });

    // Placeholder for auth context/hook. In a real app, this would come from a context or hook.
    // Assuming a simple structure for demonstration based on the instruction's usage.
    const auth = {
        role: 'admin' // or 'superadmin'
    };

    useEffect(() => {
        fetchTenants();
    }, [auth.role]);

    // Priority map for plan types
    const planPriority: Record<string, number> = {
        'basic': 1,
        'pro': 2,
        'premium': 3
    };

    const fetchTenants = async (force = false) => {
        try {
            fetchThemes(); // Background fetch if not loaded
            await fetchTenantsFromStore(force);
        } catch (error) {
            toast.error('Failed to load tenants');
        } finally {
            setLoading(false);
        }
    };

    const isDomainSlugValid = (slug: string, excludeId?: string) => {
        if (!slug) return true;
        const activeTenantsWithSlug = tenants.filter(t =>
            t.domain_slug === slug &&
            t.status_account === 'active' &&
            t.id !== excludeId
        );
        return activeTenantsWithSlug.length === 0;
    };

    const handleCreateTenant = async () => {
        if (!form.bride_name || !form.groom_name || !form.admin_username || !form.admin_password) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (!isDomainSlugValid(form.domain_slug)) {
            toast.error('Domain slug is already in use by an active tenant');
            return;
        }
        try {
            const response = await tenantApi.createTenant(form);
            if (response.success) {
                toast.success('Tenant created successfully');
                addTenant(response.data); // Update local cache
                setShowAddModal(false);
                resetForm();
            } else {
                toast.error(response.message);
            }
        } catch {
            toast.error('Failed to create tenant');
        }
    };

    const handleUpdateTenant = async (updates: Partial<Tenant>) => {
        if (!selectedTenant) return;

        const targetStatus = updates.status_account || selectedTenant.status_account;
        const targetSlug = updates.domain_slug !== undefined ? updates.domain_slug : selectedTenant.domain_slug;
        if (targetStatus === 'active' && targetSlug) {
            if (!isDomainSlugValid(targetSlug, selectedTenant.id)) {
                toast.error('Domain slug is already in use by another active tenant');
                return;
            }
        }

        try {
            const response = await tenantApi.updateTenant({ id: selectedTenant.id, ...updates });
            if (response.success) {
                // Save additional features: Only if superadmin activated it OR tenant already purchased it
                const featuresToSave = tenantFeatures.filter(f => f.active || !!f.id);
                
                if (featuresToSave.length > 0) {
                    try {
                        // Execute sequentially to prevent Google Apps Script rate limiting
                        for (const f of featuresToSave) {
                            await additionalFeatureApi.updateTenantFeature({
                                tenant_id: selectedTenant.id,
                                additional_feature_id: f.additional_feature_id,
                                active: f.active,
                                payment_status: f.payment_status,
                                output_data: f.output_data
                            });
                        }
                        
                        if (imagesToDelete.length > 0) {
                            await Promise.all(imagesToDelete.map(id => imageApi.deleteImage(id).catch(() => {})));
                        }
                        // Update cache with new feature data
                        setTenantFeatures(selectedTenant.id, tenantFeatures);
                    } catch (err) {
                        console.error('Error saving features', err);
                        toast.error('Gagal menyimpan beberapa fitur tambahan');
                    }
                }
                toast.success('Tenant updated');
                updateTenantInStore(selectedTenant.id, updates); // Update local cache
                setShowEditModal(false);
                setImagesToDelete([]);
            }
        } catch {
            toast.error('Failed to update tenant');
        }
    };

    const handleDeleteTenantAction = async () => {
        if (!tenantToDelete) return;
        const tenantId = tenantToDelete.id;
        const taskId = `delete-tenant-${tenantId}`;

        // Register background task
        useBackgroundTaskStore.getState().addTask({
            id: taskId,
            name: 'delete-tenant',
            total: 1,
            details: `Menghapus tenant ${tenantToDelete.domain_slug}...`
        });

        // Close modal immediately
        setTenantToDelete(null);

        try {
            const res = await tenantApi.deleteTenant(tenantId);
            if (res.success) {
                useBackgroundTaskStore.getState().updateTask(taskId, {
                    status: 'success',
                    progress: 100,
                    details: 'Tenant beserta seluruh data terkait berhasil dihapus'
                });
                fetchTenants();
            } else {
                useBackgroundTaskStore.getState().updateTask(taskId, {
                    status: 'error',
                    details: res.message || 'Gagal menghapus tenant'
                });
            }
        } catch {
            useBackgroundTaskStore.getState().updateTask(taskId, {
                status: 'error',
                details: 'Terjadi kesalahan saat menghapus tenant'
            });
        }
    };

    const handleFeatureUpdateLocal = (featureId: string, updates: Partial<TenantActiveFeature>) => {
        setTenantFeaturesLocal(prev => prev.map(f => f.additional_feature_id === featureId ? { ...f, ...updates } : f));
    };


    const isValidUrl = (urlString: string) => {
        try {
            return Boolean(new URL(urlString));
        } catch (e) {
            return false;
        }
    };

    const parseImageUrl = (data: string | null | undefined) => {
        if (!data) return '';
        const parts = data.split('|');
        const url = parts.length > 1 ? parts[1] : parts[0];
        
        // If it's just an ID (doesn't start with http), it's probably a Drive ID
        if (url && !url.startsWith('http')) {
            return `${import.meta.env.VITE_API_URL}?action=imageProxy&id=${url}`;
        }
        return url || '';
    };

    const resetForm = () => {
        setForm({ bride_name: '', groom_name: '', wedding_date: '', domain_slug: '', plan_type: 'basic', admin_username: '', admin_password: '' });
    };

    const handleImpersonate = async (tenant: Tenant) => {
        try {
            const res = await tenantApi.impersonateTenant(tenant.id);
            if (!res.success) {
                toast.error(res.message || 'Gagal membuka sesi tenant');
                return;
            }
            // Encode auth data as base64 and open impersonate page in a new tab
            const encoded = btoa(JSON.stringify(res.data));
            window.open(`${window.location.origin}${window.location.pathname}#/private/impersonate?data=${encoded}`, '_blank');
        } catch {
            toast.error('Gagal membuka sesi tenant');
        }
    };

    const planBadge = (plan: PlanType) => {
        const variants: Record<string, 'info' | 'warning' | 'gold'> = {
            basic: 'info',
            pro: 'warning',
            premium: 'gold',
        };
        return <Badge variant={variants[plan]} className="uppercase">{plan}</Badge>;
    };

    const exportColumns = [
        { header: 'Nama Pasangan', key: 'couple', render: (t: Tenant) => `${t.bride_name} & ${t.groom_name}` },
        { header: 'Domain Slug', key: 'domain_slug' },
        { header: 'Tanggal Pernikahan', key: 'wedding_date', render: (t: Tenant) => new Date(t.wedding_date).toLocaleDateString('id-ID') },
        { header: 'Paket Langganan', key: 'plan_type', render: (t: Tenant) => t.plan_type.toUpperCase() },
        { header: 'Limit Tamu', key: 'guest_limit', render: (t: Tenant) => t.guest_limit === -1 ? 'Unlimited' : String(t.guest_limit) },
        { header: 'Status Pembayaran', key: 'status_payment' },
        { header: 'Status Akun', key: 'status_account' },
    ];

    const handleExportExcel = () => {
        exportToExcel(tenants, exportColumns, 'Data_Tenant_SuperAdmin', 'Daftar Tenant Aktif');
    };

    const handleExportPdf = () => {
        exportToPdf(tenants, exportColumns, 'Data_Tenant_SuperAdmin', 'Laporan Data Tenant SuperAdmin');
    };

    const columns: Column<Tenant>[] = [
        {
            key: 'couple',
            header: 'Couple',
            render: (t: Tenant) => (
                <div>
                    <p className="font-medium text-gray-800 dark:text-white">{t.bride_name} & {t.groom_name}</p>
                    <p className="text-xs text-gray-400">{t.domain_slug}</p>
                </div>
            ),
        },
        {
            key: 'wedding_date',
            header: 'Date',
            render: (t: Tenant) => <p>{new Date(t.wedding_date).toLocaleDateString('id-ID')}</p>,
        },
        {
            key: 'plan_type',
            header: 'Plan',
            render: (t: Tenant) => <>{planBadge(t.plan_type)}</>,
        },
        {
            key: 'theme_id',
            header: 'Theme',
            render: (t: Tenant) => {
                const theme = themes.find(th => th.id === t.theme_id);
                return <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{theme ? theme.name : '-'}</span>;
            },
        },
        {
            key: 'guest_limit',
            header: 'Guest Limit',
            render: (t: Tenant) => <p>{t.guest_limit === -1 ? '∞ Unlimited' : t.guest_limit}</p>,
        },
        {
            key: 'payment',
            header: 'Payment Status',
            render: (t: Tenant) => (
                <div className="flex flex-col gap-1">
                    <span className={`text-xs w-max px-2 py-0.5 rounded-full ${t.status_payment === 'Sudah dibayar' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'}`}>
                        {t.status_payment}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                        Due: {new Date(t.payment_deadline).toLocaleDateString('id-ID')}
                    </span>
                </div>
            )
        },
        {
            key: 'status',
            header: 'Account Status',
            render: (t: Tenant) => (
                <Badge variant={t.status_account === 'active' ? 'success' : 'danger'}>{t.status_account}</Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (t: Tenant) => {
                const isDeletingRow = tasks.some(task => task.id === `delete-tenant-${t.id}` && task.status === 'running');
                return (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleImpersonate(t)}
                            disabled={isDeletingRow}
                            className={`p-1.5 rounded-lg transition-colors ${isDeletingRow ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600'}`}
                            title="Buka sebagai Tenant Admin"
                        >
                            <HiOutlineExternalLink className="w-4 h-4" />
                        </button>
                        <button
                            onClick={async () => {
                                setSelectedTenant(t);
                                setEditForm(t);
                                setShowEditModal(true);
                                
                                // Check cache first
                                if (tenantFeaturesCache[t.id]) {
                                    const features = tenantFeaturesCache[t.id];
                                    setTenantFeaturesLocal(features);
                                    setExpandedFeatures(new Set(features.filter(f => !!f.id).map(f => f.additional_feature_id)));
                                } else {
                                    setTenantFeaturesLocal([]); // Clear old data
                                    setExpandedFeatures(new Set());
                                    try {
                                        const res = await additionalFeatureApi.getTenantFeatures(t.id);
                                        if (res.success) {
                                            const features = res.data || [];
                                            setTenantFeatures(t.id, features);
                                            setTenantFeaturesLocal(features);
                                            setExpandedFeatures(new Set(features.filter(f => !!f.id).map(f => f.additional_feature_id)));
                                        }
                                    } catch {
                                        toast.error('Failed to load tenant features');
                                    }
                                }
                            }}
                            disabled={isDeletingRow}
                            className={`p-1.5 rounded-lg transition-colors ${isDeletingRow ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600'}`}
                            title="Edit"
                        >
                            <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                setTenantToDelete(t);
                            }}
                            disabled={isDeletingRow}
                            className={`p-1.5 rounded-lg transition-colors ${isDeletingRow ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600'}`}
                            title="Hapus"
                        >
                            {isDeletingRow ? <HiOutlineRefresh className="w-4 h-4 animate-spin text-red-400" /> : <HiOutlineTrash className="w-4 h-4" />}
                        </button>
                    </div>
                );
            },
        },
    ];

    const toggleFeatureExpansion = (id: string) => {
        setExpandedFeatures(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{tenants.length} tenants registered</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1 border border-gray-200 dark:border-gray-700">
                        <button onClick={handleExportExcel} className="flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded shadow-sm transition-colors flex items-center gap-2 justify-center">
                            Excel
                        </button>
                        <button onClick={handleExportPdf} className="flex-1 lg:flex-none px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-colors flex items-center gap-2 justify-center">
                            PDF
                        </button>
                    </div>
                    <IconButton
                        onClick={() => fetchTenants(true)}
                        icon={<HiOutlineRefresh className="w-4 h-4" />}
                        spinning={loading}
                        title="Refresh Data"
                    />
                    <Button onClick={() => { resetForm(); setShowAddModal(true); }} size="sm" icon={<HiOutlinePlus className="w-4 h-4" />}>
                        New Tenant
                    </Button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={tenants}
                loading={loading}
                emptyMessage="No tenants found"
            />

            {/* Create Tenant Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Create New Tenant"
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
                        <Button onClick={handleCreateTenant}>Create Tenant</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-field">Nama Mempelai Wanita *</label>
                            <input type="text" value={form.bride_name} onChange={(e) => setForm((f) => ({ ...f, bride_name: e.target.value }))} className="input-field" />
                        </div>
                        <div>
                            <label className="label-field">Nama Mempelai Pria *</label>
                            <input type="text" value={form.groom_name} onChange={(e) => setForm((f) => ({ ...f, groom_name: e.target.value }))} className="input-field" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-field">Tanggal Pernikahan</label>
                            <input type="date" value={form.wedding_date} onChange={(e) => setForm((f) => ({ ...f, wedding_date: e.target.value }))} className="input-field" />
                        </div>
                        <div>
                            <label className="label-field">Slug Domain</label>
                            <input type="text" value={form.domain_slug} onChange={(e) => setForm((f) => ({ ...f, domain_slug: e.target.value }))} className="input-field" placeholder="couple-name" />
                        </div>
                    </div>
                    <div>
                        <label className="label-field">Tipe Paket</label>
                        <select value={form.plan_type} onChange={(e) => setForm((f) => ({ ...f, plan_type: e.target.value as PlanType }))} className="select-field">
                            <option value="basic">Basic (Gratis)</option>
                            <option value="pro">Pro</option>
                            <option value="premium">Premium</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-field">Tema Berlangganan</label>
                        <select
                            value={form.theme_id || ''}
                            onChange={(e) => setForm((f) => ({ ...f, theme_id: e.target.value }))}
                            className="select-field"
                        >
                            <option value="">-- No Theme Selected --</option>
                            {themes
                                .filter(t => planPriority[t.plan_type] <= planPriority[form.plan_type])
                                .map(t => (
                                    <option key={t.id} value={t.id}>{t.name} (Plan: {t.plan_type})</option>
                                ))
                            }
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Themes are filtered based on the selected Plan Type.</p>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Admin Account</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-field">Username Admin *</label>
                            <input type="text" value={form.admin_username} onChange={(e) => setForm((f) => ({ ...f, admin_username: e.target.value }))} className="input-field" />
                        </div>
                        <div>
                            <label className="label-field">Password Admin *</label>
                            <input type="password" value={form.admin_password} onChange={(e) => setForm((f) => ({ ...f, admin_password: e.target.value }))} className="input-field" />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Edit Tenant Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setSelectedTenant(null); }}
                title={`Manage: ${selectedTenant?.bride_name} & ${selectedTenant?.groom_name}`}
                size="2xl"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setShowEditModal(false)}>Batal</Button>
                        <Button onClick={() => handleUpdateTenant(editForm)}>Simpan</Button>
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
                                <label className="label-field text-xs text-gray-500 mb-1 block">Tanggal Pernikahan</label>
                                <input type="date" value={editForm.wedding_date ? new Date(editForm.wedding_date).toISOString().split('T')[0] : ''} onChange={(e) => setEditForm(prev => ({ ...prev, wedding_date: e.target.value }))} className="input-field text-sm" />
                            </div>
                            <div>
                                <label className="label-field text-xs text-gray-500 mb-1 block">Slug Domain</label>
                                <input type="text" value={editForm.domain_slug || ''} onChange={(e) => setEditForm(prev => ({ ...prev, domain_slug: e.target.value }))} className="input-field text-sm" />
                            </div>
                        </div>



                        <div className="grid grid-cols-2 gap-4">
                            <div className="card bg-gray-50 dark:bg-gray-800 p-4">
                                <div className="flex flex-col gap-2">
                                    <p className="text-xs text-gray-400">Current Plan</p>
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
                            </div>
                            <div className="card bg-gray-50 dark:bg-gray-800 p-4">
                                <div className="flex flex-col gap-2">
                                    <p className="text-xs text-gray-400">Account Status</p>
                                    <select
                                        value={editForm.status_account}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, status_account: e.target.value as TenantStatus }))}
                                        className="select-field text-sm"
                                    >
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>
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

                        <div className="card bg-gray-50 dark:bg-gray-800 p-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Status</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="label-field text-xs text-gray-500 mb-1 block">Status</p>
                                    <select
                                        value={editForm.status_payment}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, status_payment: e.target.value as 'Menunggu pembayaran' | 'Sudah dibayar' }))}
                                        className="select-field text-sm w-full"
                                    >
                                        <option value="Menunggu pembayaran">Menunggu pembayaran</option>
                                        <option value="Sudah dibayar">Sudah dibayar</option>
                                    </select>
                                </div>

                                <div>
                                    <p className="label-field text-xs text-gray-500 mb-1 block">Deadline Date</p>
                                    <input
                                        type="date"
                                        value={editForm.payment_deadline ? new Date(editForm.payment_deadline).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, payment_deadline: e.target.value }))}
                                        className="input-field text-sm w-full"
                                    />
                                </div>

                            </div>
                        </div>

                        {/* Tenant Features Section */}
                        {tenantFeatures.length > 0 && (
                            <div className="card bg-gray-50 dark:bg-gray-800 p-4 mt-6">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Additional Features</p>
                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {tenantFeatures.map((f) => {
                                        const isExpanded = expandedFeatures.has(f.additional_feature_id);
                                        const isPurchased = !!f.id;
                                        
                                        return (
                                            <div 
                                                key={f.additional_feature_id} 
                                                className={`border rounded-xl transition-all duration-200 ${
                                                    isPurchased 
                                                        ? (f.active ? 'border-amber-200 dark:border-amber-900/50 bg-white dark:bg-gray-900 shadow-sm' : 'border-gray-200 dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/10') 
                                                        : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40'
                                                }`}
                                            >
                                                {/* Accordion Header */}
                                                <div 
                                                    className="flex items-center justify-between gap-4 p-3 cursor-pointer select-none"
                                                    onClick={() => toggleFeatureExpansion(f.additional_feature_id)}
                                                >
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <div 
                                                            className="flex items-center gap-2 dark:bg-gray-800 py-1.5"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <input 
                                                                type="checkbox" 
                                                                checked={f.active} 
                                                                onChange={(e) => {
                                                                    const isChecked = e.target.checked;
                                                                    const updates: Partial<TenantActiveFeature> = { active: isChecked };
                                                                    if (isChecked && f.output_data_type === 'boolean' && !f.output_data) {
                                                                        updates.output_data = 'FALSE';
                                                                    }
                                                                    handleFeatureUpdateLocal(f.additional_feature_id, updates);
                                                                    // Auto expand if activated
                                                                    if (isChecked && !expandedFeatures.has(f.additional_feature_id)) {
                                                                        toggleFeatureExpansion(f.additional_feature_id);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-800 dark:text-white text-sm">{f.feature_name}</span>
                                                                {!isPurchased && <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0 rounded font-bold">BELUM DIPESAN</span>}
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
                                                                {!isPurchased && (
                                                                    <span className="text-[9px] text-gray-400 italic">Klik untuk detail fitur</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
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
                                                                                        src={parseImageUrl(f.input_tenant_data)} 
                                                                                        alt={f.feature_name} 
                                                                                        className="w-full h-full object-cover cursor-pointer" 
                                                                                        onClick={() => setLightboxUrl(parseImageUrl(f.input_tenant_data))}
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
                                                                                            src={parseImageUrl(f.output_data)} 
                                                                                            alt="Result" 
                                                                                            className="w-full h-full object-cover cursor-pointer" 
                                                                                            onClick={() => setLightboxUrl(parseImageUrl(f.output_data))}
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
                                                                                        tenantId={selectedTenant!.id}
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
                                                                                        onDeleteSuccess={() => {}}
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
                                                        
                                                        {/* Hapus Fitur Button */}
                                                        {isPurchased && (
                                                            <div className="mt-4 pt-3 border-t border-red-100 dark:border-red-900/30 flex justify-end">
                                                                <button 
                                                                    onClick={() => setFeatureToRemove({ featureId: f.additional_feature_id, featureName: f.feature_name || '' })}
                                                                    className="text-[10px] text-red-600 hover:text-red-700 font-medium flex items-center gap-1 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                                                >
                                                                    <HiOutlineTrash className="w-3.5 h-3.5" />
                                                                    Hapus Fitur dari Tenant Ini
                                                                </button>
                                                            </div>
                                                        )}
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

            {/* Modal Konfirmasi Hapus */}
            <ConfirmDialog
                isOpen={!!tenantToDelete}
                onClose={() => setTenantToDelete(null)}
                onConfirm={handleDeleteTenantAction}
                title="Hapus Data Tenant"
                variant="danger"
                confirmLabel="Ya, Hapus Permanen"
                requireText="DELETE"
                message={
                    <div className="space-y-2">
                        <p>Anda akan menghapus tenant <b>{tenantToDelete?.domain_slug}</b> beserta <b>semua data terkaitnya</b>:</p>
                        <ul className="list-disc pl-4 space-y-1 opacity-90 text-[11px]">
                            <li>Data Tenant & Akun Admin</li>
                            <li>Data Tamu Undangan</li>
                            <li>Data Ucapan & Hadiah</li>
                            <li>Konfigurasi Fitur Tambahan</li>
                            <li>Log Aktivitas</li>
                            <li><b>Semua File Gambar di Google Drive</b></li>
                        </ul>
                        <p className="font-medium pt-2 text-xs">Tindakan ini tidak dapat dibatalkan!</p>
                    </div>
                }
            />

            {lightboxUrl && (
                <Lightbox
                    images={[{ url: lightboxUrl }]}
                    initialIndex={0}
                    onClose={() => setLightboxUrl(null)}
                />
            )}
            <ConfirmDialog
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
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
                title="Hapus Gambar"
                variant="danger"
                confirmLabel="Ya, Hapus"
                loading={!!isDeletingImg}
                message={<p>Apakah Anda yakin ingin menghapus gambar ini? Tindakan ini tidak dapat dibatalkan.</p>}
            />
            <ConfirmDialog
                isOpen={!!featureToRemove}
                onClose={() => setFeatureToRemove(null)}
                onConfirm={async () => {
                    if (!featureToRemove || !selectedTenant) return;
                    setIsRemovingFeature(true);
                    try {
                        await additionalFeatureApi.deleteTenantFeature(selectedTenant.id, featureToRemove.featureId);

                        setTenantFeaturesLocal(prev => {
                            const newFeatures = prev.map(f => {
                                if (f.additional_feature_id === featureToRemove.featureId) {
                                        return {
                                            ...f,
                                            id: null,
                                            active: false,
                                            input_tenant_data: '',
                                            output_data: '',
                                            payment_status: 'Menunggu pembayaran'
                                        } as TenantActiveFeature;
                                }
                                return f;
                            });
                            setTenantFeatures(selectedTenant.id, newFeatures);
                            return newFeatures;
                        });

                        toast.success('Fitur berhasil dihapus dari tenant');
                        setFeatureToRemove(null);
                    } catch (error) {
                        toast.error('Gagal menghapus fitur');
                    } finally {
                        setIsRemovingFeature(false);
                    }
                }}
                title="Hapus Fitur Tenant"
                variant="danger"
                confirmLabel="Ya, Hapus Fitur"
                loading={isRemovingFeature}
                message={<p>Apakah Anda yakin ingin menghapus fitur <b>{featureToRemove?.featureName}</b> dari tenant ini?</p>}
                description="Seluruh data dan hasil pengaturan fitur ini untuk tenant ini akan terhapus secara permanen."
            />
        </div>
    );
}
