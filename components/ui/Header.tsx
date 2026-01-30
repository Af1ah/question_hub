'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, X, User } from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES, SITE_NAME } from '@/constants';
import { debounce } from '@/lib/utils';
import styles from './Header.module.css';

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const pathname = usePathname();
    const router = useRouter();
    const { isAuthenticated, isAdmin, user, logout } = useAuth();

    const navLinks = [
        { href: ROUTES.HOME, label: 'Home' },
        { href: ROUTES.PAPERS, label: 'Browse Papers' },
    ];

    const debouncedSearch = useMemo(
        () => debounce((query: string) => {
            if (query.trim()) {
                router.push(`${ROUTES.PAPERS}?search=${encodeURIComponent(query)}`);
            }
        }, 300),
        [router]
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        debouncedSearch(value);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`${ROUTES.PAPERS}?search=${encodeURIComponent(searchQuery)}`);
            setIsMobileSearchOpen(false);
        }
    };

    const handleMobileSearchClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsMobileSearchOpen(true);
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 100);
    };

    const closeMobileSearch = () => {
        setIsMobileSearchOpen(false);
        setSearchQuery('');
    };

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    // Determine if we're on a page with light background (not home page)
    const isLightBackground = pathname !== '/';

    return (
        <header className={`${styles.header} ${isLightBackground ? styles.headerLight : ''}`}>
            <div className={styles.container}>
                {/* Logo */}
                <Link href={ROUTES.HOME} className={styles.logo}>
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
                    {/* Mobile Search Button */}
                    <button
                        className={styles.mobileSearchButton}
                        onClick={handleMobileSearchClick}
                        aria-label="Search"
                    >
                        <Search size={20} />
                    </button>

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

                {/* Mobile Search Overlay */}
                {isMobileSearchOpen && (
                    <div className={styles.mobileSearchOverlay}>
                        <form onSubmit={handleSearchSubmit} className={styles.mobileSearchForm}>
                            <div className={styles.mobileSearchWrapper}>
                                <Search className={styles.mobileSearchIcon} size={18} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    placeholder="Search papers..."
                                    className={styles.mobileSearchInput}
                                    aria-label="Search papers"
                                />
                                <button
                                    type="button"
                                    onClick={closeMobileSearch}
                                    className={styles.mobileSearchClose}
                                    aria-label="Close search"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </form>
                    </div>
                )}

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
