'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Users, Upload, FileText, LogOut, Home, Building2, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants';
import styles from './layout.module.css';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isAdmin, isLoading, logout, user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);

    // Redirect if not authenticated or not admin
    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !isAdmin)) {
            router.push(ROUTES.ADMIN_LOGIN);
        }
    }, [isAuthenticated, isAdmin, isLoading, router]);

    const handleLogout = async () => {
        await logout();
        router.push(ROUTES.ADMIN_LOGIN);
    };

    // Show nothing while checking auth
    if (isLoading || !isAuthenticated || !isAdmin) {
        return null;
    }

    const navItems = [
        { href: ROUTES.ADMIN_DASHBOARD, icon: Home, label: 'Dashboard' },
        { href: ROUTES.ADMIN_TEACHERS, icon: Users, label: 'Users' },
        { href: '/admin/papers', icon: FileText, label: 'Papers' },
        { href: '/admin/departments', icon: Building2, label: 'Departments' },
        { href: ROUTES.ADMIN_BULK_UPLOAD, icon: Upload, label: 'Bulk Upload' },
        { href: '/admin/upload', icon: Upload, label: 'Upload Paper' },
    ];

    const isActiveRoute = (href: string) => {
        if (href === ROUTES.ADMIN_DASHBOARD) {
            return pathname === href;
        }
        return pathname?.startsWith(href);
    };

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside
                className={`${styles.sidebar} ${isExpanded ? styles.sidebarExpanded : ''}`}
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
            >
                <div className={styles.sidebarHeader}>
                    <div className={styles.sidebarLogo}>Q</div>
                    {isExpanded && <h2 className={styles.sidebarTitle}>Admin Panel</h2>}
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActiveRoute(item.href) ? styles.navItemActive : ''}`}
                            title={!isExpanded ? item.label : ''}
                        >
                            <item.icon size={20} />
                            {isExpanded && <span>{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <button onClick={handleLogout} className={styles.logoutButton} title="Logout">
                        <LogOut size={18} />
                        {isExpanded && <span>Logout</span>}
                    </button>
                    {isExpanded && (
                        <div className={styles.userInfo}>
                            <span className={styles.userName}>{user?.name}</span>
                            <span className={styles.userRole}>Administrator</span>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
