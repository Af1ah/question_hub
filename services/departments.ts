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
import { Department, DepartmentFormData } from '@/types';

// ============================================================
// Department Service
// ============================================================

/**
 * Get all departments
 */
export async function getDepartments(): Promise<Department[]> {
  return getDocuments<Department>(COLLECTIONS.DEPARTMENTS, [
    orderBy('name', 'asc'),
  ]);
}

/**
 * Get department by ID
 */
export async function getDepartmentById(id: string): Promise<Department | null> {
  return getDocument<Department>(COLLECTIONS.DEPARTMENTS, id);
}

/**
 * Get department by code
 */
export async function getDepartmentByCode(code: string): Promise<Department | null> {
  const departments = await getDocuments<Department>(COLLECTIONS.DEPARTMENTS, [
    where('code', '==', code),
  ]);
  return departments.length > 0 ? departments[0] : null;
}

/**
 * Create new department
 */
export async function createDepartment(
  data: DepartmentFormData,
  createdBy: string
): Promise<Department> {
  // Check for duplicate code
  const existing = await getDepartmentByCode(data.code);
  if (existing) {
    throw new Error('A department with this code already exists');
  }

  const departmentData = {
    name: data.name,
    code: data.code.toUpperCase(),
    createdBy,
  };

  const id = await addDocument(COLLECTIONS.DEPARTMENTS, departmentData);

  return {
    id,
    ...departmentData,
  } as Department;
}

/**
 * Update department
 */
export async function updateDepartment(
  id: string,
  data: Partial<DepartmentFormData>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  
  if (data.name) updates.name = data.name;
  if (data.code) updates.code = data.code.toUpperCase();

  await updateDocument(COLLECTIONS.DEPARTMENTS, id, updates);
}

/**
 * Delete department
 */
export async function deleteDepartment(id: string): Promise<void> {
  // Note: In production, you might want to check if there are papers using this department
  await deleteDocument(COLLECTIONS.DEPARTMENTS, id);
}
