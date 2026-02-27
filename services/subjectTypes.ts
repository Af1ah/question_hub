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
import { SubjectType, SubjectTypeFormData } from '@/types';

// ============================================================
// Subject Type Service (Major, Minor, MDC, VAC-SEC)
// ============================================================

/**
 * Get all subject types
 */
export async function getSubjectTypes(): Promise<SubjectType[]> {
  return getDocuments<SubjectType>(COLLECTIONS.SUBJECT_TYPES, [
    orderBy('name', 'asc'),
  ]);
}

/**
 * Get subject type by ID
 */
export async function getSubjectTypeById(id: string): Promise<SubjectType | null> {
  return getDocument<SubjectType>(COLLECTIONS.SUBJECT_TYPES, id);
}

/**
 * Get subject type by name
 */
export async function getSubjectTypeByName(name: string): Promise<SubjectType | null> {
  const types = await getDocuments<SubjectType>(COLLECTIONS.SUBJECT_TYPES, [
    where('name', '==', name),
  ]);
  return types.length > 0 ? types[0] : null;
}

/**
 * Create new subject type
 */
export async function createSubjectType(
  data: SubjectTypeFormData
): Promise<SubjectType> {
  // Check for duplicate name
  const existing = await getSubjectTypeByName(data.name);
  if (existing) {
    throw new Error('A subject type with this name already exists');
  }

  const typeData = {
    name: data.name,
  };

  const id = await addDocument(COLLECTIONS.SUBJECT_TYPES, typeData);

  return {
    id,
    ...typeData,
  } as SubjectType;
}

/**
 * Update subject type
 */
export async function updateSubjectType(
  id: string,
  data: Partial<SubjectTypeFormData>
): Promise<void> {
  if (data.name) {
    await updateDocument(COLLECTIONS.SUBJECT_TYPES, id, { name: data.name });
  }
}

/**
 * Delete subject type
 */
export async function deleteSubjectType(id: string): Promise<void> {
  await deleteDocument(COLLECTIONS.SUBJECT_TYPES, id);
}

/**
 * Get or create subject type - useful for bulk operations
 */
export async function getOrCreateSubjectType(name: string): Promise<SubjectType> {
  const existing = await getSubjectTypeByName(name);
  
  if (existing) {
    return existing;
  }

  return createSubjectType({ name });
}

/**
 * Map folder name to subject type name
 * e.g., "MAJOR 1" -> "Major", "MINOR 2" -> "Minor"
 */
export function normalizeSubjectTypeName(folderName: string): string {
  const normalized = folderName.toLowerCase().trim();
  
  if (normalized.startsWith('major')) return 'Major';
  if (normalized.startsWith('minor')) return 'Minor';
  if (normalized === 'mdc') return 'MDC';
  if (normalized === 'vac-sec' || normalized === 'vacsec') return 'VAC-SEC';
  if (normalized.startsWith('aec')) return 'AEC';
  if (normalized === 'sec') return 'SEC';
  
  // Return as-is if not matched
  return folderName;
}
