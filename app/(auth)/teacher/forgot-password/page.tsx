'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ROUTES, SITE_NAME } from '@/constants';
import styles from './page.module.css';

export default function TeacherForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/teachers/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setMessage(data.message || 'Password reset link sent.');
            } else {
                setStatus('error');
                setMessage(data.error || 'Failed to send reset link.');
            }
        } catch (err) {
            setStatus('error');
            setMessage('An unexpected error occurred. Please try again later.');
        }
    };

    if (status === 'success') {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.successIconWrapper}>
                            <CheckCircle2 size={48} className={styles.successIcon} />
                        </div>
                        <h2 className={styles.title}>Check your email</h2>
                        <p className={styles.subtitle}>{message}</p>
                        <Link href="/teacher/login" className={styles.submitButton} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {/* Branding */}
                <div className={styles.branding}>
                    <h1 className={styles.brandTitle}>{SITE_NAME}</h1>
                    <p className={styles.brandSubtitle}>Teacher Portal</p>
                </div>

                {/* Reset Card */}
                <div className={styles.card}>
                    <Link href="/teacher/login" className={styles.backButton}>
                        <ArrowLeft size={20} />
                    </Link>
                    <h2 className={styles.title}>Reset Password</h2>
                    <p className={styles.subtitle}>
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {/* Error Message */}
                        {status === 'error' && (
                            <div className={styles.error}>
                                {message}
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
                                    placeholder="teacher@example.com"
                                    className={styles.input}
                                    required
                                    autoComplete="email"
                                    disabled={status === 'loading'}
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={status === 'loading' || !email}
                            className={styles.submitButton}
                        >
                            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
