import { useState, useEffect } from 'react';
import { HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';

interface MapPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { placeName: string; address: string; mapsUrl: string }) => void;
}

export function MapPickerModal({ isOpen, onClose, onConfirm }: MapPickerModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Selected state
    const [placeName, setPlaceName] = useState('');
    const [address, setAddress] = useState('');
    const [mapsUrl, setMapsUrl] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setPlaceName('');
            setAddress('');
            setMapsUrl('');
            setPreviewUrl('https://maps.google.com/maps?q=Jakarta&t=&z=13&ie=UTF8&iwloc=&output=embed');
        }
    }, [isOpen]);

    // Handle search via Nominatim (Free OpenStreetMap Geocoding)
    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();

            if (data && data.length > 0) {
                const firstResult = data[0];
                const lat = parseFloat(firstResult.lat);
                const lon = parseFloat(firstResult.lon);

                setPlaceName(firstResult.name || searchQuery);
                setAddress(firstResult.display_name);

                const finalQuery = firstResult.name ? `${firstResult.name}, ${firstResult.display_name}` : firstResult.display_name;
                const newMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(finalQuery)}`;
                setMapsUrl(newMapsUrl);

                setPreviewUrl(`https://maps.google.com/maps?q=${lat},${lon}&t=&z=15&ie=UTF8&iwloc=&output=embed`);
            } else {
                toast.error('Lokasi tidak ditemukan');
            }
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Gagal mencari lokasi');
        } finally {
            setIsSearching(false);
        }
    };

    const handleConfirm = () => {
        if (!placeName && !address) {
            toast.error('Silahkan cari dan pilih lokasi terlebih dahulu');
            return;
        }

        onConfirm({
            placeName: placeName,
            address: address,
            mapsUrl: mapsUrl
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Cari Lokasi</h2>
                        <p className="text-sm text-gray-500 max-w-xl mt-1">
                            Cari nama tempat, gedung, atau alamat untuk menghasilkan link Google Maps otomatis.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                        <HiOutlineX className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col md:flex-row min-h-[500px]">

                    {/* Map Area */}
                    <div className="flex-1 relative z-0 flex flex-col">
                        {/* Search Bar */}
                        <div className="p-4 bg-white dark:bg-gray-800 z-10">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative flex-1">
                                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Cari nama gedung, hotel, atau jalan..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-gold-500 text-gray-800 dark:text-gray-100"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="btn-primary px-6 disabled:opacity-75 rounded-xl"
                                >
                                    {isSearching ? 'Mencari...' : 'Cari'}
                                </button>
                            </form>
                        </div>

                        {/* Iframe Preview */}
                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 w-full h-full relative">
                            {previewUrl && (
                                <iframe
                                    src={previewUrl}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Map Preview"
                                />
                            )}
                        </div>
                    </div>

                    {/* Sidebar Results */}
                    <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-800/50 p-6 flex flex-col border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Lokasi Ditemukan</h3>

                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-400">Nama Tempat</label>
                                <div className="mt-1 text-gray-800 dark:text-gray-200 font-medium">
                                    {placeName || '-'}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-400">Detail Alamat</label>
                                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
                                    {address || '-'}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={!address}
                            className="w-full btn-primary py-3 mt-6 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                        >
                            Gunakan Lokasi Ini
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
