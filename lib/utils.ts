import { clsx, type ClassValue } from 'clsx';

// ============================================================
// Class Name Utilities
// ============================================================

/**
 * Merge class names with clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// ============================================================
// Paper Name Generation
// ============================================================

/**
 * Generate standardized paper file name
 * Format: SubjectCode_Year_QnNumber_QNHUB
 */
export function generatePaperFileName(
  subjectCode: string,
  yearOfExam: number,
  qnNumber: string
): string {
  const sanitizedCode = sanitizeForFileName(subjectCode);
  const sanitizedQn = sanitizeForFileName(qnNumber);
  return `${sanitizedCode}_${yearOfExam}_${sanitizedQn}_QNHUB`;
}

/**
 * Sanitize string for use in file names
 */
export function sanitizeForFileName(str: string): string {
  return str
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '_')     // Replace spaces with underscores
    .replace(/_+/g, '_')      // Remove duplicate underscores
    .toUpperCase();
}

// ============================================================
// SEO Slug Generation
// ============================================================

/**
 * Generate SEO-friendly slug for paper URLs
 */
export function generatePaperSlug(
  subjectName: string,
  yearOfExam: number,
  qnNumber: string
): string {
  const sanitizedName = subjectName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  
  const sanitizedQn = qnNumber
    .toLowerCase()
    .replace(/[^\w]/g, '');

  return `${sanitizedName}-${yearOfExam}-${sanitizedQn}`;
}

// ============================================================
// Date Utilities
// ============================================================

/**
 * Parse exam date from various formats
 * Handles formats like "03-11-2025: 2.00 PM" or "2025-11-03"
 */
export function parseExamDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try DD-MM-YYYY format first
  const ddmmyyyyMatch = dateStr.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try YYYY-MM-DD format
  const yyyymmddMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try standard Date parsing
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format date for display
 * Supports Date, string, Firestore Timestamp (with toDate method or serialized with seconds/nanoseconds), or null
 */
export function formatDate(date: Date | string | { toDate?: () => Date; seconds?: number; nanoseconds?: number } | null | undefined): string {
  if (!date) return '';
  
  let d: Date;
  if (typeof date === 'string') {
    d = new Date(date);
  } else if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'object') {
    // Handle Firestore Timestamp - check for toDate method first
    if ('toDate' in date && typeof date.toDate === 'function') {
      d = date.toDate();
    } else if ('seconds' in date && typeof date.seconds === 'number') {
      // Handle serialized Timestamp (plain object with seconds/nanoseconds)
      d = new Date(date.seconds * 1000);
    } else {
      return '';
    }
  } else {
    return '';
  }
  
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================
// File Size Formatting
// ============================================================

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================
// String Utilities
// ============================================================

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================================
// Debounce Utility
// ============================================================

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), wait);
  };
}

// ============================================================
// Validation Utilities
// ============================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if string is empty or only whitespace
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

// ============================================================
// Error Handling
// ============================================================

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}


