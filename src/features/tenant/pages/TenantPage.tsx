import { useEffect, useState } from 'react';
import { tenantApi } from '@/core/api/endpoints';
import { DataTable, Column } from '@/shared/components/DataTable';
import { Modal } from '@/shared/components/Modal';
import { PageLoader } from '@/shared/components/Loading';
import type { Tenant, CreateTenantRequest, PlanType, TenantStatus } from '@/types';
import toast from 'react-hot-toast';
import {
    HiOutlinePlus,
    HiOutlinePencil,
    HiOutlineBan,
    HiOutlineCheckCircle,
    HiOutlineArrowUp,
} from 'react-icons/hi';

export function TenantPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

    const [form, setForm] = useState<CreateTenantRequest>({
        bride_name: '',
        groom_name: '',
        wedding_date: '',
        domain_slug: '',
        plan_type: 'free',
        admin_username: '',
        admin_password: '',
    });

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const response = await tenantApi.getTenants();
            if (response.success) {
                setTenants(response.data);
            }
        } catch {
            toast.error('Failed to load tenants');
            setTenants([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTenant = async () => {
        if (!form.bride_name || !form.groom_name || !form.admin_username || !form.admin_password) {
            toast.error('Please fill in all required fields');
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

    const handleUpdateTenant = async (updates: { plan_type?: PlanType; status?: TenantStatus }) => {
        if (!selectedTenant) return;
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
        setForm({ bride_name: '', groom_name: '', wedding_date: '', domain_slug: '', plan_type: 'free', admin_username: '', admin_password: '' });
    };

    const planBadge = (plan: PlanType) => {
        const classes: Record<string, string> = {
            free: 'badge-info',
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
            render: (t: Tenant) => new Date(t.wedding_date).toLocaleDateString('id-ID'),
        },
        {
            key: 'plan_type',
            header: 'Plan',
            render: (t: Tenant) => planBadge(t.plan_type),
        },
        {
            key: 'guest_limit',
            header: 'Guest Limit',
            render: (t: Tenant) => <span>{t.guest_limit === -1 ? '∞ Unlimited' : t.guest_limit}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (t: Tenant) => (
                <span className={t.status === 'active' ? 'badge-success' : 'badge-danger'}>{t.status}</span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (t: Tenant) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => { setSelectedTenant(t); setShowEditModal(true); }}
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
                <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-primary text-sm flex items-center gap-2">
                    <HiOutlinePlus className="w-4 h-4" />
                    New Tenant
                </button>
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
                            <option value="free">Free (100 guests)</option>
                            <option value="pro">Pro (500 guests)</option>
                            <option value="premium">Premium (Unlimited)</option>
                        </select>
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
            >
                {selectedTenant && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="card bg-gray-50 dark:bg-gray-800 p-4">
                                <p className="text-xs text-gray-400 mb-1">Current Plan</p>
                                {planBadge(selectedTenant.plan_type)}
                            </div>
                            <div className="card bg-gray-50 dark:bg-gray-800 p-4">
                                <p className="text-xs text-gray-400 mb-1">Status</p>
                                <span className={selectedTenant.status === 'active' ? 'badge-success' : 'badge-danger'}>
                                    {selectedTenant.status}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Actions</p>
                            <div className="grid grid-cols-1 gap-2">
                                <button
                                    onClick={() => handleUpdateTenant({ plan_type: 'pro' })}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gold-50 dark:hover:bg-gold-900/10 transition-colors"
                                >
                                    <HiOutlineArrowUp className="w-5 h-5 text-gold-600" />
                                    <span className="text-sm font-medium">Upgrade to Pro</span>
                                </button>
                                <button
                                    onClick={() => handleUpdateTenant({ plan_type: 'premium' })}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gold-50 dark:hover:bg-gold-900/10 transition-colors"
                                >
                                    <HiOutlineArrowUp className="w-5 h-5 text-gold-600" />
                                    <span className="text-sm font-medium">Upgrade to Premium</span>
                                </button>
                                {selectedTenant.status === 'active' ? (
                                    <button
                                        onClick={() => handleUpdateTenant({ status: 'suspended' })}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                                    >
                                        <HiOutlineBan className="w-5 h-5 text-red-500" />
                                        <span className="text-sm font-medium text-red-600">Suspend Tenant</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleUpdateTenant({ status: 'active' })}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors"
                                    >
                                        <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />
                                        <span className="text-sm font-medium text-emerald-600">Reactivate Tenant</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
