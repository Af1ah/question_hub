import { NextRequest, NextResponse } from 'next/server';
import { adminGetDocuments, adminUpdateDocument } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';
import { hashToken, isTokenExpired } from '@/lib/token';
import { InviteToken } from '@/types';
import { hash } from 'bcryptjs';

/**
 * POST /api/teachers/complete-onboarding
 * Complete teacher onboarding - set password and activate account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
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

    // Hash the password
    const passwordHash = await hash(password, 12);

    // Update teacher: set password and activate
    await adminUpdateDocument(COLLECTIONS.USERS, inviteToken.teacherId, {
      passwordHash,
      isActive: true,
      needsOnboarding: false,
    });

    // Mark token as used
    await adminUpdateDocument(COLLECTIONS.INVITE_TOKENS, inviteToken.id, {
      isUsed: true,
    });

    console.log(`✅ Teacher ${inviteToken.email} completed onboarding`);

    return NextResponse.json({
      success: true,
      message: 'Account setup complete. You can now log in.',
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: 'Failed to complete account setup' },
      { status: 500 }
    );
  }
}
