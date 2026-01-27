import {
  getDocuments,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  where,
  orderBy,
} from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/constants';
import { Subject, SubjectFormData } from '@/types';

// ============================================================
// Subject Service
// ============================================================

/**
 * Get all subjects
 */
export async function getSubjects(): Promise<Subject[]> {
  return getDocuments<Subject>(COLLECTIONS.SUBJECTS, [
    orderBy('name', 'asc'),
  ]);
}

/**
 * Get subjects by department
 */
export async function getSubjectsByDepartment(departmentId: string): Promise<Subject[]> {
  return getDocuments<Subject>(COLLECTIONS.SUBJECTS, [
    where('departmentId', '==', departmentId),
    orderBy('name', 'asc'),
  ]);
}

/**
 * Get subject by ID
 */
export async function getSubjectById(id: string): Promise<Subject | null> {
  return getDocument<Subject>(COLLECTIONS.SUBJECTS, id);
}

/**
 * Get subject by code
 */
export async function getSubjectByCode(code: string): Promise<Subject | null> {
  const subjects = await getDocuments<Subject>(COLLECTIONS.SUBJECTS, [
    where('code', '==', code.toUpperCase()),
  ]);
  return subjects.length > 0 ? subjects[0] : null;
}

/**
 * Get subject by name
 */
export async function getSubjectByName(name: string): Promise<Subject | null> {
  const subjects = await getDocuments<Subject>(COLLECTIONS.SUBJECTS, [
    where('name', '==', name),
  ]);
  return subjects.length > 0 ? subjects[0] : null;
}

/**
 * Lookup subject - used for auto-fill
 * Returns subject if found by code or name
 */
export async function lookupSubject(
  query: string,
  lookupBy: 'code' | 'name'
): Promise<Subject | null> {
  if (lookupBy === 'code') {
    return getSubjectByCode(query);
  }
  return getSubjectByName(query);
}

/**
 * Search subjects by partial code or name
 */
export async function searchSubjects(query: string): Promise<Subject[]> {
  // Get all subjects and filter client-side
  // (Firestore doesn't support partial text search)
  const subjects = await getSubjects();
  
  const queryLower = query.toLowerCase();
  return subjects.filter(
    (subject) =>
      subject.code.toLowerCase().includes(queryLower) ||
      subject.name.toLowerCase().includes(queryLower)
  );
}

/**
 * Create new subject
 */
export async function createSubject(
  data: SubjectFormData,
  createdBy: string
): Promise<Subject> {
  // Check for duplicate code
  const existing = await getSubjectByCode(data.code);
  if (existing) {
    throw new Error('A subject with this code already exists');
  }

  const subjectData = {
    code: data.code.toUpperCase(),
    name: data.name,
    departmentId: data.departmentId,
    createdBy,
  };

  const id = await addDocument(COLLECTIONS.SUBJECTS, subjectData);

  return {
    id,
    ...subjectData,
  } as Subject;
}

/**
 * Update subject
 */
export async function updateSubject(
  id: string,
  data: Partial<SubjectFormData>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  
  if (data.code) updates.code = data.code.toUpperCase();
  if (data.name) updates.name = data.name;
  if (data.departmentId) updates.departmentId = data.departmentId;

  await updateDocument(COLLECTIONS.SUBJECTS, id, updates);
}

/**
 * Delete subject
 */
export async function deleteSubject(id: string): Promise<void> {
  await deleteDocument(COLLECTIONS.SUBJECTS, id);
}

/**
 * Get or create subject - useful for bulk operations
 */
export async function getOrCreateSubject(
  code: string,
  name: string,
  departmentId: string,
  createdBy: string
): Promise<Subject> {
  const existing = await getSubjectByCode(code);
  
  if (existing) {
    return existing;
  }

  return createSubject({ code, name, departmentId }, createdBy);
}
