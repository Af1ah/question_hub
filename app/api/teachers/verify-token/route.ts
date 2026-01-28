import { NextRequest, NextResponse } from 'next/server';
import { adminGetDocuments } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';
import { hashToken, isTokenExpired } from '@/lib/token';
import { InviteToken, Teacher } from '@/types';

/**
 * POST /api/teachers/verify-token
 * Verify an invite token and return teacher info if valid
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Hash the provided token to compare with stored hash
    const tokenHash = hashToken(token);

    // Find token in database
    const tokens = await adminGetDocuments<InviteToken>(
      COLLECTIONS.INVITE_TOKENS,
      (ref) => ref.where('tokenHash', '==', tokenHash)
    );

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation link' },
        { status: 404 }
      );
    }

    const inviteToken = tokens[0];

    // Check if token is already used
    if (inviteToken.isUsed) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 410 }
      );
    }

    // Check if token is expired
    const expiresAt = inviteToken.expiresAt.toDate();
    if (isTokenExpired(expiresAt)) {
      return NextResponse.json(
        { error: 'This invitation has expired. Please contact the administrator.' },
        { status: 410 }
      );
    }

    // Get teacher info
    const teachers = await adminGetDocuments<Teacher>(
      COLLECTIONS.USERS,
      (ref) => ref.where('email', '==', inviteToken.email)
    );

    if (teachers.length === 0) {
      return NextResponse.json(
        { error: 'Teacher account not found' },
        { status: 404 }
      );
    }

    const teacher = teachers[0];

    return NextResponse.json({
      valid: true,
      email: teacher.email,
      displayName: teacher.displayName,
      teacherId: teacher.id,
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    );
  }
}
