'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Upload, FileText, Settings, LogOut, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants';
import styles from './layout.module.css';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouter();
    const { isAuthenticated, isAdmin, isLoading, logout, user } = useAuth();

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
        { href: ROUTES.ADMIN_TEACHERS, icon: Users, label: 'Teachers' },
        { href: ROUTES.ADMIN_BULK_UPLOAD, icon: Upload, label: 'Bulk Upload' },
    ];

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h2 className={styles.sidebarTitle}>Admin Dashboard</h2>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={styles.navItem}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{user?.name}</span>
                        <span className={styles.userRole}>Administrator</span>
                    </div>
                    <button onClick={handleLogout} className={styles.logoutButton}>
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
