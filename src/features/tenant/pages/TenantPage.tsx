import { useEffect, useState } from 'react';
import { tenantApi, themeApi } from '@/core/api/endpoints';
import { DataTable, Column } from '@/shared/components/DataTable';
import { Modal } from '@/shared/components/Modal';
import { PageLoader } from '@/shared/components/Loading';
import type { Tenant, CreateTenantRequest, PlanType, TenantStatus, Theme } from '@/types';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineExternalLink, HiOutlineRefresh } from 'react-icons/hi';

export function TenantPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [themes, setThemes] = useState<Theme[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [editForm, setEditForm] = useState<Partial<Tenant>>({});

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
                toast.success('Tenant updated');
                setShowEditModal(false);
                fetchTenants();
            }
        } catch {
            toast.error('Failed to update tenant');
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
            window.open(`${window.location.origin}${window.location.pathname}#/impersonate?data=${encoded}`, '_blank');
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
            render: (t: Tenant) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleImpersonate(t)}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 transition-colors"
                        title="Buka sebagai Tenant Admin"
                    >
                        <HiOutlineExternalLink className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            setSelectedTenant(t);
                            setEditForm(t);
                            setShowEditModal(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                        title="Edit"
                    >
                        <HiOutlinePencil className="w-4 h-4" />
                    </button>
                </div>
            ),
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
                            <label className="label-field">Bride Name *</label>
                            <input type="text" value={form.bride_name} onChange={(e) => setForm((f) => ({ ...f, bride_name: e.target.value }))} className="input-field" />
                        </div>
                        <div>
                            <label className="label-field">Groom Name *</label>
                            <input type="text" value={form.groom_name} onChange={(e) => setForm((f) => ({ ...f, groom_name: e.target.value }))} className="input-field" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-field">Wedding Date</label>
                            <input type="date" value={form.wedding_date} onChange={(e) => setForm((f) => ({ ...f, wedding_date: e.target.value }))} className="input-field" />
                        </div>
                        <div>
                            <label className="label-field">Domain Slug</label>
                            <input type="text" value={form.domain_slug} onChange={(e) => setForm((f) => ({ ...f, domain_slug: e.target.value }))} className="input-field" placeholder="couple-name" />
                        </div>
                    </div>
                    <div>
                        <label className="label-field">Plan Type</label>
                        <select value={form.plan_type} onChange={(e) => setForm((f) => ({ ...f, plan_type: e.target.value as PlanType }))} className="select-field">
                            <option value="basic">Basic (Gratis)</option>
                            <option value="pro">Pro</option>
                            <option value="premium">Premium</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-field">Subscribed Theme</label>
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
                            <label className="label-field">Admin Username *</label>
                            <input type="text" value={form.admin_username} onChange={(e) => setForm((f) => ({ ...f, admin_username: e.target.value }))} className="input-field" />
                        </div>
                        <div>
                            <label className="label-field">Admin Password *</label>
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
                                <label className="label-field text-xs text-gray-500 mb-1 block">Bride Name</label>
                                <input type="text" value={editForm.bride_name || ''} onChange={(e) => setEditForm(prev => ({ ...prev, bride_name: e.target.value }))} className="input-field text-sm" />
                            </div>
                            <div>
                                <label className="label-field text-xs text-gray-500 mb-1 block">Groom Name</label>
                                <input type="text" value={editForm.groom_name || ''} onChange={(e) => setEditForm(prev => ({ ...prev, groom_name: e.target.value }))} className="input-field text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-field text-xs text-gray-500 mb-1 block">Wedding Date</label>
                                <input type="date" value={editForm.wedding_date ? new Date(editForm.wedding_date).toISOString().split('T')[0] : ''} onChange={(e) => setEditForm(prev => ({ ...prev, wedding_date: e.target.value }))} className="input-field text-sm" />
                            </div>
                            <div>
                                <label className="label-field text-xs text-gray-500 mb-1 block">Domain Slug</label>
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
                            <label className="label-field text-xs text-gray-500 mb-1 block">Assigned Theme</label>
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
                    </div>
                )}
            </Modal>
        </div>
    );
}
