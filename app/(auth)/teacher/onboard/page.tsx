'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ROUTES, SITE_NAME } from '@/constants';
import styles from './page.module.css';

interface TokenVerification {
    valid: boolean;
    email: string;
    displayName: string;
    teacherId: string;
}

function TeacherOnboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [verifying, setVerifying] = useState(true);
    const [tokenData, setTokenData] = useState<TokenVerification | null>(null);
    const [tokenError, setTokenError] = useState('');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Verify token on mount
    useEffect(() => {
        if (!token) {
            setVerifying(false);
            setTokenError('Invalid invitation link. Please check your email.');
            return;
        }

        const verifyToken = async () => {
            try {
                const response = await fetch('/api/teachers/verify-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const data = await response.json();

                if (response.ok && data.valid) {
                    setTokenData(data);
                } else {
                    setTokenError(data.error || 'Invalid invitation link');
                }
            } catch {
                setTokenError('Failed to verify invitation. Please try again.');
            } finally {
                setVerifying(false);
            }
        };

        verifyToken();
    }, [token]);

    // Password validation
    const passwordRequirements = [
        { met: password.length >= 8, text: 'At least 8 characters' },
        { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
        { met: /[a-z]/.test(password), text: 'One lowercase letter' },
        { met: /[0-9]/.test(password), text: 'One number' },
    ];

    const isPasswordValid = passwordRequirements.every((req) => req.met);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isPasswordValid) {
            setError('Please meet all password requirements');
            return;
        }

        if (!passwordsMatch) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/teachers/complete-onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push(ROUTES.TEACHER_LOGIN);
                }, 3000);
            } else {
                setError(data.error || 'Failed to complete setup');
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (verifying) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.loadingState}>
                            <Loader2 className={styles.spinner} size={48} />
                            <p>Verifying your invitation...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (tokenError) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.branding}>
                        <h1 className={styles.brandTitle}>{SITE_NAME}</h1>
                        <p className={styles.brandSubtitle}>Teacher Onboarding</p>
                    </div>
                    <div className={styles.card}>
                        <div className={styles.errorState}>
                            <XCircle className={styles.errorIcon} size={48} />
                            <h2 className={styles.title}>Invitation Error</h2>
                            <p className={styles.errorText}>{tokenError}</p>
                            <Link href={ROUTES.HOME} className={styles.backButton}>
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.branding}>
                        <h1 className={styles.brandTitle}>{SITE_NAME}</h1>
                        <p className={styles.brandSubtitle}>Teacher Onboarding</p>
                    </div>
                    <div className={styles.card}>
                        <div className={styles.successState}>
                            <CheckCircle className={styles.successIcon} size={48} />
                            <h2 className={styles.title}>Account Created!</h2>
                            <p className={styles.successText}>
                                Your account is ready. Redirecting to login...
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Onboarding form
    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.branding}>
                    <h1 className={styles.brandTitle}>{SITE_NAME}</h1>
                    <p className={styles.brandSubtitle}>Teacher Onboarding</p>
                </div>

                <div className={styles.card}>
                    <h2 className={styles.title}>Complete Your Account</h2>
                    <p className={styles.subtitle}>
                        Welcome, <strong>{tokenData?.displayName}</strong>! Create a password for your account.
                    </p>

                    <div className={styles.emailBadge}>
                        {tokenData?.email}
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && (
                            <div className={styles.error}>
                                {error}
                            </div>
                        )}

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
                                    placeholder="Create a strong password"
                                    className={styles.input}
                                    required
                                    autoComplete="new-password"
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

                        {/* Password Requirements */}
                        <div className={styles.requirements}>
                            {passwordRequirements.map((req, index) => (
                                <div
                                    key={index}
                                    className={`${styles.requirement} ${req.met ? styles.requirementMet : ''}`}
                                >
                                    {req.met ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                    <span>{req.text}</span>
                                </div>
                            ))}
                        </div>

                        {/* Confirm Password */}
                        <div className={styles.field}>
                            <label htmlFor="confirmPassword" className={styles.label}>
                                Confirm Password
                            </label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} size={18} />
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password"
                                    className={`${styles.input} ${confirmPassword && (passwordsMatch ? styles.inputValid : styles.inputInvalid)}`}
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className={styles.togglePassword}
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {confirmPassword && !passwordsMatch && (
                                <span className={styles.fieldError}>Passwords do not match</span>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !isPasswordValid || !passwordsMatch}
                            className={styles.submitButton}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <Link href={ROUTES.TEACHER_LOGIN} className={styles.backLink}>
                        Already have an account? Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function TeacherOnboardPage() {
    return (
        <Suspense fallback={
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.loadingState}>
                            <Loader2 className={styles.spinner} size={48} />
                            <p>Loading...</p>
                        </div>
                    </div>
                </div>
            </div>
        }>
            <TeacherOnboardContent />
        </Suspense>
    );
}
