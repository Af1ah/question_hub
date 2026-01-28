import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

// ============================================================
// Firebase Admin SDK Configuration
// ============================================================

let adminApp: App;
let adminDb: Firestore;
let adminStorage: Storage;

/**
 * Initialize Firebase Admin SDK (singleton pattern)
 * This bypasses Firestore security rules for server-side operations
 */
function initializeAdmin(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId: projectId!,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  // Fallback for local development with Application Default Credentials
  return initializeApp({
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

// ============================================================
// Admin SDK Getters
// ============================================================

export function getAdminApp(): App {
  if (!adminApp) {
    adminApp = initializeAdmin();
  }
  return adminApp;
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
  }
  return adminDb;
}

export function getAdminStorage(): Storage {
  if (!adminStorage) {
    adminStorage = getStorage(getAdminApp());
  }
  return adminStorage;
}

// ============================================================
// Admin Firestore Helpers
// ============================================================

/**
 * Get a single document by ID (Admin)
 */
export async function adminGetDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  try {
    const db = getAdminDb();
    const docRef = db.collection(collectionName).doc(docId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`[Admin] Error getting document from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get all documents from a collection (Admin)
 */
export async function adminGetDocuments<T>(
  collectionName: string,
  queryFn?: (ref: FirebaseFirestore.CollectionReference) => FirebaseFirestore.Query
): Promise<T[]> {
  try {
    const db = getAdminDb();
    const collectionRef = db.collection(collectionName);
    const query = queryFn ? queryFn(collectionRef) : collectionRef;
    const snapshot = await query.get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  } catch (error) {
    console.error(`[Admin] Error getting documents from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Add a new document (Admin)
 */
export async function adminAddDocument<T extends FirebaseFirestore.DocumentData>(
  collectionName: string,
  data: Omit<T, 'id'>,
  docId?: string
): Promise<string> {
  try {
    const db = getAdminDb();
    const collectionRef = db.collection(collectionName);
    
    const docData = {
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (docId) {
      await collectionRef.doc(docId).set(docData);
      return docId;
    }

    const docRef = await collectionRef.add(docData);
    return docRef.id;
  } catch (error) {
    console.error(`[Admin] Error adding document to ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Update a document (Admin)
 */
export async function adminUpdateDocument<T extends FirebaseFirestore.DocumentData>(
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  try {
    const db = getAdminDb();
    const docRef = db.collection(collectionName).doc(docId);
    
    await docRef.update({
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`[Admin] Error updating document in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Delete a document (Admin)
 */
export async function adminDeleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection(collectionName).doc(docId).delete();
  } catch (error) {
    console.error(`[Admin] Error deleting document from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Check if a document exists (Admin)
 */
export async function adminDocumentExists(
  collectionName: string,
  docId: string
): Promise<boolean> {
  try {
    const db = getAdminDb();
    const docRef = db.collection(collectionName).doc(docId);
    const docSnap = await docRef.get();
    return docSnap.exists;
  } catch (error) {
    console.error(`[Admin] Error checking document existence in ${collectionName}:`, error);
    throw error;
  }
}

// Re-export useful types
export { FieldValue, Timestamp };
