import nodemailer from 'nodemailer';
import { TeacherInviteEmail } from '@/types';

// ============================================================
// Email Transporter Configuration
// ============================================================

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// ============================================================
// Email Templates
// ============================================================

const teacherInviteTemplate = (data: TeacherInviteEmail): { subject: string; html: string; text: string } => {
  const subject = `You've been invited to Question Hub`;
  
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
                You've been invited by <strong>${data.invitedBy}</strong> to join Question Hub as a teacher. You can now upload and manage question papers.
              </p>
              
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="margin: 0 0 10px; color: #1a1a2e; font-size: 14px; font-weight: 600;">
                  Your temporary login credentials:
                </p>
                <p style="margin: 0 0 5px; color: #666666; font-size: 14px;">
                  <strong>Email:</strong> ${data.to}
                </p>
                <p style="margin: 0; color: #666666; font-size: 14px;">
                  <strong>Temporary Password:</strong> <code style="background-color: #e9ecef; padding: 2px 8px; border-radius: 4px;">${data.tempPassword}</code>
                </p>
              </div>
              
              <p style="margin: 0 0 30px; color: #dc3545; font-size: 14px;">
                ⚠️ Please change your password after your first login.
              </p>
              
              <a href="${data.loginLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Login to Question Hub →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This email was sent by Question Hub. If you didn't expect this invitation, please ignore this email.
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

You've been invited by ${data.invitedBy} to join Question Hub as a teacher.

Your temporary login credentials:
- Email: ${data.to}
- Temporary Password: ${data.tempPassword}

Please login at: ${data.loginLink}

⚠️ Please change your password after your first login.

---
This email was sent by Question Hub.
  `;
  
  return { subject, html, text };
};

// ============================================================
// Email Sending Functions
// ============================================================

/**
 * Send teacher invitation email
 */
export async function sendTeacherInviteEmail(data: TeacherInviteEmail): Promise<{ success: boolean; error?: string }> {
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
    console.error('❌ Error sending email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
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
