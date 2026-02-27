import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminDb, adminDeleteDocument } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';

/**
 * POST /api/departments/[id]/merge
 * Merge source department into target department
 * Reassigns all papers from source to target, then deletes source
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sourceId } = await params;
    const { targetId } = await request.json();

    if (!targetId) {
      return NextResponse.json(
        { error: 'Target department ID is required' },
        { status: 400 }
      );
    }

    if (sourceId === targetId) {
      return NextResponse.json(
        { error: 'Cannot merge a department into itself' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Verify target department exists
    const targetDoc = await db.collection(COLLECTIONS.DEPARTMENTS).doc(targetId).get();
    if (!targetDoc.exists) {
      return NextResponse.json(
        { error: 'Target department not found' },
        { status: 404 }
      );
    }

    // Find all papers in the source department
    const papersSnap = await db
      .collection(COLLECTIONS.PAPERS)
      .where('departmentId', '==', sourceId)
      .get();

    // Batch update papers to the target department
    const batch = db.batch();
    let updatedCount = 0;

    papersSnap.docs.forEach((doc) => {
      batch.update(doc.ref, { departmentId: targetId });
      updatedCount++;
    });

    if (updatedCount > 0) {
      await batch.commit();
    }

    // Delete the source department
    await adminDeleteDocument(COLLECTIONS.DEPARTMENTS, sourceId);

    return NextResponse.json({
      success: true,
      mergedPapers: updatedCount,
    });
  } catch (error) {
    console.error('Error merging departments:', error);
    return NextResponse.json(
      { error: 'Failed to merge departments' },
      { status: 500 }
    );
  }
}
