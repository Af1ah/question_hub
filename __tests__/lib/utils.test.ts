import {
  generatePaperFileName,
  generatePaperSlug,
  sanitizeForFileName,
  formatFileSize,
  truncate,
  capitalize,
  isValidEmail,
  isEmpty,
  parseExamDate,
  formatDate,
  getErrorMessage,
} from '@/lib/utils';

describe('Paper Name Generation', () => {
  describe('generatePaperFileName', () => {
    it('generates correct format: SubjectCode_Year_QnNumber_QNHUB', () => {
      const result = generatePaperFileName('CS101', 2024, 'QN01');
      expect(result).toBe('CS101_2024_QN01_QNHUB');
    });

    it('sanitizes special characters', () => {
      const result = generatePaperFileName('CS-101/A', 2024, 'QN#01');
      expect(result).toBe('CS-101A_2024_QN01_QNHUB');
    });

    it('converts to uppercase', () => {
      const result = generatePaperFileName('cs101', 2024, 'qn01');
      expect(result).toBe('CS101_2024_QN01_QNHUB');
    });

    it('handles spaces correctly', () => {
      const result = generatePaperFileName('CS 101', 2024, 'QN 01');
      expect(result).toBe('CS_101_2024_QN_01_QNHUB');
    });
  });

  describe('sanitizeForFileName', () => {
    it('removes special characters', () => {
      expect(sanitizeForFileName('test@#$%file')).toBe('TESTFILE');
    });

    it('replaces spaces with underscores', () => {
      expect(sanitizeForFileName('test file name')).toBe('TEST_FILE_NAME');
    });

    it('removes duplicate underscores', () => {
      expect(sanitizeForFileName('test  file')).toBe('TEST_FILE');
    });
  });
});

describe('SEO Slug Generation', () => {
  describe('generatePaperSlug', () => {
    it('generates SEO-friendly slug', () => {
      const result = generatePaperSlug('Data Structures', 2024, 'QN01');
      expect(result).toBe('data-structures-2024-qn01');
    });

    it('handles special characters', () => {
      const result = generatePaperSlug('Data & Algorithms', 2024, 'QN#01');
      expect(result).toBe('data-algorithms-2024-qn01');
    });

    it('converts to lowercase', () => {
      const result = generatePaperSlug('DATA STRUCTURES', 2024, 'QN01');
      expect(result).toBe('data-structures-2024-qn01');
    });
  });
});

describe('File Size Formatting', () => {
  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('formats megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    });

    it('formats with decimals', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('handles zero', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });
  });
});

describe('String Utilities', () => {
  describe('truncate', () => {
    it('truncates long text', () => {
      expect(truncate('This is a very long text', 10)).toBe('This is...');
    });

    it('does not truncate short text', () => {
      expect(truncate('Short', 10)).toBe('Short');
    });

    it('handles exact length', () => {
      expect(truncate('Exact', 5)).toBe('Exact');
    });
  });

  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('lowercases remaining letters', () => {
      expect(capitalize('HELLO')).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });
});

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('validates correct email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    it('rejects invalid email without @', () => {
      expect(isValidEmail('testexample.com')).toBe(false);
    });

    it('rejects invalid email without domain', () => {
      expect(isValidEmail('test@')).toBe(false);
    });

    it('rejects email with spaces', () => {
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('returns true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    it('returns true for whitespace only', () => {
      expect(isEmpty('   ')).toBe(true);
    });

    it('returns true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('returns false for valid string', () => {
      expect(isEmpty('text')).toBe(false);
    });
  });
});

describe('Date Utilities', () => {
  describe('parseExamDate', () => {
    it('parses DD-MM-YYYY format', () => {
      const result = parseExamDate('15-03-2024');
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(2); // March = 2
      expect(result?.getFullYear()).toBe(2024);
    });

    it('parses YYYY-MM-DD format', () => {
      const result = parseExamDate('2024-03-15');
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('returns null for empty string', () => {
      expect(parseExamDate('')).toBeNull();
    });
  });

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date(2024, 2, 15);
      const result = formatDate(date);
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('handles null', () => {
      expect(formatDate(null)).toBe('');
    });
  });
});

describe('Error Handling', () => {
  describe('getErrorMessage', () => {
    it('extracts message from Error object', () => {
      expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
    });

    it('returns string error as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('returns default message for unknown types', () => {
      expect(getErrorMessage(123)).toBe('An unexpected error occurred');
    });
  });
});
