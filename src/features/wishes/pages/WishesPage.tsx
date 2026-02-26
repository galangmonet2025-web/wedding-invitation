import { useEffect, useState } from 'react';
import { wishApi } from '@/core/api/endpoints';
import { Modal } from '@/shared/components/Modal';
import { PageLoader } from '@/shared/components/Loading';
import type { Wish } from '@/types';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineHeart } from 'react-icons/hi';

export function WishesPage() {
    const [wishes, setWishes] = useState<Wish[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState({ guest_name: '', message: '' });

    useEffect(() => {
        fetchWishes();
    }, []);

    const fetchWishes = async () => {
        try {
            const response = await wishApi.getWishes();
            if (response.success) {
                setWishes(response.data);
            }
        } catch {
            toast.error('Failed to load wishes');
            setWishes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!form.guest_name || !form.message) {
            toast.error('Please fill in all fields');
            return;
        }
        try {
            const response = await wishApi.createWish(form);
            if (response.success) {
                toast.success('Wish added!');
                setShowAddModal(false);
                setForm({ guest_name: '', message: '' });
                fetchWishes();
            }
        } catch {
            toast.error('Failed to add wish');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await wishApi.deleteWish(id);
            toast.success('Wish removed');
            setWishes((w) => w.filter((wish) => wish.id !== id));
        } catch {
            toast.error('Failed to delete');
        }
    };

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Wedding Wishes</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{wishes.length} wishes received</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-2">
                    <HiOutlinePlus className="w-4 h-4" />
                    Add Wish
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishes.map((wish, index) => (
                    <div
                        key={wish.id}
                        className="card hover:shadow-gold group animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">{wish.guest_name[0]}</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-white">{wish.guest_name}</p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(wish.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(wish.id)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-all"
                            >
                                <HiOutlineTrash className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{wish.message}</p>
                        <div className="mt-3 flex items-center gap-1 text-gold-500">
                            <HiOutlineHeart className="w-4 h-4" />
                            <HiOutlineHeart className="w-3 h-3 opacity-60" />
                        </div>
                    </div>
                ))}
            </div>

            {wishes.length === 0 && (
                <div className="card text-center py-16">
                    <HiOutlineHeart className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500">No wishes yet. They will appear here once guests send their wishes.</p>
                </div>
            )}

            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add Wedding Wish"
                footer={
                    <>
                        <button onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
                        <button onClick={handleCreate} className="btn-primary">Add Wish</button>
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
                        <label className="label-field">Message *</label>
                        <textarea
                            value={form.message}
                            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                            className="input-field min-h-[120px] resize-none"
                            placeholder="Write a heartfelt message..."
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
