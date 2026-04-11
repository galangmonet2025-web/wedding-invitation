import { useEffect, useState } from 'react';
import { giftApi } from '@/core/api/endpoints';
import { DataTable, Column } from '@/shared/components/DataTable';
import { Modal } from '@/shared/components/Modal';
import { PageLoader } from '@/shared/components/Loading';
import type { Gift } from '@/types';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineCurrencyDollar } from 'react-icons/hi';

export function GiftsPage() {
    const [gifts, setGifts] = useState<Gift[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState({ guest_name: '', amount: 0, bank_name: '' });

    useEffect(() => {
        fetchGifts();
    }, []);

    const fetchGifts = async () => {
        try {
            const response = await giftApi.getGifts();
            if (response.success) {
                setGifts(response.data);
            }
        } catch {
            toast.error('Failed to load gifts');
            setGifts([]);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    const totalAmount = gifts.reduce((sum, g) => sum + g.amount, 0);

    const handleCreate = async () => {
        if (!form.guest_name || !form.amount || !form.bank_name) {
            toast.error('Please fill in all fields');
            return;
        }
        try {
            const response = await giftApi.createGift(form);
            if (response.success) {
                toast.success('Gift recorded!');
                setShowAddModal(false);
                setForm({ guest_name: '', amount: 0, bank_name: '' });
                fetchGifts();
            }
        } catch {
            toast.error('Failed to record gift');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await giftApi.deleteGift(id);
            toast.success('Gift removed');
            setGifts((g) => g.filter((gift) => gift.id !== id));
        } catch {
            toast.error('Failed to delete');
        }
    };

    const columns: Column<Gift>[] = [
        {
            key: 'guest_name',
            header: 'Guest',
            render: (g: Gift) => <span className="font-medium text-gray-800 dark:text-white">{g.guest_name}</span>,
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (g: Gift) => <span className="font-semibold text-gold-600">{formatCurrency(g.amount)}</span>,
        },
        {
            key: 'bank_name',
            header: 'Bank',
            render: (g: Gift) => <span className="badge-info">{g.bank_name}</span>,
        },
        {
            key: 'created_at',
            header: 'Date',
            render: (g: Gift) => new Date(g.created_at).toLocaleDateString('id-ID'),
        },
        {
            key: 'actions',
            header: '',
            render: (g: Gift) => (
                <button
                    onClick={() => handleDelete(g.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors"
                >
                    <HiOutlineTrash className="w-4 h-4" />
                </button>
            ),
        },
    ];

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Gift Records</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{gifts.length} gifts recorded</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-2">
                    <HiOutlinePlus className="w-4 h-4" />
                    Record Gift
                </button>
            </div>

            {/* Total Gift Card */}
            <div className="card bg-gradient-to-r from-gold-500 to-gold-700 text-white border-0">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                        <HiOutlineCurrencyDollar className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-white/80">Total Gift Amount</p>
                        <p className="text-3xl font-bold">{formatCurrency(totalAmount)}</p>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={gifts}
                loading={loading}
                emptyMessage="No gifts recorded yet"
            />

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Record Gift"
                footer={
                    <>
                        <button onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
                        <button onClick={handleCreate} className="btn-primary">Record</button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="label-field">Guest Name *</label>
                        <input
                            type="text"
                            value={form.guest_name}
                            onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))}
                            className="input-field"
                            placeholder="Guest name"
                        />
                    </div>
                    <div>
                        <label className="label-field">Amount (IDR) *</label>
                        <input
                            type="number"
                            value={form.amount || ''}
                            onChange={(e) => setForm((f) => ({ ...f, amount: parseInt(e.target.value) || 0 }))}
                            className="input-field"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="label-field">Bank Name *</label>
                        <select
                            value={form.bank_name}
                            onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                            className="select-field"
                        >
                            <option value="">Select bank</option>
                            <option value="BCA">BCA</option>
                            <option value="Mandiri">Mandiri</option>
                            <option value="BRI">BRI</option>
                            <option value="BNI">BNI</option>
                            <option value="CIMB">CIMB Niaga</option>
                            <option value="Cash">Cash</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
