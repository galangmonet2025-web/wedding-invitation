import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { staffApi } from '@/core/api/endpoints';
import { HiOutlineUserAdd, HiOutlineTrash, HiOutlineUserGroup } from 'react-icons/hi';
import toast from 'react-hot-toast';

export function StaffPage() {
    const { user } = useAuthStore();
    const [staffs, setStaffs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '' });

    const fetchStaffs = async () => {
        try {
            setIsLoading(true);
            const res = await staffApi.getStaffs();
            if (res.success && res.data) {
                setStaffs(res.data);
            }
        } catch (error) {
            toast.error('Failed to load staff accounts');
        } finally {
            setIsLoading(false);
        }
    };

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
                setFormData({ username: '', password: '' });
                fetchStaffs();
            } else {
                toast.error(res.message || 'Failed to create staff');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error creating staff');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string, username: string) => {
        if (!window.confirm(`Are you sure you want to delete staff account "${username}"?`)) return;
        try {
            const res = await staffApi.deleteStaff(id);
            if (res.success) {
                toast.success('Staff deleted successfully');
                fetchStaffs();
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
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <HiOutlineUserGroup className="text-gold-500" />
                        Staff Management
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage receptionist accounts for scanning QR codes at the venue.
                    </p>
                </div>
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
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
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                Loading...
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
                                                        onClick={() => handleDelete(staff.id, staff.username)}
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
                    </div>
                </div>

            </div>
        </div>
    );
}
