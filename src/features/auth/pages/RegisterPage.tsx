import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '@/core/api/endpoints';
import toast from 'react-hot-toast';
import { HiOutlineHeart, HiOutlineUser, HiOutlineLockClosed, HiOutlineCalendar, HiOutlineGlobe } from 'react-icons/hi';
import { LoadingOverlay } from '@/shared/components/Loading';

export function RegisterPage() {
    const [form, setForm] = useState({
        bride_name: '',
        groom_name: '',
        wedding_date: '',
        domain_slug: '',
        username: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [isAutoSlug, setIsAutoSlug] = useState(true);
    const [isCheckingSlug, setIsCheckingSlug] = useState(false);
    const [slugStatus, setSlugStatus] = useState({ message: '', isConflict: false });
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const generateSmartSlug = useCallback((groom: string, bride: string) => {
        const prefixes = ['muhammad', 'mohammad', 'moh', 'ahmad', 'achmad', 'made', 'nyoman', 'ketut', 'wayan', 'gede', 'putu', 'agus', 'abdul', 'siti', 'sri', 'cut', 'ni', 'luh', 'maria', 'anastasia', 'nur', 'ade'];

        const getFirstName = (fullName: string) => {
            if (!fullName.trim()) return '';
            const parts = fullName.trim().toLowerCase().split(/\s+/);
            if (parts.length > 1 && prefixes.includes(parts[0])) {
                return parts[1];
            }
            return parts[0];
        };

        const g = getFirstName(groom);
        const b = getFirstName(bride);

        if (!g && !b) return '';
        if (!g) return b;
        if (!b) return g;
        return `${g}-${b}`;
    }, []);

    // Effect for auto-slug generation and availability check
    useEffect(() => {
        if (!isAutoSlug || (!form.groom_name && !form.bride_name)) {
            if (isAutoSlug) setForm(prev => ({ ...prev, domain_slug: '' }));
            return;
        }

        setIsCheckingSlug(true);
        const timer = setTimeout(async () => {
            const baseSlug = generateSmartSlug(form.groom_name, form.bride_name);
            if (!baseSlug) {
                setIsCheckingSlug(false);
                return;
            }

            // Try male-female first
            try {
                const res1 = await authApi.checkSlug(baseSlug);
                if (res1.success && res1.data.available) {
                    setForm(prev => ({ ...prev, domain_slug: baseSlug }));
                    setSlugStatus({ message: '', isConflict: false });
                    return;
                }

                // If taken, try female-male
                const reversedParts = baseSlug.split('-');
                if (reversedParts.length === 2) {
                    const reversedSlug = `${reversedParts[1]}-${reversedParts[0]}`;
                    const res2 = await authApi.checkSlug(reversedSlug);
                    if (res2.success && res2.data.available) {
                        setForm(prev => ({ ...prev, domain_slug: reversedSlug }));
                        setSlugStatus({ message: '', isConflict: false });
                        return;
                    }
                }

                // Both taken
                setSlugStatus({
                    message: 'Kedua kombinasi slug (pria-wanita & wanita-pria) sudah dipakai. Silakan isi slug manual.',
                    isConflict: true
                });
                setIsAutoSlug(false); // Enable manual input
            } catch (error) {
                console.error('Slug check failed', error);
            } finally {
                setIsCheckingSlug(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [form.groom_name, form.bride_name, isAutoSlug, generateSmartSlug]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (Object.values(form).some((v) => !v.trim())) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const response = await authApi.registerTenant(form);
            if (response.success) {
                setAuth(response.data.token, response.data.user, response.data.tenant);
                toast.success('Wedding registered successfully! 🎊');
                navigate('/private/dashboard');
            } else {
                toast.error(response.message || 'Registration failed');
            }
        } catch (error: unknown) {
            toast.error('Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {loading && <LoadingOverlay message="Creating your wedding..." />}

            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gold-600 via-gold-500 to-gold-700 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-10 right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-10 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
                    <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center mb-8 shadow-2xl">
                        <HiOutlineHeart className="w-10 h-10" />
                    </div>
                    <h1 className="text-4xl font-display font-bold mb-4 text-center">Mulai Perjalanan Anda</h1>
                    <p className="text-lg text-white/80 text-center max-w-md leading-relaxed">
                        Buat platform pernikahan digital Anda dan kelola segalanya mulai dari undangan hingga check-in tamu.
                    </p>
                    <div className="mt-12 grid grid-cols-2 gap-6 text-sm">
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            Manajemen Tamu
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            Check-in QR
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            Pelacakan Hadiah
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            Dasbor Analitik
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Registration Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-wedding-dark overflow-y-auto">
                <div className="w-full max-w-md">
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
                            <HiOutlineHeart className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-3xl font-display font-bold text-gray-800 dark:text-white mb-2">Daftar Pernikahan</h2>
                        <p className="text-gray-500 dark:text-gray-400">Buat platform undangan pernikahan digital Anda</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">

                            <div>
                                <label htmlFor="groom_name" className="label-field">Nama Mempelai Pria</label>
                                <input
                                    id="groom_name"
                                    name="groom_name"
                                    type="text"
                                    value={form.groom_name}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Groom"
                                />
                            </div>
                            <div>
                                <label htmlFor="bride_name" className="label-field">Nama Mempelai Wanita</label>
                                <input
                                    id="bride_name"
                                    name="bride_name"
                                    type="text"
                                    value={form.bride_name}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Bride"
                                />
                            </div>

                        </div>

                        <div>
                            <label htmlFor="wedding_date" className="label-field">Tanggal Pernikahan</label>
                            <div className="relative">
                                <HiOutlineCalendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="wedding_date"
                                    name="wedding_date"
                                    type="date"
                                    value={form.wedding_date}
                                    onChange={handleChange}
                                    className="input-field pl-12"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="domain_slug" className="label-field !mb-0">Slug Domain</label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={isAutoSlug}
                                        onChange={(e) => {
                                            setIsAutoSlug(e.target.checked);
                                            if (e.target.checked) setSlugStatus({ message: '', isConflict: false });
                                        }}
                                        className="w-4 h-4 rounded border-gray-300 text-gold-600 focus:ring-gold-500 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-gold-600 transition-colors uppercase tracking-wider">Isi Otomatis</span>
                                </label>
                            </div>
                            <div className="relative">
                                <HiOutlineGlobe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="domain_slug"
                                    name="domain_slug"
                                    type="text"
                                    value={form.domain_slug}
                                    onChange={handleChange}
                                    disabled={isAutoSlug}
                                    className={`input-field pl-12 pr-10 ${isAutoSlug ? 'bg-gray-50/50 cursor-not-allowed opacity-80' : ''}`}
                                    placeholder="bride-and-groom"
                                />
                                {isCheckingSlug && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-gold-500/20 border-t-gold-500 rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            {slugStatus.message && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-800">
                                    {slugStatus.message}
                                </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                                URL: {window.location.host}{window.location.pathname}#/<span className="text-gold-500 font-medium">{form.domain_slug || 'your-slug'}</span>
                            </p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Akun Admin</p>
                        </div>

                        <div>
                            <label htmlFor="reg-username" className="label-field">Username</label>
                            <div className="relative">
                                <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="reg-username"
                                    name="username"
                                    type="text"
                                    value={form.username}
                                    onChange={handleChange}
                                    className="input-field pl-12"
                                    placeholder="Admin username"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="reg-password" className="label-field">Kata Sandi</label>
                            <div className="relative">
                                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="reg-password"
                                    name="password"
                                    type="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    className="input-field pl-12"
                                    placeholder="Min 6 characters"
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-2">
                            {loading ? 'Membuat...' : 'Buat Platform Pernikahan'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Sudah punya akun?{' '}
                            <Link to="/login" className="text-gold-600 hover:text-gold-700 font-medium transition-colors">
                                Masuk
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
