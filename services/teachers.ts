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
import { Teacher, TeacherFormData } from '@/types';
import { hash } from 'bcryptjs';
import { sendTeacherInviteEmail } from './email';
import { generateRandomString } from '@/lib/utils';

// ============================================================
// Teacher Service
// ============================================================

/**
 * Get all teachers
 */
export async function getTeachers(): Promise<Teacher[]> {
  return getDocuments<Teacher>(COLLECTIONS.TEACHERS, [
    orderBy('displayName', 'asc'),
  ]);
}

/**
 * Get active teachers only
 */
export async function getActiveTeachers(): Promise<Teacher[]> {
  return getDocuments<Teacher>(COLLECTIONS.TEACHERS, [
    where('isActive', '==', true),
    orderBy('displayName', 'asc'),
  ]);
}

/**
 * Get teacher by ID
 */
export async function getTeacherById(id: string): Promise<Teacher | null> {
  return getDocument<Teacher>(COLLECTIONS.TEACHERS, id);
}

/**
 * Get teacher by email
 */
export async function getTeacherByEmail(email: string): Promise<Teacher | null> {
  const teachers = await getDocuments<Teacher>(COLLECTIONS.TEACHERS, [
    where('email', '==', email.toLowerCase()),
  ]);
  return teachers.length > 0 ? teachers[0] : null;
}

/**
 * Invite a new teacher
 * Creates account with temporary password and sends invitation email
 */
export async function inviteTeacher(
  data: TeacherFormData,
  invitedBy: string,
  inviterName: string
): Promise<{ success: boolean; teacher?: Teacher; error?: string }> {
  // Check for existing teacher with same email
  const existing = await getTeacherByEmail(data.email);
  if (existing) {
    return { success: false, error: 'A teacher with this email already exists' };
  }

  // Generate temporary password
  const tempPassword = generateRandomString(12);
  const passwordHash = await hash(tempPassword, 12);

  // Create teacher document
  const teacherData = {
    email: data.email.toLowerCase(),
    displayName: data.displayName,
    departmentId: data.departmentId,
    passwordHash,
    invitedBy,
    invitedAt: Timestamp.now(),
    isActive: true,
  };

  const teacherId = await addDocument(COLLECTIONS.TEACHERS, teacherData);

  const teacher = {
    id: teacherId,
    ...teacherData,
  } as Teacher;

  // Send invitation email
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const emailResult = await sendTeacherInviteEmail({
    to: data.email,
    teacherName: data.displayName,
    invitedBy: inviterName,
    loginLink: `${baseUrl}/teacher/login`,
    tempPassword,
  });

  if (!emailResult.success) {
    console.warn('Failed to send invitation email:', emailResult.error);
    // Note: Teacher is still created, email just failed
  }

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

  await updateDocument(COLLECTIONS.TEACHERS, id, updates);
}

/**
 * Update teacher password
 */
export async function updateTeacherPassword(
  id: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await hash(newPassword, 12);
  await updateDocument(COLLECTIONS.TEACHERS, id, { passwordHash });
}

/**
 * Deactivate teacher
 */
export async function deactivateTeacher(id: string): Promise<void> {
  await updateDocument(COLLECTIONS.TEACHERS, id, { isActive: false });
}

/**
 * Activate teacher
 */
export async function activateTeacher(id: string): Promise<void> {
  await updateDocument(COLLECTIONS.TEACHERS, id, { isActive: true });
}

/**
 * Update last login time
 */
export async function updateTeacherLastLogin(id: string): Promise<void> {
  await updateDocument(COLLECTIONS.TEACHERS, id, {
    lastLoginAt: Timestamp.now(),
  });
}

/**
 * Get teachers by department
 */
export async function getTeachersByDepartment(departmentId: string): Promise<Teacher[]> {
  return getDocuments<Teacher>(COLLECTIONS.TEACHERS, [
    where('departmentId', '==', departmentId),
    where('isActive', '==', true),
    orderBy('displayName', 'asc'),
  ]);
}
