// ============================================================
// Application Constants
// ============================================================

export const SITE_NAME = 'QnHub';
export const SITE_DESCRIPTION = 'Your comprehensive question paper bank for all academic needs';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://qnhub.gctanur.in';

// ============================================================
// Semester Options
// ============================================================

export const SEMESTERS = [
  { value: 1, label: 'Semester 1' },
  { value: 2, label: 'Semester 2' },
  { value: 3, label: 'Semester 3' },
  { value: 4, label: 'Semester 4' },
  { value: 5, label: 'Semester 5' },
  { value: 6, label: 'Semester 6' },
  { value: 7, label: 'Semester 7' },
  { value: 8, label: 'Semester 8' },
] as const;

// ============================================================
// Program Types
// ============================================================

export const PROGRAM_TYPES = [
  { value: 'FYUGP', label: 'FYUGP (Four Year UG Program)' },
  { value: 'PG', label: 'PG (Post Graduate)' },
  { value: 'UG', label: 'UG (Under Graduate)' },
  { value: 'Diploma', label: 'Diploma' },
] as const;

// ============================================================
// Default Subject Types (Seeded initially)
// ============================================================

export const DEFAULT_SUBJECT_TYPES = [
  'Major',
  'Minor',
  'MDC',
  'VAC-SEC',
] as const;

// ============================================================
// File Upload Limits
// ============================================================

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
export const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'] as const;

// ============================================================
// Pagination Defaults
// ============================================================

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

// ============================================================
// Year Range
// ============================================================

export const MIN_YEAR = 2000;
export const MAX_YEAR = new Date().getFullYear() + 1;

export const getYearOptions = () => {
  const years = [];
  for (let year = MAX_YEAR; year >= MIN_YEAR; year--) {
    years.push({ value: year, label: year.toString() });
  }
  return years;
};

// ============================================================
// Firebase Collection Names
// ============================================================

export const COLLECTIONS = {
  PAPERS: 'papers',
  DEPARTMENTS: 'departments',
  SUBJECTS: 'subjects',
  SUBJECT_TYPES: 'subjectTypes',
  TEACHERS: 'teachers',
  ADMINS: 'admins',
  USERS: 'users',
  INVITE_TOKENS: 'inviteTokens',
} as const;

// ============================================================
// Storage Paths
// ============================================================

export const STORAGE_PATHS = {
  PAPERS: 'papers',
} as const;

// ============================================================
// Routes
// ============================================================

export const ROUTES = {
  HOME: '/',
  PAPERS: '/papers',
  DEPARTMENT_SEMESTERS: (deptId: string) => `/papers/department/${deptId}`,
  DEPARTMENT_SUBJECTS: (deptId: string, semester: number | string) => `/papers/department/${deptId}/${semester}`,
  SUBJECT_PAPERS: (subjectId: string) => `/papers/subject/${subjectId}`,
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_TEACHERS: '/admin/teachers',
  ADMIN_BULK_UPLOAD: '/admin/bulk-upload',
  TEACHER_LOGIN: '/teacher/login',
  TEACHER_DASHBOARD: '/teacher',
  TEACHER_UPLOAD: '/teacher/upload',
  TEACHER_PAPERS: '/teacher/papers',
} as const;

// ============================================================
// Error Messages
// ============================================================

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  INVALID_CREDENTIALS: 'Invalid email or password',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  FILE_TOO_LARGE: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
  INVALID_FILE_TYPE: 'Only PDF, DOC, and DOCX files are allowed',
  DUPLICATE_QN_NUMBER: 'A paper with this question number already exists',
  DUPLICATE_SUBJECT_CODE: 'This subject code already exists',
  SERVER_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

