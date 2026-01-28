import { NextResponse } from 'next/server';
import { adminGetDocuments, adminDeleteDocument, adminUpdateDocument } from '@/lib/firebase/admin'; // Use Admin SDK for user management
import { COLLECTIONS } from '@/constants';
import { User, UserRole } from '@/types';

// GET: List all users or filter by role
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // 'admin' | 'teacher'

    let users = await adminGetDocuments<User>(COLLECTIONS.USERS);

    if (role) {
      users = users.filter(u => u.role === role);
    }
    
    // Sort by name
    users.sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Remove sensitive data
    const safeUsers = users.map(({ passwordHash, ...rest }) => rest);

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PATCH: Update user role
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !['admin', 'teacher'].includes(role)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    await adminUpdateDocument(COLLECTIONS.USERS, userId, { role });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE: Delete a user
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    await adminDeleteDocument(COLLECTIONS.USERS, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
