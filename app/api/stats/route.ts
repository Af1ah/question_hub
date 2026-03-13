import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';
import { AggregateField, Timestamp } from 'firebase-admin/firestore';

/**
 * GET /api/stats
 * Returns aggregated dashboard statistics using Firestore aggregation queries.
 * No authentication required — stats are non-sensitive counts.
 */
export async function GET() {
  try {
    const db = getAdminDb();
    const papersRef = db.collection(COLLECTIONS.PAPERS);
    const usersRef = db.collection(COLLECTIONS.USERS);

    // Calculate the start of the current month for "this month" uploads
    const now = new Date();
    const monthStart = Timestamp.fromDate(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );

    const [
      totalPapersSnap,
      totalTeachersSnap,
      downloadsSnap,
      recentUploadsSnap,
    ] = await Promise.all([
      // Total published papers
      papersRef
        .where('isPublished', '==', true)
        .count()
        .get(),

      // Total teachers
      usersRef
        .where('role', '==', 'teacher')
        .count()
        .get(),

      // Sum of all downloadCount values (all papers, not just published)
      papersRef
        .aggregate({ totalDownloads: AggregateField.sum('downloadCount') })
        .get(),

      // Papers uploaded this month
      papersRef
        .where('uploadedAt', '>=', monthStart)
        .count()
        .get(),
    ]);

    return NextResponse.json({
      totalPapers: totalPapersSnap.data().count,
      totalTeachers: totalTeachersSnap.data().count,
      totalDownloads: downloadsSnap.data().totalDownloads || 0,
      recentUploads: recentUploadsSnap.data().count,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
