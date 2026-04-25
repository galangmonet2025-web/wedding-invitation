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

export function TenantPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [themes, setThemes] = useState<Theme[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [editForm, setEditForm] = useState<Partial<Tenant>>({});
    const [tenantFeatures, setTenantFeatures] = useState<TenantActiveFeature[]>([]);
    const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
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

    const fetchTenants = async () => {
        try {
            const [localTenantsRes, globalTenantsRes, themesRes] = await Promise.all([
                tenantApi.getTenants(),
                auth.role === 'superadmin' ? tenantApi.getTenants() : Promise.resolve({ success: false, data: [] }),
                themeApi.getThemes()
            ]);

            let finalTenants: Tenant[] = [];
            if (auth.role === 'superadmin' && globalTenantsRes.success) {
                finalTenants = globalTenantsRes.data || [];
            } else if (localTenantsRes.success) {
                finalTenants = localTenantsRes.data || [];
            }

            // In local usage, DB sometimes returns non-arrays
            setTenants(Array.isArray(finalTenants) ? finalTenants : []);

            if (themesRes.success && Array.isArray(themesRes.data)) {
                setThemes(themesRes.data);
            }
        } catch (error) {
            toast.error('Failed to load tenants or themes');
            setTenants([]);
            setThemes([]);
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
                setShowAddModal(false);
                fetchTenants();
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
                // Save additional features if any
                if (tenantFeatures.length > 0) {
                    try {
                        await Promise.all(tenantFeatures.map(f => 
                            additionalFeatureApi.updateTenantFeature({
                                tenant_id: selectedTenant.id,
                                additional_feature_id: f.additional_feature_id,
                                active: f.active,
                                output_data: f.output_data
                            })
                        ));
                        
                        if (imagesToDelete.length > 0) {
                            // Using standard fetch/axios if imageApi is not imported, but wait I need imageApi.
                            // Let me just import imageApi at the top. Wait, I will add the import below.
                            await Promise.all(imagesToDelete.map(id => imageApi.deleteImage(id).catch(() => {})));
                        }
                    } catch (err) {
                        console.error('Error saving features', err);
                        toast.error('Gagal menyimpan beberapa fitur tambahan');
                    }
                }

                toast.success('Tenant updated');
                setShowEditModal(false);
                setImagesToDelete([]);
                fetchTenants();
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
        setDeleteConfirmText('');

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
        setTenantFeatures(prev => prev.map(f => f.additional_feature_id === featureId ? { ...f, ...updates } : f));
    };


    const isValidUrl = (urlString: string) => {
        try {
            return Boolean(new URL(urlString));
        } catch (e) {
            return false;
        }
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
        const classes: Record<string, string> = {
            basic: 'badge-info',
            pro: 'badge-warning',
            premium: 'badge-gold',
        };
        return <span className={`${classes[plan]} uppercase`}>{plan}</span>;
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
                <span className={t.status_account === 'active' ? 'badge-success' : 'badge-danger'}>{t.status_account}</span>
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
                                // Fetch tenant features
                                try {
                                    const res = await additionalFeatureApi.getTenantFeatures(t.id);
                                    if (res.success) setTenantFeatures(res.data || []);
                                } catch {
                                    toast.error('Failed to load tenant features');
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
                                setDeleteConfirmText('');
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

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Tenant Management</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tenants.length} tenants registered</p>
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
                    <button 
                        onClick={() => fetchTenants()} 
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                        title="Refresh Data"
                    >
                        <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-primary text-sm flex items-center gap-2">
                        <HiOutlinePlus className="w-4 h-4" />
                        New Tenant
                    </button>
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
                        <button onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
                        <button onClick={handleCreateTenant} className="btn-primary">Create Tenant</button>
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
                size="md"
                footer={
                    <>
                        <button onClick={() => setShowEditModal(false)} className="btn-ghost">Batal</button>
                        <button onClick={() => handleUpdateTenant(editForm)} className="btn-primary">Simpan</button>
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
                                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                    {tenantFeatures.map((f) => (
                                        <div key={f.additional_feature_id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-900 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
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
                                                        }}
                                                        className="w-5 h-5 rounded text-gold-500 focus:ring-gold-500"
                                                    />
                                                    <span className="font-medium text-gray-800 dark:text-white">{f.feature_name}</span>
                                                </div>
                                            </div>

                                            {f.active && (
                                                <div className="pl-8 space-y-4">
                                                    {/* Tenant Input Readonly */}
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Data dari Tenant</p>
                                                        {!f.is_required_tenant_input || f.input_data_type === 'empty' ? (
                                                            <p className="text-sm text-gray-400 italic">Tidak perlu input dari tenant</p>
                                                        ) : (
                                                            <>
                                                                <p className="text-xs text-blue-500 dark:text-blue-400 mb-2 font-medium">Data ini diinput oleh tenant</p>
                                                                {!f.input_tenant_data ? (
                                                                    <p className="text-sm text-gray-400 italic">Belum di isi oleh tenant</p>
                                                                ) : f.input_data_type === 'gambar' ? (
                                                                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                                                                        <ProxyImage 
                                                                            src={f.input_tenant_data} 
                                                                            alt={f.feature_name} 
                                                                            className="w-full h-full object-cover cursor-pointer" 
                                                                            onClick={() => setLightboxUrl(f.input_tenant_data)}
                                                                        />
                                                                    </div>
                                                                ) : f.input_data_type === 'link' ? (
                                                                    <a href={f.input_tenant_data} target="_blank" rel="noreferrer" className="text-sm text-blue-500 hover:underline">{f.input_tenant_data}</a>
                                                                ) : f.input_data_type === 'boolean' ? (
                                                                    <span className="text-sm">{f.input_tenant_data === 'TRUE' || f.input_tenant_data === 'true' ? 'Ya' : 'Tidak'}</span>
                                                                ) : (
                                                                    <p className="text-sm text-gray-800 dark:text-gray-200">{f.input_tenant_data}</p>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Admin Result Output */}
                                                    {f.output_data_type && f.output_data_type !== 'empty' && (
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-1">Result / Output Admin</p>
                                                            {f.output_data_type === 'gambar' ? (
                                                                <div className="w-32">
                                                                    {f.output_data ? (
                                                                        <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                                                                            <ProxyImage 
                                                                                src={f.output_data.includes('|') ? f.output_data.split('|')[1] : f.output_data} 
                                                                                alt="Result" 
                                                                                className="w-full h-full object-cover cursor-pointer" 
                                                                                onClick={() => setLightboxUrl(f.output_data.includes('|') ? f.output_data.split('|')[1] : f.output_data)}
                                                                            />
                                                                            <button
                                                                                onClick={() => {
                                                                                    const [id] = f.output_data.split('|');
                                                                                    if (id && f.output_data.includes('|')) {
                                                                                        setImagesToDelete(prev => [...prev, id]);
                                                                                    }
                                                                                    handleFeatureUpdateLocal(f.additional_feature_id, { output_data: '' });
                                                                                }}
                                                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs"
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
                                                                        className="input-field text-sm flex-1"
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
                                                                    <span className="text-sm">{f.output_data === 'TRUE' || f.output_data === 'true' ? 'Selesai' : 'Belum selesai'}</span>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Modal Konfirmasi Hapus */}
            <Modal
                isOpen={!!tenantToDelete}
                onClose={() => setTenantToDelete(null)}
                title="Hapus Data Tenant"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                        <div className="flex gap-3 text-red-800 dark:text-red-400">
                            <HiOutlineTrash className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm space-y-2">
                                <p className="font-semibold text-base">Peringatan Penghapusan Permanen!</p>
                                <p>Anda akan menghapus tenant <b>{tenantToDelete?.domain_slug}</b> beserta <b>semua data terkaitnya</b>:</p>
                                <ul className="list-disc pl-4 space-y-1 opacity-90">
                                    <li>Data Tenant & Akun Admin</li>
                                    <li>Data Tamu Undangan</li>
                                    <li>Data Ucapan & Hadiah</li>
                                    <li>Konfigurasi Fitur Tambahan</li>
                                    <li>Log Aktivitas</li>
                                    <li><b>Semua File Gambar di Google Drive</b></li>
                                </ul>
                                <p className="font-medium pt-2">Tindakan ini tidak dapat dibatalkan!</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="label-field text-red-600 dark:text-red-400">Ketik <b>DELETE</b> untuk mengkonfirmasi:</label>
                        <input 
                            type="text" 
                            className="input-field border-red-300 focus:ring-red-500 focus:border-red-500 dark:border-red-900/50" 
                            placeholder="DELETE"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            autoComplete="off"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={() => {
                                setTenantToDelete(null);
                                setDeleteConfirmText('');
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteTenantAction}
                            disabled={deleteConfirmText !== 'DELETE'}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Ya, Hapus Permanen
                        </button>
                    </div>
                </div>
            </Modal>

            {lightboxUrl && (
                <Lightbox
                    images={[{ url: lightboxUrl }]}
                    initialIndex={0}
                    onClose={() => setLightboxUrl(null)}
                />
            )}
        </div>
    );
}
