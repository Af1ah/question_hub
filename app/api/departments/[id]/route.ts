import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminUpdateDocument, adminDeleteDocument, adminGetDocument } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';
import { Department } from '@/types';

/**
 * PUT /api/departments/[id]
 * Update department (Admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name, code } = body;

    await adminUpdateDocument(COLLECTIONS.DEPARTMENTS, id, {
      name,
      code: code?.toUpperCase(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating department:', error);
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/departments/[id]
 * Delete department (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    await adminDeleteDocument(COLLECTIONS.DEPARTMENTS, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}
