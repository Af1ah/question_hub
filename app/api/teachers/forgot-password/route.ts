import { NextRequest, NextResponse } from 'next/server';
import { adminGetDocuments, adminAddDocument, Timestamp } from '@/lib/firebase/admin';
import { sendPasswordResetEmail } from '@/services/email';
import { COLLECTIONS } from '@/constants';
import { generateInviteToken, hashToken, getTokenExpiration } from '@/lib/token';

/**
 * POST /api/teachers/forgot-password
 * Request a password reset link for a teacher
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Always respond with success to prevent email enumeration,
    // but internally process only if user exists
    const users = await adminGetDocuments(
      COLLECTIONS.USERS,
      (ref) => ref.where('email', '==', email.toLowerCase())
    );

    if (users.length === 0) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    }

    const user = users[0] as any;
    
    // Generate secure reset token
    const plainToken = generateInviteToken();
    const tokenHash = hashToken(plainToken);
    
    // Expiration: 1 hour (1/24 of a day)
    const expiresAt = getTokenExpiration(1/24);

    // Store hashed token in Firestore
    // Using INVITE_TOKENS collection to reuse the existing structure for tokens
    await adminAddDocument(COLLECTIONS.INVITE_TOKENS, {
      tokenHash,
      email: email.toLowerCase(),
      teacherId: user.id,
      expiresAt: Timestamp.fromDate(expiresAt),
      isUsed: false,
    });

    // Build reset link with plain token
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/teacher/reset-password?token=${plainToken}`;

    console.log(`🔑 Password reset link for ${email}: ${resetLink}`);

    // Send reset email
    const emailResult = await sendPasswordResetEmail({
      to: email.toLowerCase(),
      teacherName: user.displayName || 'Teacher',
      resetLink,
    });

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send password reset email. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Error processing forgot password request:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
