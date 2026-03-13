import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';

/**
 * GET /api/papers/years
 * Returns a sorted list of distinct yearOfExam values from published papers.
 * Used by the FilterModal to show only years that have papers.
 */
export async function GET() {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTIONS.PAPERS)
      .where('isPublished', '==', true)
      .select('yearOfExam')
      .get();

    const yearsSet = new Set<number>();
    snapshot.docs.forEach((doc) => {
      const year = doc.data().yearOfExam;
      if (typeof year === 'number') {
        yearsSet.add(year);
      }
    });

    // Sort descending (newest first)
    const years = Array.from(yearsSet).sort((a, b) => b - a);

    return NextResponse.json(years);
  } catch (error) {
    console.error('Error fetching paper years:', error);
    return NextResponse.json(
      { error: 'Failed to fetch years' },
      { status: 500 }
    );
  }
}
