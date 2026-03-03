import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
    HiOutlineHome,
    HiOutlineUsers,
    HiOutlineHeart,
    HiOutlineGift,
    HiOutlineClipboardList,
    HiOutlineCog,
    HiOutlineLogout,
    HiOutlineMenu,
    HiOutlineX,
    HiOutlineMoon,
    HiOutlineSun,
    HiOutlineOfficeBuilding,
    HiOutlineChartBar,
    HiOutlineDocumentText,
} from 'react-icons/hi';
import { useThemeStore } from '@/shared/hooks/useThemeStore';

export function DashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, tenant, logout } = useAuthStore();
    const { isDark, toggleTheme } = useThemeStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isSuperAdmin = user?.role === 'superadmin';

    const navItems = isSuperAdmin
        ? [
            { to: '/global-dashboard', icon: HiOutlineChartBar, label: 'Global Dashboard', roles: ['superadmin'] },
            { to: '/tenants', icon: HiOutlineOfficeBuilding, label: 'Manage Tenants', roles: ['superadmin'] },
            { to: '/activity', icon: HiOutlineClipboardList, label: 'System Activity', roles: ['superadmin'] },
        ]
        : [
            { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard', roles: ['tenant_admin', 'staff'] },
            { to: '/guests', icon: HiOutlineUsers, label: 'Guests', roles: ['tenant_admin', 'staff'] },
            { to: '/invitation-content', icon: HiOutlineDocumentText, label: 'Content Settings', roles: ['tenant_admin'] },
            { to: '/wishes', icon: HiOutlineHeart, label: 'Wishes', roles: ['tenant_admin'] },
            { to: '/gifts', icon: HiOutlineGift, label: 'Gifts', roles: ['tenant_admin'] },
            { to: '/activity', icon: HiOutlineClipboardList, label: 'Activity Log', roles: ['tenant_admin'] },
        ];

    const filteredNavItems = navItems.filter((item) => item.roles.includes(user?.role || ''));

    return (
        <div className={`min-h-screen flex ${isDark ? 'dark' : ''}`}>
            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-wedding-dark-card border-r border-gray-100 dark:border-gray-700 
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
            >
                {/* Logo */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
                            <span className="text-white font-display font-bold text-lg">W</span>
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-lg text-gray-800 dark:text-white">
                                Wedding<span className="text-gradient-gold">SaaS</span>
                            </h1>
                            <p className="text-xs text-gray-400">Platform Management</p>
                        </div>
                    </div>
                </div>

                {/* Tenant Info */}
                {tenant && !isSuperAdmin && (
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
                                <HiOutlineHeart className="w-4 h-4 text-gold-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                    {tenant.bride_name} & {tenant.groom_name}
                                </p>
                                <p className="text-xs text-gray-400">{tenant.domain_slug}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu</p>
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User Info & Actions */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{user?.username?.[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{user?.username}</p>
                            <p className="text-xs text-gold-500 capitalize">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="sidebar-link w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                    >
                        <HiOutlineLogout className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen bg-wedding-bg dark:bg-wedding-dark">
                {/* Topbar */}
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-wedding-dark-card/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between px-4 lg:px-8 h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <HiOutlineMenu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                                    {isSuperAdmin ? 'Super Admin Panel' : 'Wedding Dashboard'}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Dark Mode Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                                aria-label="Toggle dark mode"
                            >
                                {isDark ? (
                                    <HiOutlineSun className="w-5 h-5 text-gold-400" />
                                ) : (
                                    <HiOutlineMoon className="w-5 h-5 text-gray-500" />
                                )}
                            </button>

                            {/* User Badge */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gold-50 dark:bg-gold-900/20 rounded-full">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                <span className="text-xs font-medium text-gold-700 dark:text-gold-400 capitalize">
                                    {user?.role?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 lg:p-8">
                    <Outlet />
                </main>

                {/* Footer */}
                <footer className="px-8 py-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-center text-xs text-gray-400">
                        © 2026 Wedding SaaS Platform. Built with ❤️
                    </p>
                </footer>
            </div>
        </div>
    );
}
