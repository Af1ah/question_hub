import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryConstraint,
  Timestamp,
  DocumentReference,
  QueryDocumentSnapshot,
  WriteBatch,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';

// ============================================================
// Generic Firestore Helpers
// ============================================================

/**
 * Get a single document by ID
 */
export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting document from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Get all documents from a collection with optional constraints
 */
export async function getDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  try {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Add a new document to a collection
 */
export async function addDocument<T extends DocumentData>(
  collectionName: string,
  data: Omit<T, 'id'>
): Promise<string> {
  try {
    const collectionRef = collection(db, collectionName);
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Update an existing document
 */
export async function updateDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Check if a document exists
 */
export async function documentExists(
  collectionName: string,
  docId: string
): Promise<boolean> {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error(`Error checking document existence in ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Query documents with pagination
 */
export async function getPaginatedDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[],
  pageSize: number,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{
  documents: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  try {
    const collectionRef = collection(db, collectionName);
    
    let q = query(
      collectionRef,
      ...constraints,
      limit(pageSize + 1) // Fetch one extra to check if there are more
    );

    if (lastDoc) {
      q = query(
        collectionRef,
        ...constraints,
        startAfter(lastDoc),
        limit(pageSize + 1)
      );
    }

    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;
    const hasMore = docs.length > pageSize;

    // Remove the extra document if it exists
    const documents = docs.slice(0, pageSize).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];

    const newLastDoc = docs.length > 0 ? docs[Math.min(docs.length - 1, pageSize - 1)] : null;

    return {
      documents,
      lastDoc: newLastDoc,
      hasMore,
    };
  } catch (error) {
    console.error(`Error getting paginated documents from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Create a batch writer for multiple operations
 */
export function createBatch(): WriteBatch {
  return writeBatch(db);
}

/**
 * Get document reference
 */
export function getDocRef(
  collectionName: string,
  docId: string
): DocumentReference {
  return doc(db, collectionName, docId);
}

/**
 * Get collection reference
 */
export function getCollectionRef(collectionName: string) {
  return collection(db, collectionName);
}

// Re-export query helpers for convenience
export { where, orderBy, limit, startAfter, Timestamp };
