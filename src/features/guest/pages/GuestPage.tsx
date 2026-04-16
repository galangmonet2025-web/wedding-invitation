import { useEffect, useState, useCallback, useMemo } from 'react';
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
    HiOutlineRefresh,
    HiOutlineUserGroup,
    HiOutlineSpeakerphone,
} from 'react-icons/hi';
import { GoogleContactModal } from '../components/GoogleContactModal';
import { WhatsAppBlastModal } from '../components/WhatsAppBlastModal';

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
        bulkCreateGuests,
    } = useGuestStore();

    const { user, tenant } = useAuthStore();
    const isStaff = user?.role === 'staff';

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showGoogleModal, setShowGoogleModal] = useState(false);
    const [showBlastModal, setShowBlastModal] = useState(false);
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

    const handleImportGoogleContacts = async (contacts: CreateGuestRequest[]) => {
        return await bulkCreateGuests(contacts);
    };

    const selectedGuestsObjects = useMemo(() => {
        return guests.filter(g => selectedIds.includes(g.id));
    }, [guests, selectedIds]);

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
        { key: 'number_of_guests', header: 'Jml. Tamu' },
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
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fetchGuests()} 
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gold-500 text-gray-400 hover:text-gold-500 rounded-xl transition-all shadow-sm"
                        title="Refresh Data"
                    >
                        <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {!isStaff && (
                        <>
                            <label className="btn-ghost cursor-pointer text-sm flex items-center gap-2">
                                <HiOutlineUpload className="w-4 h-4" />
                                Import
                                <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
                            </label>
                            <button onClick={handleExportCSV} className="btn-ghost text-sm flex items-center gap-2">
                                <HiOutlineDownload className="w-4 h-4" />
                                Export
                            </button>
                            <button 
                                onClick={() => setShowGoogleModal(true)} 
                                className="btn-ghost text-sm flex items-center gap-2 text-blue-600 hover:text-blue-700"
                                title="Import Google Contacts CSV"
                            >
                                <HiOutlineUserGroup className="w-4 h-4" />
                                Google Contacts (CSV)
                            </button>
                            <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-primary text-sm flex items-center gap-2">
                                <HiOutlinePlus className="w-4 h-4" />
                                Add Guest
                            </button>
                        </>
                    )}
                </div>
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
                    <button 
                        onClick={() => setShowBlastModal(true)} 
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <HiOutlineSpeakerphone className="w-4 h-4" />
                        WhatsApp Blast
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
                title="Guest QR Code & Link"
                size="lg"
            >
                {selectedGuest && (
                    <div className="flex flex-col md:flex-row gap-6 w-full h-full items-start">
                        {/* Kiri: QR Code & Detail Guest */}
                        <div className="flex flex-col items-center flex-1 w-full bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                                <QRCodeSVG
                                    value={selectedGuest.invitation_code}
                                    size={180}
                                    fgColor="#1A1A2E"
                                    bgColor="#FFFFFF"
                                    level="H"
                                />
                            </div>
                            <div className="text-center w-full">
                                <p className="font-semibold text-gray-800 dark:text-white text-xl">{selectedGuest.name}</p>
                                <p className="text-gold-600 font-mono text-sm mt-1 bg-gold-50 dark:bg-gold-900/20 px-3 py-1 rounded-full inline-block">{selectedGuest.invitation_code}</p>
                                <div className="mt-3">
                                    <span className="badge-gold">{selectedGuest.category}</span>
                                </div>
                            </div>

                            {tenant && (
                                <div className="w-full h-full text-left mt-6">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Link Undangan Khusus</p>
                                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-gold-500/20 transition-all">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${window.location.origin}/wedding-invitation/#/${tenant.domain_slug}?guestid=${selectedGuest.invitation_code}`}
                                            className="bg-transparent border-none text-xs w-full text-gray-600 dark:text-gray-300 focus:outline-none"
                                            onClick={(e) => e.currentTarget.select()}
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/wedding-invitation/#/${tenant.domain_slug}?guestid=${selectedGuest.invitation_code}`);
                                                toast.success('Link undangan disalin!');
                                            }}
                                            className="px-4 py-1.5 bg-gold-600 hover:bg-gold-700 text-white rounded outline-none text-xs font-medium transition-colors shrink-0 whitespace-nowrap shadow-sm"
                                        >
                                            Salin
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Kirim link ini ke tamu Anda via WhatsApp atau Email.</p>
                                </div>
                            )}
                        </div>

                        {/* Kanan: Link & Preview */}
                        {tenant && (
                            <div className="flex-[1.5] flex flex-col w-full h-full">
                                <div className="w-full ">
                                    {/* <p className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Preview Undangan</p> */}
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden h-[670px] w-full bg-gray-100 dark:bg-gray-900 shadow-inner relative group flex-shrink-0">
                                        <iframe
                                            src={`/wedding-invitation/#/${tenant.domain_slug}?guestid=${selectedGuest.invitation_code}`}
                                            className="w-full h-full border-none opacity-90 group-hover:opacity-100 transition-opacity"
                                            title="Live Preview"
                                        />
                                        <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded backdrop-blur-md pointer-events-none">
                                            Live
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
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

            {/* Google Contacts Modal */}
            <GoogleContactModal 
                isOpen={showGoogleModal}
                onClose={() => setShowGoogleModal(false)}
                onImport={handleImportGoogleContacts}
            />

            {/* WhatsApp Blast Modal */}
            <WhatsAppBlastModal 
                isOpen={showBlastModal}
                onClose={() => setShowBlastModal(false)}
                selectedGuests={selectedGuestsObjects}
                tenant={tenant}
            />
        </div>
    );
}
