import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { guestApi } from '@/core/api/endpoints';
import {
    HiOutlineQrcode,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineUpload
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { HiOutlinePlus, HiOutlineSave, HiOutlineTrash, HiOutlineSwitchVertical } from 'react-icons/hi';

interface ManualGuest {
    id: string;
    name: string;
    category: string;
    phone: string;
    pax: number;
    status: 'draft' | 'saving' | 'saved';
    created_at: number;
}

export function ScannerPage() {
    const { user, tenant } = useAuthStore();
    const navigate = useNavigate();
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Save scanning state to ref for valid unmount cleanup
    const isScanningRef = useRef(false);
    useEffect(() => {
        isScanningRef.current = isScanning;
    }, [isScanning]);

    // Prevent spam API calls
    const isProcessingRef = useRef(false);
    const lastScannedCodeRef = useRef<{ code: string; time: number } | null>(null);

    // Manual Input State
    const [manualGuests, setManualGuests] = useState<ManualGuest[]>([]);
    const [sortBy, setSortBy] = useState<'name' | 'time'>('time');
    const [isSaving, setIsSaving] = useState(false);

    // Ensure only Staff and Tenant Admin can access
    useEffect(() => {
        if (user?.role !== 'staff' && user?.role !== 'tenant_admin') {
            navigate('/dashboard');
            toast.error('Unauthorized access to Scanner.');
        }
    }, [user, navigate]);

    useEffect(() => {
        // Initialize Scanner Instance
        scannerRef.current = new Html5Qrcode("qr-reader");

        return () => {
            // Cleanup on unmount
            if (isScanningRef.current && scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const processQRCode = async (decodedText: string) => {
        if (isProcessingRef.current) return;

        // Prevent scanning the EXACT SAME code within 3 seconds
        const now = Date.now();
        if (
            lastScannedCodeRef.current &&
            lastScannedCodeRef.current.code === decodedText &&
            now - lastScannedCodeRef.current.time < 3000
        ) {
            return;
        }

        isProcessingRef.current = true;
        lastScannedCodeRef.current = { code: decodedText, time: now };

        try {
            // Stop scanning temporarily
            if (isScanning && scannerRef.current) {
                await scannerRef.current.stop();
                setIsScanning(false);
            }

            const res = await guestApi.checkinGuest(decodedText);

            if (res.success && res.data) {
                setScanResult({
                    success: true,
                    message: res.message || 'Check-in Berhasil',
                    data: {
                        name: res.data.name,
                        category: res.data.category,
                        pax: res.data.number_of_guests
                    }
                });
                toast.success(`Berhasil Check-in: ${res.data.name}`);
            } else {
                setScanResult({
                    success: false,
                    message: res.message || 'QR Code Tidak Valid'
                });
                toast.error(res.message || 'Invalid QR Code');
            }
        } catch (error: any) {
            setScanResult({
                success: false,
                message: error.response?.data?.message || 'Error processing QR Code'
            });
            toast.error('Terjadi kesalahan saat check-in');
        } finally {
            isProcessingRef.current = false;
        }
    };

    const startCamera = async () => {
        setScanResult(null);
        if (!scannerRef.current) return;

        try {
            await scannerRef.current.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText: string) => processQRCode(decodedText),
                (errorMessage: string) => {
                    // ignore frequent read errors during scanning
                }
            );
            setIsScanning(true);
        } catch (err) {
            toast.error('Could not access camera. Please check permissions.');
        }
    };

    const stopCamera = async () => {
        if (scannerRef.current && isScanning) {
            await scannerRef.current.stop();
            setIsScanning(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setScanResult(null);
            const file = e.target.files[0];
            if (scannerRef.current) {
                try {
                    const decodedText = await scannerRef.current.scanFile(file, true);
                    processQRCode(decodedText);
                } catch (err) {
                    toast.error('Tidak dapat membaca QR Code dari gambar yang diunggah.');
                }
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setScanResult(null);
            const file = e.dataTransfer.files[0];
            if (scannerRef.current) {
                try {
                    const decodedText = await scannerRef.current.scanFile(file, true);
                    processQRCode(decodedText);
                } catch (err) {
                    toast.error('Tidak dapat membaca QR Code dari gambar yang ditarik.');
                }
            }
        }
    };

    // Paste handler for clipboard images
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (e.clipboardData && e.clipboardData.items) {
                for (let i = 0; i < e.clipboardData.items.length; i++) {
                    if (e.clipboardData.items[i].type.indexOf('image') !== -1) {
                        const file = e.clipboardData.items[i].getAsFile();
                        if (file && scannerRef.current) {
                            try {
                                const decodedText = await scannerRef.current.scanFile(file, true);
                                processQRCode(decodedText);
                            } catch (err) {
                                toast.error('Tidak dapat membaca QR Code dari gambar yang di-paste.');
                            }
                        }
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    // Manual Input Handlers
    const handleAddRow = () => {
        const newRow: ManualGuest = {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            name: '',
            category: 'Tamu Undangan Umum',
            phone: '',
            pax: 1,
            status: 'draft',
            created_at: Date.now()
        };
        // Add to top
        setManualGuests([newRow, ...manualGuests]);
    };

    const handleUpdateRow = (id: string, field: keyof ManualGuest, value: any) => {
        setManualGuests(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
    };

    const handleRemoveRow = (id: string) => {
        setManualGuests(prev => prev.filter(g => g.id !== id));
    };

    const handleSaveManual = async () => {
        const drafts = manualGuests.filter(g => g.status === 'draft');
        if (drafts.length === 0) return;

        // Validate
        const invalid = drafts.find(g => !g.name.trim() || !g.category.trim());
        if (invalid) {
            toast.error("Nama dan Kategori harus diisi untuk semua baris yang belum tersimpan.");
            return;
        }

        setIsSaving(true);
        let successCount = 0;

        // Update status to saving
        setManualGuests(prev => prev.map(g => g.status === 'draft' ? { ...g, status: 'saving' } : g));

        // Save sequentially to avoid race conditions and handle individual errors
        for (const guest of drafts) {
            try {
                // Send shorthand dynamic payload (simulating scanner behavior for uninvited checkin)
                const payload = `NEW_GUEST:${guest.name.trim()}:${guest.category.trim()}:${guest.phone.trim()}:${guest.pax}`;
                const res = await guestApi.checkinGuest(payload);

                if (res.success) {
                    setManualGuests(prev => prev.map(g => g.id === guest.id ? { ...g, status: 'saved' } : g));
                    successCount++;
                } else {
                    toast.error(`Gagal menyimpan ${guest.name}: ${res.message}`);
                    setManualGuests(prev => prev.map(g => g.id === guest.id ? { ...g, status: 'draft' } : g));
                }
            } catch (err: any) {
                toast.error(`Error menyimpan ${guest.name}`);
                setManualGuests(prev => prev.map(g => g.id === guest.id ? { ...g, status: 'draft' } : g));
            }
        }

        setIsSaving(false);
        if (successCount > 0) {
            toast.success(`Berhasil menyimpan ${successCount} tamu manual.`);
        }
    };

    // Sorting logic: Drafts always on top, then sort the rest
    const sortedManualGuests = [...manualGuests].sort((a, b) => {
        if (a.status === 'draft' && b.status !== 'draft') return -1;
        if (a.status !== 'draft' && b.status === 'draft') return 1;

        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else {
            // Sort by checkin time descending (newest first)
            return b.created_at - a.created_at;
        }
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in" onDragOver={handleDragOver} onDrop={handleDrop}>
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center justify-center gap-2">
                    <HiOutlineQrcode className="text-gold-500 w-8 h-8" />
                    Buku Tamu & Scanner Kehadiran
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Pindai QR Code tamu atau catat kehadiran tamu secara manual.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 items-start">
                {/* Left Column: Scanner */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 text-center space-y-6">
                        <h2 className="font-semibold text-lg text-gray-800 dark:text-white mb-4">Scanner QR</h2>

                        {/* Camera Feed Container */}
                        <div className="w-full max-w-sm mx-auto min-h-[300px] bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center relative">
                            {/* Inner element strictly for Html5Qrcode, NO REACT CHILDREN */}
                            <div id="qr-reader" className="w-full h-full absolute inset-0 z-0"></div>

                            {!isScanning && (
                                <div className="z-10 text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 w-full h-full absolute inset-0 pointer-events-none">
                                    <HiOutlineQrcode className="w-16 h-16 mb-2 opacity-50" />
                                    <p>Kamera Nonaktif</p>
                                    <p className="text-xs mt-1">Atau Seret/Paste gambar QR ke halaman ini</p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            {!isScanning ? (
                                <button
                                    onClick={startCamera}
                                    className="w-full sm:w-auto px-6 py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-xl transition-colors font-medium shadow-md shadow-gold-500/20"
                                >
                                    Aktifkan Kamera Scanner
                                </button>
                            ) : (
                                <button
                                    onClick={stopCamera}
                                    className="w-full sm:w-auto px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium shadow-md shadow-red-500/20"
                                >
                                    Tutup Kamera
                                </button>
                            )}

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full sm:w-auto px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                <HiOutlineUpload className="w-5 h-5" />
                                Upload Gambar QR
                            </button>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>

                        {/* Result Banner */}
                        {scanResult && (
                            <div className={`mt-6 p-6 rounded-xl animate-scale-in text-left border ${scanResult.success
                                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
                                : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                }`}>
                                <div className="flex items-start gap-4">
                                    {scanResult.success ? (
                                        <HiOutlineCheckCircle className="w-10 h-10 text-emerald-500 shrink-0 mt-1" />
                                    ) : (
                                        <HiOutlineXCircle className="w-10 h-10 text-red-500 shrink-0 mt-1" />
                                    )}
                                    <div>
                                        <h3 className={`text-xl font-bold ${scanResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'} mb-1`}>
                                            {scanResult.message}
                                        </h3>

                                        {scanResult.success && scanResult.data && (
                                            <div className="mt-3 space-y-1 text-gray-700 dark:text-gray-300">
                                                <p className="font-medium text-lg text-gray-900 dark:text-white">
                                                    {scanResult.data.name}
                                                </p>
                                                <p className="text-sm">
                                                    Kategori: <span className="font-semibold">{scanResult.data.category}</span>
                                                </p>
                                                <p className="text-sm">
                                                    Status check-in tercatat pada sistem.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setScanResult(null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                        if (scannerRef.current && !isScanning) {
                                            try { scannerRef.current.clear(); } catch (e) { }
                                        }
                                    }}
                                    className={`mt-4 w-full py-2 rounded-lg font-medium transition-colors ${scanResult.success
                                        ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-100 hover:bg-emerald-200 dark:hover:bg-emerald-700'
                                        : 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-100 hover:bg-red-200 dark:hover:bg-red-700'
                                        }`}
                                >
                                    Scan Tamu Berikutnya
                                </button>
                            </div>
                        )}

                    </div>
                </div>

                
            </div>

            {/* Right Column: Manual Input Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full min-h-[500px]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="font-semibold text-lg text-gray-800 dark:text-white">Input Manual</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Catat tamu yang hadir tanpa QR Code</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setSortBy(sortBy === 'name' ? 'time' : 'name')}
                            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            title="Ganti Urutan (Nama / Waktu)"
                        >
                            <HiOutlineSwitchVertical className="w-4 h-4" />
                            Sort: {sortBy === 'name' ? 'Nama' : 'Waktu'}
                        </button>
                        <button
                            onClick={handleAddRow}
                            className="flex-1 sm:flex-none px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors shadow-sm"
                        >
                            <HiOutlinePlus className="w-4 h-4" />
                            Tambah Baris
                        </button>
                    </div>
                </div>

                <div className="p-0 overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama (Wajib)</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">No. Telp</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Jumlah Tamu</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {sortedManualGuests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                        Belum ada data manual.<br />Klik <b>Tambah Baris</b> untuk mencatat tamu.
                                    </td>
                                </tr>
                            ) : (
                                sortedManualGuests.map((guest) => (
                                    <tr key={guest.id} className={`${guest.status === 'saved' ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : 'bg-white dark:bg-gray-800'}`}>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            {guest.status === 'saved' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Tersimpan</span>}
                                            {guest.status === 'saving' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Menyimpan..</span>}
                                            {guest.status === 'draft' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">Belum Disimpan</span>}
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={guest.name}
                                                onChange={(e) => handleUpdateRow(guest.id, 'name', e.target.value)}
                                                disabled={guest.status === 'saved' || guest.status === 'saving'}
                                                placeholder="Nama Tamu"
                                                className="w-full min-w-[120px] px-2 py-1 text-sm bg-transparent border-b border-gray-200 dark:border-gray-600 focus:border-gold-500 focus:ring-0 disabled:opacity-75 disabled:border-transparent"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <select
                                                value={guest.category}
                                                onChange={(e) => handleUpdateRow(guest.id, 'category', e.target.value)}
                                                disabled={guest.status === 'saved' || guest.status === 'saving'}
                                                className="w-full min-w-[140px] px-2 py-1 text-sm bg-transparent border-b border-gray-200 dark:border-gray-600 focus:border-gold-500 focus:ring-0 disabled:opacity-75 disabled:border-transparent"
                                            >
                                                <option value="Keluarga Laki-laki">Keluarga Laki-laki</option>
                                                <option value="Keluarga Perempuan">Keluarga Perempuan</option>
                                                <option value="Teman/Rekan Kerja">Teman/Rekan Kerja</option>
                                                <option value="Tamu Undangan Umum">Tamu Undangan Umum</option>
                                                <option value="VIP">VIP</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                type="text"
                                                value={guest.phone}
                                                onChange={(e) => handleUpdateRow(guest.id, 'phone', e.target.value)}
                                                disabled={guest.status === 'saved' || guest.status === 'saving'}
                                                placeholder="Opsional"
                                                className="w-full min-w-[100px] px-2 py-1 text-sm bg-transparent border-b border-gray-200 dark:border-gray-600 focus:border-gold-500 focus:ring-0 disabled:opacity-75 disabled:border-transparent"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleUpdateRow(guest.id, 'pax', Math.max(1, guest.pax - 1))}
                                                    disabled={guest.status === 'saved' || guest.status === 'saving' || guest.pax <= 1}
                                                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-600 dark:text-gray-300 transition-colors"
                                                >
                                                    -
                                                </button>
                                                <span className="text-sm font-semibold w-6 text-center">{guest.pax}</span>
                                                <button
                                                    onClick={() => handleUpdateRow(guest.id, 'pax', guest.pax + 1)}
                                                    disabled={guest.status === 'saved' || guest.status === 'saving'}
                                                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-600 dark:text-gray-300 transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            {guest.status !== 'saved' && (
                                                <button
                                                    onClick={() => handleRemoveRow(guest.id)}
                                                    disabled={guest.status === 'saving'}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Hapus baris"
                                                >
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Save Button */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                    <p className="text-xs text-gray-500 flex-1">
                        {manualGuests.filter(g => g.status === 'draft').length} baris belum disimpan.
                    </p>
                    <button
                        onClick={handleSaveManual}
                        disabled={isSaving || manualGuests.filter(g => g.status === 'draft').length === 0}
                        className="px-6 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-gold-500/20"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <HiOutlineSave className="w-4 h-4" />
                        )}
                        Simpan ke Database
                    </button>
                </div>
            </div>
        </div>
    );
}
