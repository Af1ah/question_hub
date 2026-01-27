import { NextRequest, NextResponse } from 'next/server';
import { getDocuments, orderBy } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/constants';
import { Teacher } from '@/types';

/**
 * GET /api/teachers
 * Get all teachers
 */
export async function GET() {
  try {
    const teachers = await getDocuments<Teacher>(COLLECTIONS.TEACHERS, [
      orderBy('displayName', 'asc'),
    ]);
    
    // Remove password hashes before sending
    const safeTeachers = teachers.map(({ passwordHash, ...rest }) => rest);
    
    return NextResponse.json(safeTeachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
      { status: 500 }
    );
  }
}
