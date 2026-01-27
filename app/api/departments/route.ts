import { NextRequest, NextResponse } from 'next/server';
import { getDocuments, addDocument, orderBy, Timestamp } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/constants';
import { Department } from '@/types';

/**
 * GET /api/departments
 * Get all departments
 */
export async function GET() {
  try {
    const departments = await getDocuments<Department>(COLLECTIONS.DEPARTMENTS, [
      orderBy('name', 'asc'),
    ]);
    
    return NextResponse.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch departments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/departments
 * Create a new department
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, createdBy } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    const id = await addDocument(COLLECTIONS.DEPARTMENTS, {
      name,
      code: code.toUpperCase(),
      createdBy: createdBy || 'system',
    });

    return NextResponse.json({ id, name, code: code.toUpperCase() });
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}
