import crypto from 'crypto';

// ============================================================
// Token Generation Utilities
// ============================================================

/**
 * Generate a cryptographically secure random token
 * @param length - Length of the token (default: 48 bytes = 64 chars hex)
 */
export function generateInviteToken(length: number = 48): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token using SHA-256 for secure storage
 * @param token - The plain text token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate token expiration date
 * @param days - Number of days until expiration (default: 7)
 */
export function getTokenExpiration(days: number = 7): Date {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + days);
  return expiration;
}

/**
 * Check if a token has expired
 * @param expiresAt - Token expiration timestamp
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
