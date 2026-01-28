import { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { COLLECTIONS } from '@/constants';
import { User as AppUser, UserRole } from '@/types';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// ============================================================
// Extended Types for NextAuth
// ============================================================

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    accessToken?: string;
  }
}

// ============================================================
// Firebase Admin Initialization for Auth
// ============================================================

let adminDb: Firestore | null = null;

function getAdminDb(): Firestore {
  if (adminDb) return adminDb;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId) {
    throw new Error('Firebase project ID is required');
  }

  if (getApps().length === 0) {
    if (clientEmail && privateKey) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      initializeApp({ projectId });
    }
  }

  adminDb = getFirestore();
  return adminDb;
}

// ============================================================
// Auth Helper Functions
// ============================================================

async function findUserByEmail(email: string): Promise<AppUser | null> {
  try {
    const db = getAdminDb();
    // Query the unified USERS collection
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    return { id: doc.id, ...data } as unknown as AppUser;
  } catch (error) {
    console.error('Error finding user:', error);
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
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await findUserByEmail(credentials.email);
        
        // Check if user exists, has a password hash, and is an ADMIN
        if (!user || !user.passwordHash || user.role !== 'admin') {
          throw new Error('Invalid credentials');
        }

        const isValidPassword = await compare(credentials.password, user.passwordHash);

        if (!isValidPassword) {
          throw new Error('Invalid credentials');
        }

        if (user.isLocked) {
             throw new Error('Account is locked');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: 'admin',
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
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await findUserByEmail(credentials.email);
        
        // Check if user exists, has password hash, and is a TEACHER
        if (!user || !user.passwordHash || user.role !== 'teacher') {
          throw new Error('Invalid credentials');
        }

        if (!user.isActive) {
          throw new Error('Your account has been deactivated');
        }

        const isValidPassword = await compare(credentials.password, user.passwordHash);

        if (!isValidPassword) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: 'teacher',
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
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;

        // Generate access token for API calls
        token.accessToken = generateAccessToken();
      }

      // Token refresh - update session if triggered
      if (trigger === 'update' && session) {
        token.name = session.name ?? token.name;
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
        };
        session.accessToken = token.accessToken;
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
 * Generate a random access token for API calls
 */
function generateAccessToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default authOptions;
