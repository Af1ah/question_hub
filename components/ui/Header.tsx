'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES, SITE_NAME } from '@/constants';
import styles from './Header.module.css';

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();
    const { isAuthenticated, isAdmin, isTeacher, user, logout } = useAuth();

    const navLinks = [
        { href: ROUTES.HOME, label: 'Home' },
        { href: ROUTES.PAPERS, label: 'Browse Papers' },
    ];

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                {/* Logo */}
                <Link href={ROUTES.HOME} className={styles.logo}>
                    <span className={styles.logoIcon}>📚</span>
                    <span className={styles.logoText}>{SITE_NAME}</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className={styles.desktopNav}>
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`${styles.navLink} ${isActive(link.href) ? styles.navLinkActive : ''}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Right Section */}
                <div className={styles.rightSection}>
                    {/* Auth Button */}
                    {isAuthenticated ? (
                        <div className={styles.userMenu}>
                            <Link
                                href={isAdmin ? ROUTES.ADMIN_DASHBOARD : ROUTES.TEACHER_DASHBOARD}
                                className={styles.userButton}
                            >
                                <User size={18} />
                                <span>{user?.name || 'Dashboard'}</span>
                            </Link>
                        </div>
                    ) : (
                        <Link href={ROUTES.TEACHER_LOGIN} className={styles.loginButton}>
                            Teacher Login
                        </Link>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        className={styles.menuToggle}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <nav className={styles.mobileNav}>
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`${styles.mobileNavLink} ${isActive(link.href) ? styles.mobileNavLinkActive : ''}`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className={styles.mobileNavDivider} />
                        {isAuthenticated ? (
                            <>
                                <Link
                                    href={isAdmin ? ROUTES.ADMIN_DASHBOARD : ROUTES.TEACHER_DASHBOARD}
                                    className={styles.mobileNavLink}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={() => {
                                        logout();
                                        setIsMenuOpen(false);
                                    }}
                                    className={styles.mobileLogoutButton}
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link
                                href={ROUTES.TEACHER_LOGIN}
                                className={styles.mobileNavLink}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Teacher Login
                            </Link>
                        )}
                    </nav>
                )}
            </div>
        </header>
    );
}
