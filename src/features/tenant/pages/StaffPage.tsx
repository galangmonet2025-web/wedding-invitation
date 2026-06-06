import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { staffApi } from '@/core/api/endpoints';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { HiOutlinePlus, HiOutlineUserAdd, HiOutlineTrash, HiOutlineUserGroup, HiOutlineRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useStaffStore } from '../store/staffStore';
import { useTranslation } from 'react-i18next';

export function StaffPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { staffs, loading: isLoading, fetchStaffs, addStaff, deleteStaff: deleteStaffInStore } = useStaffStore();

    // Modals visibility state
    const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
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
                toast.success(t('staff.create_success', 'Akun staff berhasil dibuat'));
                addStaff(res.data); // Optimistic update
                setFormData({ username: '', password: '' });
                setIsCreatingModalOpen(false); // Close modal on success
            } else {
                toast.error(res.message || t('staff.create_failed', 'Gagal membuat akun staff'));
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('staff.create_error', 'Terjadi kesalahan saat membuat akun staff'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!staffToDelete) return;
        try {
            const res = await staffApi.deleteStaff(staffToDelete.id);
            if (res.success) {
                toast.success(t('staff.delete_success', 'Akun staff berhasil dihapus'));
                deleteStaffInStore(staffToDelete.id); // Optimistic update
                setStaffToDelete(null);
            } else {
                toast.error(res.message || t('staff.delete_failed', 'Gagal menghapus akun staff'));
            }
        } catch (error) {
            toast.error(t('staff.delete_error', 'Terjadi kesalahan saat menghapus akun staff'));
        }
    };

    if (user?.role !== 'tenant_admin' && user?.role !== 'superadmin') {
        return <div className="p-6 text-center text-red-500 font-bold">{t('common.access_denied', 'Akses Ditolak')}</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>

                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => fetchStaffs(true)}
                        className="p-2.5 bg-white dark:bg-wedding-dark-card border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm flex items-center justify-center"
                        title="Refresh Data"
                    >
                        <HiOutlineRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <Button
                        onClick={() => setIsCreatingModalOpen(true)}
                        className="text-sm shrink-0"
                        icon={<HiOutlinePlus className="w-4 h-4" />}
                    >
                        {t('staff.create_title', 'Buat Akun Staff Baru')}
                    </Button>
                </div>
            </div>

            {/* Full Width Staff Table / Cards */}
            <div className="bg-white dark:bg-wedding-dark-card rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden p-0">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('staff.username', 'Username')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('staff.role', 'Peran')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('staff.created_on', 'Dibuat Pada')}
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('staff.actions', 'Aksi')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-wedding-dark-card">
                            {isLoading && staffs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                                            {t('common.loading', 'Memuat...')}
                                        </div>
                                    </td>
                                </tr>
                            ) : staffs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-550 dark:text-gray-400">
                                        {t('staff.empty_message', 'Tidak ada akun staff ditemukan. Buat akun pertama untuk memulai!')}
                                    </td>
                                </tr>
                            ) : (
                                staffs.map((staff) => (
                                    <tr key={staff.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-semibold text-gray-800 dark:text-gray-300">
                                                {staff.username}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20">
                                                {t('staff.receptionist_badge', 'Penerima Tamu')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                                            {new Date(staff.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => setStaffToDelete({ id: staff.id, username: staff.username })}
                                                className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                                                title={t('staff.delete_tooltip', 'Hapus Staff')}
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
                <div className="block md:hidden p-3 space-y-3 bg-gray-50/30 dark:bg-wedding-dark/30">
                    {isLoading && staffs.length === 0 ? (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
                                {t('common.loading', 'Memuat...')}
                            </div>
                        </div>
                    ) : staffs.length === 0 ? (
                        <div className="py-8 text-center text-gray-550 dark:text-gray-400">
                            {t('staff.empty_message', 'Tidak ada akun staff ditemukan. Buat akun pertama untuk memulai!')}
                        </div>
                    ) : (
                        staffs.map((staff) => (
                            <div
                                key={staff.id}
                                className="card p-4 space-y-3 relative transition-all duration-300 border border-gray-100 dark:border-gray-800 bg-white dark:bg-wedding-dark-card shadow-sm"
                            >
                                {/* Header Row */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-gold-50 dark:bg-gold-950/20 flex items-center justify-center shrink-0">
                                            <HiOutlineUserGroup className="w-4 h-4 text-gold-600 dark:text-gold-400" />
                                        </div>
                                        <div className="font-bold text-sm text-gray-850 dark:text-white truncate">
                                            {staff.username}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setStaffToDelete({ id: staff.id, username: staff.username })}
                                        className="text-red-500 hover:text-red-700 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                                        title={t('staff.delete_tooltip', 'Hapus Staff')}
                                    >
                                        <HiOutlineTrash className="w-4.5 h-4.5" />
                                    </button>
                                </div>

                                {/* Details Info */}
                                <div className="pt-2 border-t border-gray-50 dark:border-gray-800/80 flex justify-between items-center">
                                    <div className="space-y-0.5">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                                            {t('staff.created_on', 'Dibuat Pada')}
                                        </span>
                                        <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold leading-tight">
                                            {new Date(staff.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <span className="px-2.5 py-0.5 inline-flex text-[10px] font-bold rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20">
                                        {t('staff.receptionist_badge', 'Penerima Tamu')}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* CREATE POPUP DIALOG / MODAL */}
            <Modal
                isOpen={isCreatingModalOpen}
                onClose={() => {
                    setIsCreatingModalOpen(false);
                    setFormData({ username: '', password: '' });
                }}
                title={t('staff.create_title', 'Buat Akun Staff Baru')}
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                            {t('staff.username', 'Username')}
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-650 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
                            placeholder={t('staff.username_placeholder', 'contoh: resepsionis1')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                            {t('staff.password', 'Password')}
                        </label>
                        <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-650 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
                            placeholder={t('staff.password_placeholder', 'Masukkan password yang aman')}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150 dark:border-gray-700 mt-6">
                        <button
                            type="button"
                            onClick={() => {
                                setIsCreatingModalOpen(false);
                                setFormData({ username: '', password: '' });
                            }}
                            className="btn-ghost"
                        >
                            {t('common.cancel', 'Batal')}
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="btn-primary py-2 px-6"
                        >
                            {isCreating ? t('staff.creating', 'Membuat...') : t('staff.create_button', 'Buat Akun')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Konfirmasi Hapus */}
            <ConfirmDialog
                isOpen={!!staffToDelete}
                onClose={() => setStaffToDelete(null)}
                onConfirm={handleDelete}
                title={t('staff.delete_modal_title', 'Hapus Akun Staff')}
                warningTitle={t('staff.delete_modal_title', 'Hapus Akun Staff')}
                variant="danger"
                cancelLabel={t('common.cancel', 'Batal')}
                confirmLabel={t('common.yes_delete', 'Ya, Hapus')}
                message={<p>{t('staff.delete_warning', 'Apakah Anda yakin ingin menghapus akun staff')} <b>{staffToDelete?.username}</b>? {t('staff.delete_warning_desc', 'Tindakan ini tidak dapat dibatalkan dan akun staff tidak akan dapat digunakan lagi.')}</p>}
            />
        </div>
    );
}
