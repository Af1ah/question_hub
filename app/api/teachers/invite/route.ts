import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminGetDocuments, adminAddDocument, Timestamp } from '@/lib/firebase/admin';
import { sendTeacherInviteEmail } from '@/services/email';
import { COLLECTIONS } from '@/constants';
import { generateInviteToken, hashToken, getTokenExpiration } from '@/lib/token';

/**
 * POST /api/teachers/invite
 * Invite a new teacher (admin only)
 * Creates teacher record and sends secure onboarding link
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, displayName, departmentId } = body;

    if (!email || !displayName) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Check for existing teacher
    const existing = await adminGetDocuments(
      COLLECTIONS.USERS,
      (ref) => ref.where('email', '==', email.toLowerCase()).where('role', '==', 'teacher')
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A teacher with this email already exists' },
        { status: 409 }
      );
    }

    // Create teacher document (without password - they'll set it during onboarding)
    const teacherData = {
      email: email.toLowerCase(),
      displayName,
      departmentId: departmentId || '',
      passwordHash: '', // Will be set during onboarding
      invitedBy: session.user.id,
      invitedAt: Timestamp.now(),
      isActive: false, // Activate after onboarding
      needsOnboarding: true,
      role: 'teacher' as const,
    };

    const teacherId = await adminAddDocument(COLLECTIONS.USERS, teacherData);

    // Generate secure invite token
    const plainToken = generateInviteToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = getTokenExpiration(7); // 7 days

    // Store hashed token in Firestore
    await adminAddDocument(COLLECTIONS.INVITE_TOKENS, {
      tokenHash,
      email: email.toLowerCase(),
      teacherId,
      expiresAt: Timestamp.fromDate(expiresAt),
      isUsed: false,
    });

    // Build onboarding link with plain token
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const onboardingLink = `${baseUrl}/teacher/onboard?token=${plainToken}`;

    // Log for development (in production, only email would have the link)
    console.log(`📧 Onboarding link for ${email}: ${onboardingLink}`);

    // Send invitation email
    const emailResult = await sendTeacherInviteEmail({
      to: email,
      teacherName: displayName,
      invitedBy: session.user.name || 'Admin',
      onboardingLink,
    });

    if (!emailResult.success) {
      console.warn('Email sending failed, but teacher was created:', emailResult.error);
    }

    return NextResponse.json({
      id: teacherId,
      email: email.toLowerCase(),
      displayName,
      departmentId: departmentId || '',
      isActive: false,
      emailSent: emailResult.success,
      emailError: emailResult.success ? undefined : emailResult.error,
      // Include onboarding link so admin can share manually if email fails
      onboardingLink,
    });
  } catch (error) {
    console.error('Error inviting teacher:', error);
    return NextResponse.json(
      { error: 'Failed to invite teacher' },
      { status: 500 }
    );
  }
}

