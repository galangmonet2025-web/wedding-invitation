import { useState } from 'react';
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
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

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
                navigate('/dashboard');
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
                    <h1 className="text-4xl font-display font-bold mb-4 text-center">Start Your Journey</h1>
                    <p className="text-lg text-white/80 text-center max-w-md leading-relaxed">
                        Create your digital wedding platform and manage everything from invitations to guest check-ins.
                    </p>
                    <div className="mt-12 grid grid-cols-2 gap-6 text-sm">
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            Guest Management
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            QR Check-in
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            Gift Tracking
                        </div>
                        <div className="flex items-center gap-2 text-white/80">
                            <div className="w-2 h-2 rounded-full bg-white/60" />
                            Analytics Dashboard
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
                        <h2 className="text-3xl font-display font-bold text-gray-800 dark:text-white mb-2">Register Wedding</h2>
                        <p className="text-gray-500 dark:text-gray-400">Create your digital wedding invitation platform</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="bride_name" className="label-field">Bride Name</label>
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
                            <div>
                                <label htmlFor="groom_name" className="label-field">Groom Name</label>
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
                        </div>

                        <div>
                            <label htmlFor="wedding_date" className="label-field">Wedding Date</label>
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
                            <label htmlFor="domain_slug" className="label-field">Domain Slug</label>
                            <div className="relative">
                                <HiOutlineGlobe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="domain_slug"
                                    name="domain_slug"
                                    type="text"
                                    value={form.domain_slug}
                                    onChange={handleChange}
                                    className="input-field pl-12"
                                    placeholder="bride-and-groom"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">URL: yoursite.com/<span className="text-gold-500">{form.domain_slug || 'your-slug'}</span></p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Admin Account</p>
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
                            <label htmlFor="reg-password" className="label-field">Password</label>
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
                            {loading ? 'Creating...' : 'Create Wedding Platform'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Already have an account?{' '}
                            <Link to="/login" className="text-gold-600 hover:text-gold-700 font-medium transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
