'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileText, LogOut, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants';
import styles from './layout.module.css';

interface TeacherLayoutProps {
    children: React.ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isTeacher, isLoading, logout, user } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);

    // Redirect if not authenticated or not teacher
    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !isTeacher)) {
            router.push(ROUTES.TEACHER_LOGIN);
        }
    }, [isAuthenticated, isTeacher, isLoading, router]);

    const handleLogout = async () => {
        await logout();
        router.push(ROUTES.TEACHER_LOGIN);
    };

    // Show nothing while checking auth
    if (isLoading || !isAuthenticated || !isTeacher) {
        return null;
    }

    const navItems = [
        { href: ROUTES.TEACHER_DASHBOARD, icon: Home, label: 'Dashboard' },
        { href: ROUTES.TEACHER_UPLOAD, icon: Upload, label: 'Upload Paper' },
        { href: ROUTES.TEACHER_PAPERS, icon: FileText, label: 'My Papers' },
    ];

    const isActiveRoute = (href: string) => {
        if (href === ROUTES.TEACHER_DASHBOARD) {
            return pathname === href;
        }
        return pathname?.startsWith(href);
    };

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${isExpanded ? styles.sidebarExpanded : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.sidebarLogo}>Q</div>
                    <h2 className={styles.sidebarTitle}>Teacher Portal</h2>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActiveRoute(item.href) ? styles.navItemActive : ''}`}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={styles.toggleButton}
                    aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{user?.name}</span>
                        <span className={styles.userRole}>Teacher</span>
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
