import { FieldValue, Timestamp } from 'firebase/firestore';

// ============================================================
// Firestore Timestamp Types
// ============================================================

// Type for timestamp fields when writing to Firestore (accepts both Timestamp and FieldValue)
export type FirestoreTimestampInput = Timestamp | FieldValue;

// ============================================================
// Paper Types
// ============================================================

export interface Paper {
  id: string;
  qnNumber: string;           // Unique question paper number
  fileName: string;           // Generated: Subject_Year_QnNumber_QNHUB.pdf
  subjectCode: string;        // e.g., "BCA3CJ201"
  subjectName: string;        // e.g., "Computer Networks"
  subjectId: string;          // Reference to subjects collection
  departmentId: string;       // Reference to departments collection
  subjectTypeId: string;      // Reference to subjectTypes (Major/Minor)
  programType: string;        // e.g., "FYUGP", "PG"
  semester: number;           // 1-8
  yearOfExam: number;         // e.g., 2024
  examDate?: string;          // ISO date string
  description?: string;       // Optional notes
  fileUrl: string;            // Firebase Storage URL
  fileSize: number;           // In bytes
  uploadedBy: string;         // Teacher/Admin UID
  uploadedAt: Timestamp;
  updatedAt: Timestamp;
  downloadCount: number;      // Analytics
  isPublished: boolean;
  seoSlug: string;            // URL-friendly slug for SEO
}

// Paper type for creating/updating documents (allows FieldValue for timestamps)
export interface PaperInput extends Omit<Paper, 'id' | 'uploadedAt' | 'updatedAt'> {
  uploadedAt: FirestoreTimestampInput;
  updatedAt: FirestoreTimestampInput;
}

export interface PaperFormData {
  subjectCode: string;
  subjectName: string;
  qnNumber: string;
  departmentId: string;
  subjectTypeId: string;
  programType: string;
  semester: number;
  yearOfExam: number;
  examDate?: string;
  description?: string;
  file: File | null;
}

export interface PaperFilters {
  search?: string;
  subjectCode?: string;
  departmentId?: string;
  subjectTypeId?: string;
  programType?: string;
  semester?: number;
  yearOfExam?: number;
  page?: number;
  limit?: number;
}

// ============================================================
// Department Types
// ============================================================

export interface Department {
  id: string;
  name: string;               // e.g., "Computer Science"
  code: string;               // e.g., "CSE"
  slug: string;               // URL-friendly slug
  createdAt: Timestamp;
  createdBy: string;
}

export interface DepartmentFormData {
  name: string;
  code: string;
}

// ============================================================
// Subject Types
// ============================================================

export interface Subject {
  id: string;
  code: string;               // Unique - e.g., "BCA3CJ201"
  name: string;               // e.g., "Computer Networks"
  slug: string;               // URL-friendly slug
  departmentId: string;       // Reference to department
  createdAt: Timestamp;
  createdBy: string;
}

export interface SubjectFormData {
  code: string;
  name: string;
  departmentId: string;
}

// ============================================================
// Subject Type (Major/Minor/MDC/VAC-SEC)
// ============================================================

export interface SubjectType {
  id: string;
  name: string;               // e.g., "Major", "Minor", "MDC", "VAC-SEC"
  createdAt: Timestamp;
}

export interface SubjectTypeFormData {
  name: string;
}

// ============================================================
// User Types (Admin & Teacher)
// ============================================================

export type UserRole = 'admin' | 'teacher';

export interface User {
  id: string;                 // Same as Firebase Auth UID
  email: string;
  displayName: string;
  role: UserRole;
  departmentId?: string;      // Optional, mostly for teachers
  passwordHash?: string;      // Bcrypt hashed password (optional if using auth provider only, but likely needed here)
  invitedBy?: string;         // Admin UID (for teachers)
  invitedAt?: Timestamp;
  createdAt?: Timestamp;
  isActive: boolean;
  lastLoginAt?: Timestamp;
  isLocked?: boolean;         // For admins
}

export type Teacher = User & { role: 'teacher' };
export type Admin = User & { role: 'admin' };

export interface UserFormData {
  email: string;
  displayName: string;
  role: UserRole;
  departmentId?: string;
  password?: string;          // For initial creation
}

// Deprecated interfaces kept for temporary compatibility if needed, 
// but re-mapped to the new structure where possible.
// export interface Teacher { ... } - REMOVED favor of User type
// export interface Admin { ... } - REMOVED favor of User type

export interface TeacherFormData {
  email: string;
  displayName: string;
  departmentId?: string;
}

export interface AdminFormData {
  email: string;
  displayName: string;
  password: string;
}

// ============================================================
// Auth Types
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// ============================================================
// Bulk Upload Types
// ============================================================

export interface BulkUploadItem {
  qpCode: string;
  paperName: string;
  examDate: string;
  subjectType: string;        // From folder name (MAJOR 1, MINOR 1, etc.)
  fileName: string;           // Original PDF filename
  file?: File;
}

export interface BulkUploadResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  papers: Paper[];
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================
// Invite Token Types
// ============================================================

export interface InviteToken {
  id: string;
  tokenHash: string;          // SHA-256 hash of the token
  email: string;              // Teacher's email
  teacherId: string;          // Reference to teacher document
  expiresAt: Timestamp;       // Token expiration time
  isUsed: boolean;            // Whether token has been used
  createdAt: Timestamp;
}

// ============================================================
// Email Types
// ============================================================

export interface TeacherInviteEmail {
  to: string;
  teacherName: string;
  invitedBy: string;
  onboardingLink: string;     // Secure onboarding URL with token
}

