import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';

/**
 * PATCH /api/users/[id]/department
 * Update user department (admin only)
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
    const { departmentId } = await request.json();

    if (departmentId === undefined) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    
    // Run as a transaction to ensure we update the right collection
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection(COLLECTIONS.USERS).doc(id);
      const teacherRef = db.collection(COLLECTIONS.TEACHERS).doc(id);
      const adminRef = db.collection(COLLECTIONS.ADMINS).doc(id);
      
      const [userDoc, teacherDoc, adminDoc] = await Promise.all([
        transaction.get(userRef),
        transaction.get(teacherRef),
        transaction.get(adminRef)
      ]);

      if (!userDoc.exists && !teacherDoc.exists && !adminDoc.exists) {
        throw new Error('User not found');
      }

      const updateData = {
        departmentId: departmentId || '', // Allow clearing department
        updatedAt: new Date(),
      };

      if (userDoc.exists) transaction.update(userRef, updateData);
      if (teacherDoc.exists) transaction.update(teacherRef, updateData);
      if (adminDoc.exists) transaction.update(adminRef, updateData);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update department' },
      { status: 500 }
    );
  }
}
