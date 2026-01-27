import { NextRequest, NextResponse } from 'next/server';
import { getDocuments, addDocument, orderBy, where } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/constants';
import { SubjectType } from '@/types';

/**
 * GET /api/subject-types
 * Get all subject types
 */
export async function GET() {
  try {
    const subjectTypes = await getDocuments<SubjectType>(COLLECTIONS.SUBJECT_TYPES, [
      orderBy('name', 'asc'),
    ]);
    
    return NextResponse.json(subjectTypes);
  } catch (error) {
    console.error('Error fetching subject types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subject types' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subject-types
 * Create a new subject type
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await getDocuments(COLLECTIONS.SUBJECT_TYPES, [
      where('name', '==', name),
    ]);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Subject type already exists' },
        { status: 409 }
      );
    }

    const id = await addDocument(COLLECTIONS.SUBJECT_TYPES, { name });

    return NextResponse.json({ id, name });
  } catch (error) {
    console.error('Error creating subject type:', error);
    return NextResponse.json(
      { error: 'Failed to create subject type' },
      { status: 500 }
    );
  }
}
