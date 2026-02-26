import { useEffect, useState, useCallback } from 'react';
import { useGuestStore } from '../store/guestStore';
import { DataTable, Column } from '@/shared/components/DataTable';
import { Pagination } from '@/shared/components/Pagination';
import { Modal } from '@/shared/components/Modal';
import type { Guest, CreateGuestRequest, GuestStatus } from '@/types';
import { useAuthStore } from '@/features/auth/store/authStore';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineFilter,
    HiOutlineTrash,
    HiOutlinePencil,
    HiOutlineQrcode,
    HiOutlineDownload,
    HiOutlineUpload,
} from 'react-icons/hi';

export function GuestPage() {
    const {
        guests,
        total,
        totalPages,
        loading,
        filters,
        selectedIds,
        setFilters,
        setSelectedIds,
        fetchGuests,
        createGuest,
        updateGuest,
        deleteGuest,
        bulkDelete,
    } = useGuestStore();

    const { user } = useAuthStore();
    const isStaff = user?.role === 'staff';

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const [form, setForm] = useState<CreateGuestRequest>({
        name: '',
        phone: '',
        category: 'Friends',
        status: 'pending',
        number_of_guests: 1,
    });

    useEffect(() => {
        fetchGuests();
    }, [filters.page, filters.status, filters.category]);

    const debouncedSearch = useCallback(
        (() => {
            let timeout: ReturnType<typeof setTimeout>;
            return (value: string) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    setFilters({ search: value, page: 1 });
                    fetchGuests();
                }, 400);
            };
        })(),
        []
    );

    const handleAdd = async () => {
        if (!form.name.trim()) {
            toast.error('Guest name is required');
            return;
        }
        const success = await createGuest(form);
        if (success) {
            setShowAddModal(false);
            resetForm();
        }
    };

    const handleEdit = async () => {
        if (!selectedGuest) return;
        const success = await updateGuest({ id: selectedGuest.id, ...form });
        if (success) {
            setShowEditModal(false);
            setSelectedGuest(null);
            resetForm();
        }
    };

    const handleDeleteConfirm = async () => {
        if (deleteTargetId) {
            await deleteGuest(deleteTargetId);
        }
        setShowDeleteConfirm(false);
        setDeleteTargetId(null);
    };

    const handleBulkDelete = async () => {
        await bulkDelete();
    };

    const resetForm = () => {
        setForm({ name: '', phone: '', category: 'Friends', status: 'pending', number_of_guests: 1 });
    };

    const openEditModal = (guest: Guest) => {
        setSelectedGuest(guest);
        setForm({
            name: guest.name,
            phone: guest.phone,
            category: guest.category,
            status: guest.status,
            number_of_guests: guest.number_of_guests,
        });
        setShowEditModal(true);
    };

    const openQRModal = (guest: Guest) => {
        setSelectedGuest(guest);
        setShowQRModal(true);
    };

    const handleExportCSV = () => {
        const csvContent = [
            ['Name', 'Phone', 'Category', 'Status', 'Number of Guests', 'Invitation Code', 'Check-in'].join(','),
            ...guests.map((g) =>
                [g.name, g.phone, g.category, g.status, g.number_of_guests, g.invitation_code, g.checkin_status].join(',')
            ),
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'guests.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('CSV exported successfully');
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').slice(1);
            const imported = lines
                .filter((line) => line.trim())
                .map((line) => {
                    const [name, phone, category, status, number_of_guests] = line.split(',');
                    return {
                        name: name?.trim() || '',
                        phone: phone?.trim() || '',
                        category: category?.trim() || 'Friends',
                        status: (status?.trim() || 'pending') as GuestStatus,
                        number_of_guests: parseInt(number_of_guests?.trim() || '1') || 1,
                    };
                });
            toast.success(`${imported.length} guests ready to import`);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const statusBadge = (status: string) => {
        const classes: Record<string, string> = {
            confirmed: 'badge-success',
            declined: 'badge-danger',
            pending: 'badge-warning',
        };
        return <span className={classes[status] || 'badge-info'}>{status}</span>;
    };

    const checkinBadge = (status: string) => {
        return status === 'checked_in' ? (
            <span className="badge-success">Checked In</span>
        ) : (
            <span className="badge-info">Not Yet</span>
        );
    };

    const columns: Column<Guest>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (g: Guest) => (
                <div>
                    <p className="font-medium text-gray-800 dark:text-white">{g.name}</p>
                    <p className="text-xs text-gray-400">{g.invitation_code}</p>
                </div>
            ),
        },
        { key: 'phone', header: 'Phone' },
        {
            key: 'category',
            header: 'Category',
            render: (g: Guest) => <span className="badge-gold">{g.category}</span>,
        },
        {
            key: 'status',
            header: 'RSVP',
            render: (g: Guest) => statusBadge(g.status),
        },
        { key: 'number_of_guests', header: 'Pax' },
        {
            key: 'checkin_status',
            header: 'Check-in',
            render: (g: Guest) => checkinBadge(g.checkin_status),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (g: Guest) => (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => openQRModal(g)}
                        className="p-1.5 rounded-lg hover:bg-gold-50 dark:hover:bg-gold-900/20 text-gold-600 transition-colors"
                        title="QR Code"
                    >
                        <HiOutlineQrcode className="w-4 h-4" />
                    </button>
                    {!isStaff && (
                        <>
                            <button
                                onClick={() => openEditModal(g)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                                title="Edit"
                            >
                                <HiOutlinePencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => {
                                    setDeleteTargetId(g.id);
                                    setShowDeleteConfirm(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                title="Delete"
                            >
                                <HiOutlineTrash className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    const guestFormFields = (
        <div className="space-y-4">
            <div>
                <label className="label-field">Guest Name *</label>
                <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="input-field"
                    placeholder="Full name"
                />
            </div>
            <div>
                <label className="label-field">Phone</label>
                <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="input-field"
                    placeholder="08xx-xxxx-xxxx"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="label-field">Category</label>
                    <select
                        value={form.category}
                        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                        className="select-field"
                    >
                        <option value="Family">Family</option>
                        <option value="Friends">Friends</option>
                        <option value="Work">Work</option>
                        <option value="VIP">VIP</option>
                    </select>
                </div>
                <div>
                    <label className="label-field">RSVP Status</label>
                    <select
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as GuestStatus }))}
                        className="select-field"
                    >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="declined">Declined</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="label-field">Number of Guests</label>
                <input
                    type="number"
                    min={1}
                    max={10}
                    value={form.number_of_guests}
                    onChange={(e) => setForm((f) => ({ ...f, number_of_guests: parseInt(e.target.value) || 1 }))}
                    className="input-field"
                />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">Guest Management</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {total} guests total
                    </p>
                </div>
                {!isStaff && (
                    <div className="flex items-center gap-2">
                        <label className="btn-ghost cursor-pointer text-sm flex items-center gap-2">
                            <HiOutlineUpload className="w-4 h-4" />
                            Import
                            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                        </label>
                        <button onClick={handleExportCSV} className="btn-ghost text-sm flex items-center gap-2">
                            <HiOutlineDownload className="w-4 h-4" />
                            Export
                        </button>
                        <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-primary text-sm flex items-center gap-2">
                            <HiOutlinePlus className="w-4 h-4" />
                            Add Guest
                        </button>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="card">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search guests..."
                            className="input-field pl-10"
                            onChange={(e) => debouncedSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ status: e.target.value as GuestStatus | '', page: 1 })}
                            className="select-field w-auto"
                        >
                            <option value="">All Status</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="declined">Declined</option>
                            <option value="pending">Pending</option>
                        </select>
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters({ category: e.target.value, page: 1 })}
                            className="select-field w-auto"
                        >
                            <option value="">All Categories</option>
                            <option value="Family">Family</option>
                            <option value="Friends">Friends</option>
                            <option value="Work">Work</option>
                            <option value="VIP">VIP</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.length > 0 && !isStaff && (
                <div className="flex items-center gap-4 px-4 py-3 bg-gold-50 dark:bg-gold-900/20 rounded-xl border border-gold-200 dark:border-gold-800">
                    <span className="text-sm font-medium text-gold-700 dark:text-gold-400">
                        {selectedIds.length} selected
                    </span>
                    <button onClick={handleBulkDelete} className="btn-danger text-sm py-1.5 px-4">
                        <HiOutlineTrash className="w-4 h-4 inline mr-1" />
                        Delete Selected
                    </button>
                    <button onClick={() => setSelectedIds([])} className="btn-ghost text-sm py-1.5">
                        Clear
                    </button>
                </div>
            )}

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={guests}
                loading={loading}
                emptyMessage="No guests found"
                selectedIds={!isStaff ? selectedIds : undefined}
                onSelectChange={!isStaff ? setSelectedIds : undefined}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    page={filters.page}
                    totalPages={totalPages}
                    onPageChange={(p) => setFilters({ page: p })}
                    total={total}
                    limit={filters.limit}
                />
            )}

            {/* Add Guest Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Guest"
                footer={
                    <>
                        <button onClick={() => setShowAddModal(false)} className="btn-ghost">Cancel</button>
                        <button onClick={handleAdd} className="btn-primary">Add Guest</button>
                    </>
                }
            >
                {guestFormFields}
            </Modal>

            {/* Edit Guest Modal */}
            <Modal
                isOpen={showEditModal}
                onClose={() => { setShowEditModal(false); setSelectedGuest(null); }}
                title="Edit Guest"
                footer={
                    <>
                        <button onClick={() => { setShowEditModal(false); setSelectedGuest(null); }} className="btn-ghost">Cancel</button>
                        <button onClick={handleEdit} className="btn-primary">Save Changes</button>
                    </>
                }
            >
                {guestFormFields}
            </Modal>

            {/* QR Code Modal */}
            <Modal
                isOpen={showQRModal}
                onClose={() => { setShowQRModal(false); setSelectedGuest(null); }}
                title="Guest QR Code"
                size="sm"
            >
                {selectedGuest && (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="p-6 bg-white rounded-2xl shadow-lg">
                            <QRCodeSVG
                                value={selectedGuest.invitation_code}
                                size={200}
                                fgColor="#1A1A2E"
                                bgColor="#FFFFFF"
                                level="H"
                            />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-gray-800 dark:text-white text-lg">{selectedGuest.name}</p>
                            <p className="text-gold-600 font-mono text-sm mt-1">{selectedGuest.invitation_code}</p>
                            <span className="badge-gold mt-2 inline-block">{selectedGuest.category}</span>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }}
                title="Delete Guest"
                size="sm"
                footer={
                    <>
                        <button onClick={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }} className="btn-ghost">Cancel</button>
                        <button onClick={handleDeleteConfirm} className="btn-danger">Delete</button>
                    </>
                }
            >
                <p className="text-gray-600 dark:text-gray-300">
                    Are you sure you want to delete this guest? This action cannot be undone.
                </p>
            </Modal>
        </div>
    );
}
