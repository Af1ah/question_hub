import JSZip from 'jszip';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { BulkUploadItem, BulkUploadResult, Paper } from '@/types';
import { createPaper } from './papers';
import { getOrCreateSubjectType, normalizeSubjectTypeName } from './subjectTypes';
import { getDepartmentByCode, createDepartment } from './departments';
import { parseExamDate } from '@/lib/utils';
import { Timestamp } from '@/lib/firebase/firestore';

// ============================================================
// CSV Parsing Types
// ============================================================

interface ParsedPaper {
  qpCode: string;
  paperName: string;
  subjectCode: string;
  subjectName: string;
  examDate: string;
  semester: number;
  yearOfExam: number;
  departmentCode: string;
}

// ============================================================
// Department Code Mapping (from subject code prefix)
// ============================================================

const DEPARTMENT_MAP: Record<string, string> = {
  BCA: 'BCA',
  COM: 'Commerce',
  BBA: 'BBA',
  ENG: 'English',
  ELE: 'Electronics',
  MAT: 'Mathematics',
  JOU: 'Journalism',
  CSC: 'Computer Science',
  ARA: 'Arabic',
  HIN: 'Hindi',
  MAL: 'Malayalam',
  PEN: 'Physical Education',
};

// ============================================================
// Bulk Upload Service
// ============================================================

/**
 * Process bulk upload ZIP file
 * 
 * Expected structure:
 * archive.zip
 * ├── Third Sem QP Details.csv
 * └── 3 FYUGP QP NOV 25/
 *     ├── MAJOR 1/
 *     │   ├── 133750_xxx.pdf
 *     │   └── ...
 *     ├── MAJOR 2/
 *     ├── MINOR 1/
 *     ├── MINOR 2/
 *     ├── MDC/
 *     └── VAC-SEC/
 */
