import crypto from 'crypto';
import { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { COLLECTIONS } from '@/constants';
import { User as AppUser, UserRole } from '@/types';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// ============================================================
// Extended Types for NextAuth
// ============================================================

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    departmentId?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      departmentId?: string;
    };
    accessToken?: string;
    firebaseToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    departmentId?: string;
    accessToken?: string;
    firebaseToken?: string;
  }
}

// ============================================================
// Firebase Admin Initialization for Auth
// ============================================================

let adminDb: Firestore | null = null;
let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId) {
    throw new Error('Firebase project ID is required');
  }

  if (getApps().length === 0) {
    if (clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      adminApp = initializeApp({ projectId });
    }
  } else {
      adminApp = getApps()[0];
  }

  return adminApp;
}

function getAdminDb(): Firestore {
  if (adminDb) return adminDb;
  getAdminApp(); // Ensure app is initialized
  adminDb = getFirestore();
  return adminDb;
}

// ============================================================
// Auth Helper Functions
// ============================================================

async function findUserByEmail(email: string): Promise<AppUser | null> {
  try {
    console.log(`[Auth] Finding user ${email}...`);
    const db = getAdminDb();
    // Query the unified USERS collection
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
        console.log(`[Auth] No user found for ${email}`);
        return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    console.log('[Auth] User found:', doc.id, data.role);
    return { id: doc.id, ...data } as unknown as AppUser;
  } catch (error) {
    console.error('[Auth] Error finding user:', error);
    if (error instanceof Error) console.error(error.stack);
    return null;
  }
}

// ============================================================
// NextAuth Configuration
// ============================================================

export const authOptions: NextAuthOptions = {
  // ============================================================
  // Session Strategy - JWT for stateless authentication
  // ============================================================
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60,  // Update token every 24 hours
  },

  // ============================================================
  // JWT Configuration
  // ============================================================
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  // ============================================================
  // Cookie Configuration - Secure settings
  // ============================================================
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.callback-url`,
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  // ============================================================
  // Authentication Providers
  // ============================================================
  providers: [
    // Admin Credentials Provider
    CredentialsProvider({
      id: 'admin-login',
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        console.log('Attempting Admin Login:', credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await findUserByEmail(credentials.email);
        
        if (!user) {
             console.log('Admin Login Failed: User not found');
             throw new Error('Invalid credentials');
        }
        
        // Check if user exists, has a password hash, and is an ADMIN
        if (!user.passwordHash || user.role !== 'admin') {
          console.log('Admin Login Failed: Role/Hash mismatch', { role: user.role, hasHash: !!user.passwordHash });
          throw new Error('Invalid credentials');
        }

        const isValidPassword = await compare(credentials.password, user.passwordHash);

        if (!isValidPassword) {
          console.log('Admin Login Failed: Password mismatch');
          throw new Error('Invalid credentials');
        }

        if (user.isLocked) {
             console.log('Admin Login Failed: Locked');
             throw new Error('Account is locked');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: 'admin',
          departmentId: user.departmentId,
        };
      },
    }),

    // Teacher Credentials Provider
    CredentialsProvider({
      id: 'teacher-login',
      name: 'Teacher Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        console.log('Attempting Teacher Login:', credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await findUserByEmail(credentials.email);
        
        // Check if user exists, has password hash, and is a TEACHER
        if (!user) {
          console.log('Teacher Login Failed: User not found');
          throw new Error('Invalid credentials');
        }

        if (!user.passwordHash) {
          console.log('Teacher Login Failed: No password hash (user might not have completed onboarding)');
          throw new Error('Invalid credentials');
        }

        if (user.role !== 'teacher') {
          console.log(`Teacher Login Failed: Role mismatch. Expected teacher, got ${user.role}`);
          throw new Error('Invalid credentials');
        }

        if (!user.isActive) {
          console.log('Teacher Login Failed: Account is not active');
          throw new Error('Your account has been deactivated or not initialized');
        }

        const isValidPassword = await compare(credentials.password, user.passwordHash);

        if (!isValidPassword) {
          console.log('Teacher Login Failed: Password mismatch');
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: 'teacher',
          departmentId: user.departmentId,
        };
      },
    }),
  ],

  // ============================================================
  // Callbacks - Token refresh and session management
  // ============================================================
  callbacks: {
    // JWT callback - runs on sign in and when session is accessed
    async jwt({ token, user, trigger, session }) {
      // Initial sign in - set user data
      if (user) {
        console.log('[Auth] JWT Callback: Initial Sign In', user.id);
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.departmentId = (user as any).departmentId; // Cast because NextAuth User type is restricted
        token.accessToken = generateAccessToken();
      }

      // Token refresh - update session if triggered
      if (trigger === 'update' && session) {
        token.name = session.name ?? token.name;
      }

      // Always regenerate Firebase custom token (they expire after 1 hour)
      // This runs on every session access to ensure we have a fresh token
      if (token.id && token.role) {
        try {
          getAdminApp();
          const additionalClaims = { role: token.role };
          const customToken = await getAuth().createCustomToken(token.id, additionalClaims);
          token.firebaseToken = customToken;
        } catch (error) {
          console.error('[Auth] Error minting custom token:', error);
          // Clear the token on error to force re-auth
          token.firebaseToken = undefined;
        }
      }
      
      return token;
    },

    // Session callback - expose token data to client
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name,
          role: token.role,
          departmentId: token.departmentId,
        };
        session.accessToken = token.accessToken;
        // Important: Assign firebaseToken to session
        session.firebaseToken = token.firebaseToken;
        // console.log('[Auth] Session Callback: Firebase Token Present:', !!token.firebaseToken);
      }

      return session;
    },

    // Sign in callback - additional validation
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }
      return true;
    },

    // Redirect callback - role-based redirects
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },

  // ============================================================
  // Custom Pages
  // ============================================================
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },

  // ============================================================
  // Events - For logging and analytics
  // ============================================================
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
      // TODO: Update lastLoginAt in database
    },
    async signOut({ token }) {
      console.log(`User signed out: ${token?.email}`);
    },
  },

  // ============================================================
  // Debug Mode
  // ============================================================
  debug: process.env.NODE_ENV === 'development',
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Generate a cryptographically secure random access token for API calls
 */
function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export default authOptions;
