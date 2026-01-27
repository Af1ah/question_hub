import { Timestamp } from 'firebase/firestore';

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

export interface Teacher {
  id: string;                 // Same as Firebase Auth UID
  email: string;
  displayName: string;
  departmentId?: string;
  passwordHash: string;       // Bcrypt hashed password
  invitedBy: string;          // Admin UID
  invitedAt: Timestamp;
  isActive: boolean;
  lastLoginAt?: Timestamp;
}

export interface TeacherFormData {
  email: string;
  displayName: string;
  departmentId?: string;
}

export interface Admin {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;       // Bcrypt hashed password
  createdAt: Timestamp;
  isLocked: boolean;          // Lock after initial setup
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
// Email Types
// ============================================================

export interface TeacherInviteEmail {
  to: string;
  teacherName: string;
  invitedBy: string;
  loginLink: string;
  tempPassword: string;
}
