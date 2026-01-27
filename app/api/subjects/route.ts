import { NextRequest, NextResponse } from 'next/server';
import { getDocuments, addDocument, orderBy, where } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/constants';
import { Subject } from '@/types';

/**
 * GET /api/subjects
 * Get all subjects, optionally filtered by department
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const code = searchParams.get('code');
    const name = searchParams.get('name');

    const constraints = [];

    if (departmentId) {
      constraints.push(where('departmentId', '==', departmentId));
    }

    if (code) {
      constraints.push(where('code', '==', code.toUpperCase()));
    }

    if (name) {
      constraints.push(where('name', '==', name));
    }

    constraints.push(orderBy('name', 'asc'));

    const subjects = await getDocuments<Subject>(COLLECTIONS.SUBJECTS, constraints);
    
    return NextResponse.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subjects
 * Create a new subject
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, departmentId, createdBy } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: 'Code and name are required' },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await getDocuments(COLLECTIONS.SUBJECTS, [
      where('code', '==', code.toUpperCase()),
    ]);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Subject with this code already exists' },
        { status: 409 }
      );
    }

    const id = await addDocument(COLLECTIONS.SUBJECTS, {
      code: code.toUpperCase(),
      name,
      departmentId: departmentId || '',
      createdBy: createdBy || 'system',
    });

    return NextResponse.json({ 
      id, 
      code: code.toUpperCase(), 
      name,
      departmentId: departmentId || '',
    });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    );
  }
}
