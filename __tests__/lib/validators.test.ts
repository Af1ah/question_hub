import {
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  ALLOWED_EXTENSIONS,
  MIN_YEAR,
  MAX_YEAR,
} from '@/constants';

// Validation functions to test
function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) return { valid: false, error: 'Email is required' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, error: 'Invalid email format' };
  return { valid: true };
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) return { valid: false, error: 'Password is required' };
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password must contain uppercase letter' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain a number' };
  return { valid: true };
}

function validateSubjectCode(code: string): { valid: boolean; error?: string } {
  if (!code) return { valid: false, error: 'Subject code is required' };
  if (code.length < 2) return { valid: false, error: 'Subject code too short' };
  if (code.length > 20) return { valid: false, error: 'Subject code too long' };
  if (!/^[A-Z0-9]+$/i.test(code)) return { valid: false, error: 'Subject code must be alphanumeric' };
  return { valid: true };
}

function validateFile(file: { size: number; type: string; name: string }): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }
  
  if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number])) {
      return { valid: false, error: 'Invalid file type. Only PDF, DOC, and DOCX allowed' };
    }
  }
  
  return { valid: true };
}

function validateYear(year: number): { valid: boolean; error?: string } {
  if (!year) return { valid: false, error: 'Year is required' };
  if (year < MIN_YEAR) return { valid: false, error: `Year must be ${MIN_YEAR} or later` };
  if (year > MAX_YEAR) return { valid: false, error: `Year cannot be after ${MAX_YEAR}` };
  return { valid: true };
}

describe('Email Validation', () => {
  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true });
  });

  it('rejects empty email', () => {
    expect(validateEmail('')).toEqual({ valid: false, error: 'Email is required' });
  });

  it('rejects invalid format', () => {
    expect(validateEmail('invalid')).toEqual({ valid: false, error: 'Invalid email format' });
  });
});

describe('Password Validation', () => {
  it('accepts strong password', () => {
    expect(validatePassword('SecurePass123')).toEqual({ valid: true });
  });

  it('rejects empty password', () => {
    expect(validatePassword('')).toEqual({ valid: false, error: 'Password is required' });
  });

  it('rejects short password', () => {
    expect(validatePassword('Ab1')).toEqual({ valid: false, error: 'Password must be at least 8 characters' });
  });

  it('rejects password without uppercase', () => {
    expect(validatePassword('password123')).toEqual({ valid: false, error: 'Password must contain uppercase letter' });
  });

  it('rejects password without number', () => {
    expect(validatePassword('SecurePassword')).toEqual({ valid: false, error: 'Password must contain a number' });
  });
});

describe('Subject Code Validation', () => {
  it('accepts valid subject code', () => {
    expect(validateSubjectCode('CS101')).toEqual({ valid: true });
  });

  it('rejects empty code', () => {
    expect(validateSubjectCode('')).toEqual({ valid: false, error: 'Subject code is required' });
  });

  it('rejects too short code', () => {
    expect(validateSubjectCode('A')).toEqual({ valid: false, error: 'Subject code too short' });
  });

  it('rejects code with special characters', () => {
    expect(validateSubjectCode('CS-101')).toEqual({ valid: false, error: 'Subject code must be alphanumeric' });
  });
});

describe('File Validation', () => {
  it('accepts valid PDF file', () => {
    const file = { size: 1024 * 1024, type: 'application/pdf', name: 'test.pdf' };
    expect(validateFile(file)).toEqual({ valid: true });
  });

  it('rejects file too large', () => {
    const file = { size: 100 * 1024 * 1024, type: 'application/pdf', name: 'test.pdf' };
    expect(validateFile(file).valid).toBe(false);
  });

  it('rejects invalid file type', () => {
    const file = { size: 1024, type: 'image/png', name: 'test.png' };
    expect(validateFile(file)).toEqual({ valid: false, error: 'Invalid file type. Only PDF, DOC, and DOCX allowed' });
  });

  it('accepts DOCX file', () => {
    const file = {
      size: 1024,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      name: 'test.docx',
    };
    expect(validateFile(file)).toEqual({ valid: true });
  });
});

describe('Year Validation', () => {
  it('accepts valid year', () => {
    expect(validateYear(2024)).toEqual({ valid: true });
  });

  it('rejects year before minimum', () => {
    expect(validateYear(1999).valid).toBe(false);
  });

  it('rejects year after maximum', () => {
    expect(validateYear(3000).valid).toBe(false);
  });
});
