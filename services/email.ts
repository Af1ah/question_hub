import nodemailer from 'nodemailer';
import { TeacherInviteEmail } from '@/types';

// ============================================================
// Email Transporter Configuration
// ============================================================

const createTransporter = () => {
  // Check if SMTP credentials are configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP credentials not configured');
    throw new Error('Email configuration incomplete: SMTP_USER and SMTP_PASS are required');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Timeout settings for better reliability
    connectionTimeout: 10000, // 10 seconds to establish connection
    greetingTimeout: 10000,   // 10 seconds for greeting
    socketTimeout: 30000,     // 30 seconds for socket operations
  });
};

// ============================================================
// Email Templates
// ============================================================

const teacherInviteTemplate = (data: TeacherInviteEmail): { subject: string; html: string; text: string } => {
  const subject = `You're invited to join Question Hub`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Question Hub</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                📚 Question Hub
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1a1a2e; font-size: 24px;">
                Welcome, ${data.teacherName}! 👋
              </h2>
              
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                <strong>${data.invitedBy}</strong> has invited you to join Question Hub as a teacher. You'll be able to upload and manage question papers for students.
              </p>
              
              <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                To get started, click the button below to set up your account and create your password.
              </p>
              
              <a href="${data.onboardingLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Complete Account Setup →
              </a>
              
              <div style="margin-top: 30px; padding: 16px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⏰ <strong>This link expires in 7 days.</strong> Please complete your account setup before then.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 12px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} Question Hub. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  
  const text = `
Welcome to Question Hub, ${data.teacherName}!

${data.invitedBy} has invited you to join Question Hub as a teacher.

To complete your account setup and create your password, visit:
${data.onboardingLink}

⏰ This link expires in 7 days.

---
If you didn't expect this invitation, you can safely ignore this email.
  `;
  
  return { subject, html, text };
};

// ============================================================
// Email Sending Functions
// ============================================================

/**
 * Send teacher invitation email with retry logic
 */
export async function sendTeacherInviteEmail(data: TeacherInviteEmail): Promise<{ success: boolean; error?: string }> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const transporter = createTransporter();
      const { subject, html, text } = teacherInviteTemplate(data);

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: data.to,
        subject,
        html,
        text,
      });

      console.log(`✅ Invitation email sent to ${data.to}`);
      return { success: true };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`❌ Email attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  console.error('❌ All email attempts failed:', lastError?.message);
  return { 
    success: false, 
    error: lastError?.message || 'Failed to send email after multiple attempts' 
  };
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Email configuration verified');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
}
