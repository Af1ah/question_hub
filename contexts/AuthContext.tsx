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
            console.log('[AuthContext] Sync Triggered. Token present:', !!token);

            if (token && auth) {
                try {
                    // Only sign in if different user or not signed in
                    const currentUser = auth.currentUser;
                    console.log('[AuthContext] Current Firebase User:', currentUser?.uid, 'Session User:', session?.user.id);

                    if (!currentUser || currentUser.uid !== session?.user.id) {
                        console.log('[AuthContext] Signing in with custom token...');
                        const { signInWithCustomToken } = await import('firebase/auth');
                        await signInWithCustomToken(auth, token);
                        console.log('[AuthContext] Firebase Sign In Successful');
                    } else {
                        console.log('[AuthContext] Already signed in as correct user.');
                    }
                } catch (err) {
                    console.error('[AuthContext] Firebase Auth Sync Error:', err);
                }
            } else {
                console.log('[AuthContext] No token or auth instance available.');
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
