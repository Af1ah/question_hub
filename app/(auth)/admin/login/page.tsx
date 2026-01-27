'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES, SITE_NAME } from '@/constants';
import styles from './page.module.css';

export default function AdminLoginPage() {
    const router = useRouter();
    const { login, isLoading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [keepSignedIn, setKeepSignedIn] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(email, password, 'admin');

            if (result.success) {
                router.push(ROUTES.ADMIN_DASHBOARD);
            } else {
                setError(result.error || 'Invalid credentials');
            }
        } catch (err) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {/* Branding */}
                <div className={styles.branding}>
                    <h1 className={styles.brandTitle}>{SITE_NAME}</h1>
                    <p className={styles.brandSubtitle}>Admin Portal</p>
                </div>

                {/* Login Card */}
                <div className={styles.card}>
                    <h2 className={styles.title}>Admin Login</h2>
                    <p className={styles.subtitle}>
                        Enter your credentials to access the admin dashboard
                    </p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {/* Error Message */}
                        {error && (
                            <div className={styles.error}>
                                {error}
                            </div>
                        )}

                        {/* Email */}
                        <div className={styles.field}>
                            <label htmlFor="email" className={styles.label}>
                                Email
                            </label>
                            <div className={styles.inputWrapper}>
                                <Mail className={styles.inputIcon} size={18} />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    className={styles.input}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className={styles.field}>
                            <label htmlFor="password" className={styles.label}>
                                Password
                            </label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={18} />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={styles.input}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={styles.togglePassword}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Keep Signed In */}
                        <div className={styles.checkbox}>
                            <input
                                id="keepSignedIn"
                                type="checkbox"
                                checked={keepSignedIn}
                                onChange={(e) => setKeepSignedIn(e.target.checked)}
                                className={styles.checkboxInput}
                            />
                            <label htmlFor="keepSignedIn" className={styles.checkboxLabel}>
                                Keep me signed in
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || isLoading}
                            className={styles.submitButton}
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Back Link */}
                    <Link href={ROUTES.HOME} className={styles.backLink}>
                        ← Back to Gallery
                    </Link>
                </div>
            </div>
        </div>
    );
}
