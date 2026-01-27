import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addDocument, getDocuments, where, Timestamp } from '@/lib/firebase/firestore';
import { sendTeacherInviteEmail } from '@/services/email';
import { COLLECTIONS } from '@/constants';
import { generateRandomString } from '@/lib/utils';
import { hash } from 'bcryptjs';

/**
 * POST /api/teachers/invite
 * Invite a new teacher (admin only)
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
    const existing = await getDocuments(COLLECTIONS.TEACHERS, [
      where('email', '==', email.toLowerCase()),
    ]);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A teacher with this email already exists' },
        { status: 409 }
      );
    }

    // Generate temporary password
    const tempPassword = generateRandomString(12);
    const passwordHash = await hash(tempPassword, 12);

    // Create teacher document
    const teacherData = {
      email: email.toLowerCase(),
      displayName,
      departmentId: departmentId || '',
      passwordHash,
      invitedBy: session.user.id,
      invitedAt: Timestamp.now(),
      isActive: true,
    };

    const teacherId = await addDocument(COLLECTIONS.TEACHERS, teacherData);

    // Send invitation email
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const emailResult = await sendTeacherInviteEmail({
      to: email,
      teacherName: displayName,
      invitedBy: session.user.name,
      loginLink: `${baseUrl}/teacher/login`,
      tempPassword,
    });

    if (!emailResult.success) {
      console.warn('Email sending failed, but teacher was created:', emailResult.error);
    }

    return NextResponse.json({
      id: teacherId,
      email: email.toLowerCase(),
      displayName,
      departmentId: departmentId || '',
      isActive: true,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error('Error inviting teacher:', error);
    return NextResponse.json(
      { error: 'Failed to invite teacher' },
      { status: 500 }
    );
  }
}
