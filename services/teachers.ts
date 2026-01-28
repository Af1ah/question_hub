import {
  getDocuments,
  getDocument,
  addDocument,
  updateDocument,
  where,
  orderBy,
  Timestamp,
} from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/constants';
import { Teacher, TeacherFormData, UserRole } from '@/types';
import { hash } from 'bcryptjs';
import { sendTeacherInviteEmail } from './email';
import { generateRandomString } from '@/lib/utils';

// ============================================================
// Teacher Service (Now using Unified Users)
// ============================================================

/**
 * Get all teachers
 */
export async function getTeachers(): Promise<Teacher[]> {
  // @ts-ignore - Unified collection returns User, casts to Teacher
  return getDocuments<Teacher>(COLLECTIONS.USERS, [
    where('role', '==', 'teacher'),
    orderBy('displayName', 'asc'),
  ]);
}

/**
 * Get active teachers only
 */
export async function getActiveTeachers(): Promise<Teacher[]> {
  // @ts-ignore
  return getDocuments<Teacher>(COLLECTIONS.USERS, [
    where('role', '==', 'teacher'),
    where('isActive', '==', true),
    orderBy('displayName', 'asc'),
  ]);
}

/**
 * Get teacher by ID
 */
export async function getTeacherById(id: string): Promise<Teacher | null> {
  const user = await getDocument<Teacher>(COLLECTIONS.USERS, id);
  if (user && user.role === 'teacher') {
    return user;
  }
  return null;
}

/**
 * Get teacher by email
 */
export async function getTeacherByEmail(email: string): Promise<Teacher | null> {
  // @ts-ignore
  const teachers = await getDocuments<Teacher>(COLLECTIONS.USERS, [
    where('email', '==', email.toLowerCase()),
    where('role', '==', 'teacher'),
  ]);
  return teachers.length > 0 ? teachers[0] : null;
}

/**
 * @deprecated Use the /api/teachers/invite API route instead.
 */
export async function inviteTeacher(
  data: TeacherFormData,
  invitedBy: string,
  _inviterName: string
): Promise<{ success: boolean; teacher?: Teacher; error?: string }> {
  // Check for existing teacher with same email
  const existing = await getTeacherByEmail(data.email);
  if (existing) {
    return { success: false, error: 'A teacher with this email already exists' };
  }

  const teacherData = {
    email: data.email.toLowerCase(),
    displayName: data.displayName,
    departmentId: data.departmentId,
    passwordHash: '',
    invitedBy,
    invitedAt: Timestamp.now(),
    isActive: false,
    needsOnboarding: true,
    role: 'teacher' as UserRole,
  };

  const teacherId = await addDocument(COLLECTIONS.USERS, teacherData);

  const teacher = {
    id: teacherId,
    ...teacherData,
    role: 'teacher' as const,
  } as Teacher;

  console.warn('inviteTeacher() is deprecated. Use /api/teachers/invite instead.');

  return { success: true, teacher };
}

/**
 * Update teacher
 */
export async function updateTeacher(
  id: string,
  data: Partial<TeacherFormData>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  
  if (data.displayName) updates.displayName = data.displayName;
  if (data.departmentId !== undefined) updates.departmentId = data.departmentId;

  await updateDocument(COLLECTIONS.USERS, id, updates);
}

/**
 * Update teacher password
 */
export async function updateTeacherPassword(
  id: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await hash(newPassword, 12);
  await updateDocument(COLLECTIONS.USERS, id, { passwordHash });
}

/**
 * Deactivate teacher
 */
export async function deactivateTeacher(id: string): Promise<void> {
  await updateDocument(COLLECTIONS.USERS, id, { isActive: false });
}

/**
 * Activate teacher
 */
export async function activateTeacher(id: string): Promise<void> {
  await updateDocument(COLLECTIONS.USERS, id, { isActive: true });
}

/**
 * Update last login time
 */
export async function updateTeacherLastLogin(id: string): Promise<void> {
  await updateDocument(COLLECTIONS.USERS, id, {
    lastLoginAt: Timestamp.now(),
  });
}

/**
 * Get teachers by department
 */
export async function getTeachersByDepartment(departmentId: string): Promise<Teacher[]> {
  // @ts-ignore
  return getDocuments<Teacher>(COLLECTIONS.USERS, [
    where('role', '==', 'teacher'),
    where('departmentId', '==', departmentId),
    where('isActive', '==', true),
    orderBy('displayName', 'asc'),
  ]);
}
