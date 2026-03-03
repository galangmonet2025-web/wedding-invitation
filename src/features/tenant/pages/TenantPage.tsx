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
    const [editForm, setEditForm] = useState<Partial<Tenant>>({});

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

    const handleUpdateTenant = async (updates: { plan_type?: PlanType; status_account?: TenantStatus; status_payment?: 'Menunggu pembayaran' | 'Sudah dibayar' }) => {
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
                            <div className="card bg-gray-50 dark:bg-gray-800 p-4">
                                <div className="flex flex-col gap-2">
                                    <p className="text-xs text-gray-400">Current Plan</p>
                                    <select
                                        value={editForm.plan_type}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, plan_type: e.target.value as PlanType }))}
                                        className="select-field text-sm"
                                    >
                                        <option value="free">FREE</option>
                                        <option value="pro">PRO</option>
                                        <option value="premium">PREMIUM</option>
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

                        <div className="card bg-gray-50 dark:bg-gray-800 p-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Status</p>
                            <div className="flex items-center justify-between">
                                <select
                                    value={editForm.status_payment}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, status_payment: e.target.value as 'Menunggu pembayaran' | 'Sudah dibayar' }))}
                                    className="select-field text-sm"
                                >
                                    <option value="Menunggu pembayaran">Menunggu pembayaran</option>
                                    <option value="Sudah dibayar">Sudah dibayar</option>
                                </select>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">Deadline: {new Date(selectedTenant.payment_deadline).toLocaleDateString('id-ID')}</p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
