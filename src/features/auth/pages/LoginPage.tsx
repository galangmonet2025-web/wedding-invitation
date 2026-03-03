import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '@/core/api/endpoints';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineHeart } from 'react-icons/hi';
import { LoadingOverlay } from '@/shared/components/Loading';

export function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim() || !password.trim()) {
            toast.error('Please fill in all fields');
            return;
        }

        // --- BACKDOOR SUPERADMIN LOGIN FOR DEVELOPMENT ---
        if (username === 'superadmin' && password === 'admin123') {
            const fakeSuperAdminUser = {
                id: 'super-123',
                username: 'superadmin',
                role: 'superadmin' as const,
                tenant_id: 'system',
                created_at: new Date().toISOString()
            };
            const mockTenant = {
                id: 'system',
                domain_slug: 'system',
                bride_name: 'System',
                groom_name: 'Admin',
                wedding_date: new Date().toISOString(),
                status_account: 'active' as const,
                package: 'premium' as const,
                plan_type: 'premium' as const,
                guest_limit: 1000,
                created_at: new Date().toISOString(),
                payment_deadline: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status_payment: 'Sudah dibayar' as const
            };
            setAuth('dummy-superadmin-token', fakeSuperAdminUser, mockTenant);
            toast.success('Welcome back, Super Admin! 👑');
            navigate('/global-dashboard');
            return;
        }
        // ------------------------------------------------

        setLoading(true);
        try {
            const response = await authApi.login({ username, password });
            if (response.success) {
                setAuth(response.data.token, response.data.user, response.data.tenant);
                toast.success('Welcome back! 🎉');
                if (response.data.user.role === 'superadmin') {
                    navigate('/global-dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                toast.error(response.message || 'Login failed');
            }
        } catch (error: unknown) {
            toast.error('Login failed (Check if backend API URL is configured in .env)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {loading && <LoadingOverlay message="Signing in..." />}

            {/* Left Panel - Decorative */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gold-500 via-gold-600 to-gold-800 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
                </div>
                <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
                    <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center mb-8 shadow-2xl">
                        <HiOutlineHeart className="w-10 h-10" />
                    </div>
                    <h1 className="text-4xl font-display font-bold mb-4 text-center">Wedding SaaS Platform</h1>
                    <p className="text-lg text-white/80 text-center max-w-md leading-relaxed">
                        Manage multiple wedding events with elegance. A complete digital wedding invitation management system.
                    </p>
                    <div className="mt-12 flex items-center gap-8">
                        <div className="text-center">
                            <p className="text-3xl font-bold">100+</p>
                            <p className="text-sm text-white/60">Active Weddings</p>
                        </div>
                        <div className="w-px h-12 bg-white/20" />
                        <div className="text-center">
                            <p className="text-3xl font-bold">10K+</p>
                            <p className="text-sm text-white/60">Guests Managed</p>
                        </div>
                        <div className="w-px h-12 bg-white/20" />
                        <div className="text-center">
                            <p className="text-3xl font-bold">99%</p>
                            <p className="text-sm text-white/60">Uptime</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-wedding-dark">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
                            <HiOutlineHeart className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-white">
                            Wedding<span className="text-gradient-gold">SaaS</span>
                        </h1>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-display font-bold text-gray-800 dark:text-white mb-2">Welcome Back</h2>
                        <p className="text-gray-500 dark:text-gray-400">Sign in to manage your wedding events</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="label-field">Username</label>
                            <div className="relative">
                                <HiOutlineMail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="input-field pl-12"
                                    placeholder="Enter your username"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="label-field">Password</label>
                            <div className="relative">
                                <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pl-12"
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 text-base"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-gold-600 hover:text-gold-700 font-medium transition-colors">
                                Register your wedding
                            </Link>
                        </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-center text-gray-400">
                            Demo credentials: <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">galang / galang</span> or <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">admin / admin123</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
