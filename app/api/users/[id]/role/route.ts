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
      // 1. Check where the user currently is (check all possible collections)
      const userRef = db.collection(COLLECTIONS.USERS).doc(id);
      const teacherRef = db.collection(COLLECTIONS.TEACHERS).doc(id);
      const adminRef = db.collection(COLLECTIONS.ADMINS).doc(id);
      
      const userDoc = await transaction.get(userRef);
      const teacherDoc = await transaction.get(teacherRef);
      const adminDoc = await transaction.get(adminRef);

      // User can be in 'users' collection OR in 'teachers'/'admins' collections
      if (!userDoc.exists && !teacherDoc.exists && !adminDoc.exists) {
        throw new Error('User not found');
      }

      // Get current role
      let currentRole: string | undefined;
      if (userDoc.exists) {
        currentRole = userDoc.data()?.role;
      } else if (teacherDoc.exists) {
        currentRole = 'teacher';
      } else if (adminDoc.exists) {
        currentRole = 'admin';
      }

      if (currentRole === newRole) {
        throw new Error(`User is already a ${newRole}`);
      }

      // 2. Prepare data for migration
      let userData: any = {};
      
      if (userDoc.exists) {
        userData = userDoc.data();
      } else if (teacherDoc.exists) {
        userData = teacherDoc.data();
      } else {
        userData = adminDoc.data();
      }

      // 3. Update the user's role
      // If user is in the 'users' collection, just update the role there
      if (userDoc.exists) {
        transaction.update(userRef, {
          role: newRole,
          updatedAt: new Date(),
        });
      } else {
        // If user is in separate collections (teachers/admins), move between them
        if (newRole === 'admin') {
          // Teacher -> Admin
          transaction.set(adminRef, {
            ...userData,
            role: 'admin',
            updatedAt: new Date(),
          });
          transaction.delete(teacherRef);
        } else {
          // Admin -> Teacher
          transaction.set(teacherRef, {
            ...userData,
            role: 'teacher',
            departmentId: userData.departmentId || '',
            updatedAt: new Date(),
          });
          transaction.delete(adminRef);
        }
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
