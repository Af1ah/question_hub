'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { AuthUser, UserRole } from '@/types';
import { auth } from '@/lib/firebase/config';

// ============================================================
// Auth Context Types
// ============================================================

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isTeacher: boolean;
    login: (email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

// ============================================================
// Auth Context
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// Auth Provider
// ============================================================

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { data: session, status } = useSession();

    // Sign in to Firebase Auth when session has a token
    React.useEffect(() => {
        const syncFirebase = async () => {
            // @ts-ignore - session type extension might not be picked up immediately
            const token = session?.firebaseToken;

            if (token && auth) {
                try {
                    // Only sign in if different user or not signed in
                    const currentUser = auth.currentUser;

                    if (!currentUser || currentUser.uid !== session?.user.id) {
                        const { signInWithCustomToken } = await import('firebase/auth');
                        await signInWithCustomToken(auth, token);
                    }
                } catch (err: unknown) {
                    console.error('[AuthContext] Firebase Auth Sync Error:', err);
                    
                    // Handle token expiry or invalid token errors
                    const errorCode = (err as { code?: string })?.code;
                    if (
                        errorCode === 'auth/invalid-custom-token' ||
                        errorCode === 'auth/custom-token-expired' ||
                        errorCode === 'auth/argument-error'
                    ) {
                        console.log('[AuthContext] Token expired or invalid, signing out...');
                        // Sign out from Firebase
                        try {
                            const { signOut: firebaseSignOut } = await import('firebase/auth');
                            await firebaseSignOut(auth);
                        } catch (signOutErr) {
                            console.error('[AuthContext] Firebase sign out error:', signOutErr);
                        }
                        // Sign out from NextAuth - this will clear the session and force re-login
                        await signOut({ redirect: true, callbackUrl: '/teacher/login' });
                    }
                }
            } else if (!token && auth?.currentUser) {
                // No session token but Firebase is signed in - sign out of Firebase
                try {
                    const { signOut: firebaseSignOut } = await import('firebase/auth');
                    await firebaseSignOut(auth);
                } catch (signOutErr) {
                    console.error('[AuthContext] Firebase sign out error:', signOutErr);
                }
            }
        };
        syncFirebase();
    }, [session]);

    const isLoading = status === 'loading';
    const isAuthenticated = !!session?.user;

    const user: AuthUser | null = session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
        }
        : null;

    const isAdmin = user?.role === 'admin';
    const isTeacher = user?.role === 'teacher';

    const login = async (
        email: string,
        password: string,
        role: UserRole
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const providerId = role === 'admin' ? 'admin-login' : 'teacher-login';

            const result = await signIn(providerId, {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                return { success: false, error: result.error };
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Login failed',
            };
        }
    };

    const logout = async (): Promise<void> => {
        await signOut({ redirect: false });
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                isAdmin,
                isTeacher,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ============================================================
// useAuth Hook
// ============================================================

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}

// ============================================================
// Auth Guard Components
// ============================================================

interface AuthGuardProps {
    children: ReactNode;
    fallback?: ReactNode;
    requiredRole?: UserRole;
}

export function AuthGuard({ children, fallback, requiredRole }: AuthGuardProps) {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        return fallback || <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return fallback || null;
    }

    if (requiredRole && user?.role !== requiredRole) {
        return fallback || null;
    }

    return <>{children}</>;
}

export function AdminGuard({ children, fallback }: Omit<AuthGuardProps, 'requiredRole'>) {
    return (
        <AuthGuard requiredRole="admin" fallback={fallback}>
            {children}
        </AuthGuard>
    );
}

export function TeacherGuard({ children, fallback }: Omit<AuthGuardProps, 'requiredRole'>) {
    return (
        <AuthGuard requiredRole="teacher" fallback={fallback}>
            {children}
        </AuthGuard>
    );
}
