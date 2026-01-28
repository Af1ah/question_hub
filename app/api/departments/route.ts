import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminAddDocument, adminGetDocuments } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';
import { Department } from '@/types';

/**
 * GET /api/departments
 * Get all departments
 */
export async function GET() {
  try {
    const departments = await adminGetDocuments<Department>(COLLECTIONS.DEPARTMENTS);
    // Sort by name
    departments.sort((a, b) => a.name.localeCompare(b.name));
    
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
    const session = await getServerSession(authOptions);
    // Allow admin or teacher to create? Rules said both.
    // Let's restrict to authenticated users at least.
    if (!session?.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    const body = await request.json();
    const { name, code } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    const id = await adminAddDocument(COLLECTIONS.DEPARTMENTS, {
      name,
      code: code.toUpperCase(),
      createdBy: session.user.id,
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
