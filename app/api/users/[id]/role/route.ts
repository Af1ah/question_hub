import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getAdminDb, 
  getAdminApp, 
  adminGetDocument,
  adminAddDocument,
  adminDeleteDocument
} from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';
import { COLLECTIONS } from '@/constants';
import { Teacher, Admin } from '@/types';

/**
 * PATCH /api/users/[id]/role
 * Change user role (admin only)
 * Moves user document between values collections
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { newRole } = body;

    if (!newRole || !['admin', 'teacher'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    if (id === session.user.id) {
       return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 403 }
      );
    }

    const db = getAdminDb();
    
    // Run as a transaction to ensure data integrity
    await db.runTransaction(async (transaction) => {
      // 1. Check where the user currently is
      const teacherRef = db.collection(COLLECTIONS.TEACHERS).doc(id);
      const adminRef = db.collection(COLLECTIONS.ADMINS).doc(id);
      
      const teacherDoc = await transaction.get(teacherRef);
      const adminDoc = await transaction.get(adminRef);

      if (!teacherDoc.exists && !adminDoc.exists) {
        throw new Error('User not found');
      }

      if (teacherDoc.exists && newRole === 'teacher') {
        throw new Error('User is already a teacher');
      }

      if (adminDoc.exists && newRole === 'admin') {
        throw new Error('User is already an admin');
      }

      // 2. Prepare data for migration
      let userData: any = {};
      
      if (teacherDoc.exists) {
        userData = teacherDoc.data();
        // Remove teacher-specific fields if necessary or keep them
      } else {
        userData = adminDoc.data();
      }

      // 3. Move to new collection
      if (newRole === 'admin') {
        // Teacher -> Admin
        transaction.set(adminRef, {
          ...userData,
          role: 'admin', // Ensure role field if used
          updatedAt: new Date(),
        });
        transaction.delete(teacherRef);
      } else {
         // Admin -> Teacher
         transaction.set(teacherRef, {
          ...userData,
          role: 'teacher',
          // Ensure teacher specific fields defaults if missing
          departmentId: userData.departmentId || '',
          updatedAt: new Date(),
         });
         transaction.delete(adminRef);
      }
      
      // 4. Update Custom Claims (if using Firebase Auth Custom Claims)
      // This ensures isAuthenticated/isAdmin in rules works if based on token
      // But our rules check Firestore, so this is just for Client SDK if needed
      // We will update it just in case
      try {
        const auth = getAuth(getAdminApp());
        await auth.setCustomUserClaims(id, { role: newRole });
      } catch (authError) {
        console.warn('Failed to update auth claims:', authError);
        // Don't fail the transaction if auth update fails, but good to know
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error changing user role:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to change role' },
      { status: 500 }
    );
  }
}
