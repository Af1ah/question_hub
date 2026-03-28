import { NextRequest, NextResponse } from 'next/server';
import { adminGetDocuments, adminUpdateDocument } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';
import { hashToken, isTokenExpired } from '@/lib/token';
import { InviteToken } from '@/types';
import { hash } from 'bcryptjs';

/**
 * POST /api/teachers/reset-password
 * Reset teacher password using a secure token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
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
        { error: 'Invalid or expired password reset link' },
        { status: 404 }
      );
    }

    const resetToken = tokens[0];

    // Check if token is already used
    if (resetToken.isUsed) {
      return NextResponse.json(
        { error: 'This password reset link has already been used' },
        { status: 410 }
      );
    }

    // Check if token is expired
    const expiresAt = resetToken.expiresAt.toDate();
    if (isTokenExpired(expiresAt)) {
      return NextResponse.json(
        { error: 'This password reset link has expired. Please request a new one.' },
        { status: 410 }
      );
    }

    // Hash the new password
    const passwordHash = await hash(password, 12);

    // Update teacher: set new password and ensure they are active
    await adminUpdateDocument(COLLECTIONS.USERS, resetToken.teacherId, {
      passwordHash,
      isActive: true,         // Ensure they are active
      needsOnboarding: false, // Ensure they are not stuck in onboarding
    });

    // Mark token as used
    await adminUpdateDocument(COLLECTIONS.INVITE_TOKENS, resetToken.id, {
      isUsed: true,
    });

    console.log(`✅ Teacher ${resetToken.email} reset their password successfully`);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again later.' },
      { status: 500 }
    );
  }
}
