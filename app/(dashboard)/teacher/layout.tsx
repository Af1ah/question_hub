'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileText, LogOut, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/constants';
import styles from './layout.module.css';

interface TeacherLayoutProps {
    children: React.ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
    const router = useRouter();
    const { isAuthenticated, isTeacher, isLoading, logout, user } = useAuth();

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

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h2 className={styles.sidebarTitle}>Teacher Portal</h2>
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
