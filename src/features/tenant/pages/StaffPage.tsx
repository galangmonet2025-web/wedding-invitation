import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { staffApi } from '@/core/api/endpoints';
import { Modal } from '@/shared/components/Modal';
import { HiOutlineUserAdd, HiOutlineTrash, HiOutlineUserGroup, HiOutlineRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useStaffStore } from '../store/staffStore';

export function StaffPage() {
    const { user } = useAuthStore();
    const { staffs, loading: isLoading, fetchStaffs, addStaff, deleteStaff: deleteStaffInStore } = useStaffStore();

    // Form state
    const [isCreating, setIsCreating] = useState(false);
    const [staffToDelete, setStaffToDelete] = useState<{ id: string, username: string } | null>(null);
    const [formData, setFormData] = useState({ username: '', password: '' });

    useEffect(() => {
        fetchStaffs();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsCreating(true);
            const res = await staffApi.createStaff(formData);
            if (res.success) {
                toast.success('Staff account created successfully');
                addStaff(res.data); // Optimistic update
                setFormData({ username: '', password: '' });
            } else {
                toast.error(res.message || 'Failed to create staff');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error creating staff');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!staffToDelete) return;
        try {
            const res = await staffApi.deleteStaff(staffToDelete.id);
            if (res.success) {
                toast.success('Staff deleted successfully');
                deleteStaffInStore(staffToDelete.id); // Optimistic update
                setStaffToDelete(null);
            } else {
                toast.error(res.message || 'Failed to delete staff');
            }
        } catch (error) {
            toast.error('Error deleting staff');
        }
    };

    if (user?.role !== 'tenant_admin' && user?.role !== 'superadmin') {
        return <div className="p-6 text-center text-red-500">Access Denied</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>

                </div>
                <button
                    onClick={() => fetchStaffs(true)}
                    className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                    title="Refresh Data"
                >
                    <HiOutlineRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* CREATE FORM */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <HiOutlineUserAdd className="text-gold-500" />
                            Create Staff Account
                        </h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
                                    placeholder="e.g. resepsionis1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
                                    placeholder="Enter secure password"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full bg-gold-600 hover:bg-gold-700 text-white py-2 rounded-lg transition-colors font-medium disabled:opacity-50 mt-4"
                            >
                                {isCreating ? 'Creating...' : 'Create Account'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* STAFF LIST */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden p-0">
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Username
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Created On
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    {isLoading && staffs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                                                    Loading...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : staffs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No staff accounts found. Create one to get started!
                                            </td>
                                        </tr>
                                    ) : (
                                        staffs.map((staff) => (
                                            <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {staff.username}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                        Receptionist
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(staff.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => setStaffToDelete({ id: staff.id, username: staff.username })}
                                                        className="text-red-500 hover:text-red-700 transition-colors p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        title="Delete Staff"
                                                    >
                                                        <HiOutlineTrash className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards List View */}
                        <div className="block md:hidden p-2.5 space-y-2.5 bg-gray-50/30 dark:bg-wedding-dark/30">
                            {isLoading && staffs.length === 0 ? (
                                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                                        Loading...
                                    </div>
                                </div>
                            ) : staffs.length === 0 ? (
                                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                                    No staff accounts found. Create one to get started!
                                </div>
                            ) : (
                                staffs.map((staff) => (
                                    <div
                                        key={staff.id}
                                        className="card p-2.5 space-y-1.5 relative transition-all duration-300 border border-gray-100 dark:border-gray-800 bg-white dark:bg-wedding-dark-card shadow-sm"
                                    >
                                        {/* Header Row */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-6 h-6 rounded-full bg-gold-50 dark:bg-gold-950/20 flex items-center justify-center shrink-0">
                                                    <HiOutlineUserGroup className="w-3.5 h-3.5 text-gold-600 dark:text-gold-400" />
                                                </div>
                                                <div className="font-bold text-[13px] text-gray-900 dark:text-white truncate">
                                                    {staff.username}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="px-1.5 py-0.5 inline-flex text-[9px] leading-5 font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                                                    Receptionist
                                                </span>
                                                <button
                                                    onClick={() => setStaffToDelete({ id: staff.id, username: staff.username })}
                                                    className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    title="Delete Staff"
                                                >
                                                    <HiOutlineTrash className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Details Info */}
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
                                            <div className="space-y-0.5">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">
                                                    Created On
                                                </span>
                                                <span className="text-[10.5px] text-gray-655 dark:text-gray-300 font-semibold leading-tight">
                                                    {new Date(staff.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal Konfirmasi Hapus */}
            <Modal
                isOpen={!!staffToDelete}
                onClose={() => setStaffToDelete(null)}
                title="Hapus Akun Staff"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                        <div className="flex gap-3 text-red-800 dark:text-red-400">
                            <HiOutlineTrash className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold text-base mb-1">Konfirmasi Hapus</p>
                                <p>Apakah Anda yakin ingin menghapus akun staff <b>{staffToDelete?.username}</b>? Tindakan ini tidak dapat dibatalkan.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setStaffToDelete(null)} className="btn-ghost">Batal</button>
                        <button onClick={handleDelete} className="btn-danger py-2 px-6">Ya, Hapus</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