export async function processBulkUpload(
  zipFile: File,
  uploadedBy: string,
  onProgress?: (processed: number, total: number, status: string) => void
): Promise<BulkUploadResult> {
  const result: BulkUploadResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    papers: [],
  };

  try {
    onProgress?.(0, 0, 'Extracting ZIP file...');
    
    // Load and extract ZIP
    const zip = await JSZip.loadAsync(zipFile);
    
    // Find metadata file (CSV preferred, XLSX fallback)
    const metadataFile = findMetadataFile(zip);
    if (!metadataFile) {
      throw new Error('No CSV or XLSX metadata file found in ZIP archive');
    }

    onProgress?.(0, 0, 'Parsing metadata...');
    
    // Parse metadata into rows
    const rows = await parseMetadataToRows(metadataFile);
    const parsedPapers = parseRows(rows);

    if (parsedPapers.length === 0) {
      throw new Error('No valid entries found in CSV file');
    }

    // Find PDF files and their folders
    const pdfFiles = findPDFFiles(zip);
    
    onProgress?.(0, parsedPapers.length, 'Processing papers...');

    // Cache department IDs to avoid repeated lookups
    const departmentCache: Record<string, string> = {};

    // Process each paper
    for (let i = 0; i < parsedPapers.length; i++) {
      const paper = parsedPapers[i];
      
      try {
        onProgress?.(i + 1, parsedPapers.length, `Processing: ${paper.subjectCode}`);

        // Find matching PDF file
        const pdfMatch = findPDFForQPCode(pdfFiles, paper.qpCode);
        
        if (!pdfMatch) {
          result.errors.push(`PDF not found for QP Code: ${paper.qpCode}`);
          result.failed++;
          continue;
        }

        // Get subject type from folder name
        const subjectTypeName = normalizeSubjectTypeName(pdfMatch.folderName);
        const subjectType = await getOrCreateSubjectType(subjectTypeName);

        // Extract PDF file
        const pdfBlob = await pdfMatch.file.async('blob');
        const pdfFile = new File([pdfBlob], pdfMatch.fileName, { type: 'application/pdf' });

        // Resolve department from subject code prefix
        let departmentId = departmentCache[paper.departmentCode];
        if (!departmentId) {
          const deptName = DEPARTMENT_MAP[paper.departmentCode] || paper.departmentCode;
          const existingDept = await getDepartmentByCode(paper.departmentCode);
          if (existingDept) {
            departmentId = existingDept.id;
          } else {
            const newDept = await createDepartment(
              { name: deptName, code: paper.departmentCode },
              uploadedBy
            );
            departmentId = newDept.id;
          }
          departmentCache[paper.departmentCode] = departmentId;
        }

        // Create paper
        const createdPaper = await createPaper(
          {
            subjectCode: paper.subjectCode,
            subjectName: paper.subjectName,
            qnNumber: paper.qpCode,
            departmentId,
            subjectTypeId: subjectType.id,
            programType: 'FYUGP',
            semester: paper.semester,
            yearOfExam: paper.yearOfExam,
            examDate: paper.examDate,
            description: '',
            file: pdfFile,
          },
          uploadedBy
        );

        result.papers.push(createdPaper);
        result.processed++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to process ${paper.qpCode}: ${errorMessage}`);
        result.failed++;
      }
    }

    result.success = result.failed === 0;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.success = false;
    result.errors.push(errorMessage);
  }

  return result;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Find metadata file in ZIP (CSV preferred, XLSX fallback)
 */
function findMetadataFile(zip: JSZip): JSZip.JSZipObject | null {
  let csvFile: JSZip.JSZipObject | null = null;
  let xlsxFile: JSZip.JSZipObject | null = null;
  
  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    const lower = relativePath.toLowerCase();
    if (lower.endsWith('.csv')) csvFile = file;
    else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) xlsxFile = file;
  });
  
  return csvFile || xlsxFile;
}

/**
 * Parse metadata file (CSV or XLSX) into string[][] rows
 */
async function parseMetadataToRows(file: JSZip.JSZipObject): Promise<string[][]> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.csv')) {
    const content = await file.async('text');
    const parsed = Papa.parse<string[]>(content, { skipEmptyLines: true });
    return parsed.data || [];
  }
  
  // XLSX / XLS
  const buffer = await file.async('arraybuffer');
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];
  
  return XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, defval: '' });
}

/**
 * Parse rows into structured data
 * Auto-detects old format (4 columns) vs new format (2 columns)
 */
function parseRows(data: string[][]): ParsedPaper[] {
  const papers: ParsedPaper[] = [];

  if (!data || data.length < 2) {
    return papers;
  }

  // Auto-detect format from header row
  const header = data[0];
  const isOldFormat = header && header.length >= 4;
  const startRow = isOldFormat ? 2 : 1; // Old format skips 2 header rows, new skips 1

  let currentDate = '';
  let currentYear = new Date().getFullYear();

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    let qpCode = '';
    let paperName = '';

    if (isOldFormat) {
      // Old format: [Date, QP Code, Paper Name, Total Script]
      if (row.length < 3) continue;
      const dateField = String(row[0] ?? '').trim();
      qpCode = String(row[1] ?? '').trim();
      paperName = String(row[2] ?? '').trim();

      if (dateField) {
        const dateMatch = dateField.match(/(\d{2}-\d{2}-\d{4})/);
        if (dateMatch) {
          currentDate = dateMatch[1];
          const yearMatch = currentDate.match(/\d{4}$/);
          if (yearMatch) currentYear = parseInt(yearMatch[0]);
        }
      }
    } else {
      // New format: [QP Code, Paper Name]
      if (row.length < 2) continue;
      qpCode = String(row[0] ?? '').trim();
      paperName = String(row[1] ?? '').trim();
    }

    if (!qpCode || !paperName) continue;

    // Extract subject code and name from paper name
    const { subjectCode, subjectName } = extractSubjectCodeAndName(paperName, qpCode);

    // Extract semester from subject code (e.g., BBA1CJ101 -> 1)
    const semesterMatch = subjectCode.match(/[A-Z]+(\d)/);
    const semester = semesterMatch ? parseInt(semesterMatch[1]) : 1;

    // Extract department code from first 3 chars of subject code
    const departmentCode = subjectCode.replace(/\s/g, '').slice(0, 3).toUpperCase();

    papers.push({
      qpCode,
      paperName,
      subjectCode,
      subjectName,
      examDate: currentDate,
      semester,
      yearOfExam: currentYear,
      departmentCode,
    });
  }

  return papers;
}

/**
 * Extract subject code and name from paper name string
 * Handles 3 formats:
 *   A: "ENG1CJ101 - Introduction to Literature"
 *   B: "Discrete Structures--(Core 3)--(BCAICJ103)"
 *   C: "Basics of Communication (JOU1MNI01)"
 */
function extractSubjectCodeAndName(
  paperName: string,
  fallbackCode: string
): { subjectCode: string; subjectName: string } {
  // Format A: "CODE - Name" (code starts with letters followed by digit, may have parenthesized suffix like (3))
  const formatA = paperName.match(/^([A-Z]{2,4}\d[A-Z0-9]+(?:\([A-Z0-9]+\))?)\s*-\s*(.+)$/i);
  if (formatA) {
    return {
      subjectCode: formatA[1].trim(),
      subjectName: formatA[2].trim(),
    };
  }

  // Format B: "Name--(Type)--(CODE)" — double-dash parenthesized suffix
  const formatB = paperName.match(/^(.+?)--\(.+?\)--\(([A-Z]{2,4}\d[A-Z0-9()\s]*)\)\s*$/i);
  if (formatB) {
    return {
      subjectCode: formatB[2].replace(/[()\s]/g, '').trim(),
      subjectName: formatB[1].trim(),
    };
  }

  // Format C: "Name (CODE)" — simple parenthesized suffix
  const formatC = paperName.match(/^(.+?)\s*\(([A-Z]{2,4}\d[A-Z0-9()\s]*)\)\s*$/i);
  if (formatC) {
    return {
      subjectCode: formatC[2].replace(/[()\s]/g, '').trim(),
      subjectName: formatC[1].trim(),
    };
  }

  // Fallback: use QP code as subject code
  return {
    subjectCode: fallbackCode,
    subjectName: paperName,
  };
}

interface PDFFileMatch {
  file: JSZip.JSZipObject;
  fileName: string;
  folderName: string;
  qpCode: string;
}

/**
 * Find all PDF files in ZIP with their folder info
 */
function findPDFFiles(zip: JSZip): PDFFileMatch[] {
  const pdfs: PDFFileMatch[] = [];
  
  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    if (!relativePath.toLowerCase().endsWith('.pdf')) return;
    
    // Extract folder name and file name
    const pathParts = relativePath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    // Find the subject type folder (MAJOR 1, MINOR 1, MDC, etc.)
    let folderName = 'Major'; // Default
    for (const part of pathParts) {
      if (/^(major|minor|mdc|vac-?sec)/i.test(part)) {
        folderName = part;
        break;
      }
    }

    // Extract QP Code from filename (e.g., "133750_1762152327189.pdf" -> "133750")
    const qpCodeMatch = fileName.match(/^(\d+)/);
    const qpCode = qpCodeMatch ? qpCodeMatch[1] : '';

    pdfs.push({
      file,
      fileName,
      folderName,
      qpCode,
    });
  });
  
  return pdfs;
}

/**
 * Find PDF file matching QP Code
 */
function findPDFForQPCode(pdfs: PDFFileMatch[], qpCode: string): PDFFileMatch | null {
  return pdfs.find(pdf => pdf.qpCode === qpCode) || null;
}

/**
 * Validate ZIP structure
 */
export async function validateBulkUploadZIP(zipFile: File): Promise<{
  valid: boolean;
  csvFound: boolean;
  pdfCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let csvFound = false;
  let pdfCount = 0;

  try {
    const zip = await JSZip.loadAsync(zipFile);
    
    zip.forEach((relativePath, file) => {
      if (file.dir) return;
      const lower = relativePath.toLowerCase();
      
      if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        csvFound = true;
      }
      
      if (lower.endsWith('.pdf')) {
        pdfCount++;
      }
    });

    if (!csvFound) {
      errors.push('No CSV or XLSX metadata file found in the ZIP archive');
    }

    if (pdfCount === 0) {
      errors.push('No PDF files found in the ZIP archive');
    }

  } catch (error) {
    errors.push('Invalid ZIP file');
  }

  return {
    valid: errors.length === 0,
    csvFound,
    pdfCount,
    errors,
  };
}
