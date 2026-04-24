import { useState } from 'react';
import { Modal } from './Modal';
import { authApi } from '@/core/api/endpoints';
import toast from 'react-hot-toast';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Konfirmasi password tidak cocok');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Password minimal 6 karakter');
            return;
        }

        setLoading(true);
        try {
            const res = await authApi.changePassword({
                old_password: oldPassword,
                new_password: newPassword
            });

            if (res.success) {
                toast.success('Password berhasil diubah');
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
                onClose();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error('Terjadi kesalahan saat mengubah password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Ubah Password"
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password Lama
                    </label>
                    <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="input-field"
                        placeholder="Masukkan password saat ini"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password Baru
                    </label>
                    <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input-field"
                        placeholder="Minimal 6 karakter"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Konfirmasi Password Baru
                    </label>
                    <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field"
                        placeholder="Ulangi password baru"
                    />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-ghost"
                        disabled={loading}
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
