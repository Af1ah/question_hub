import JSZip from 'jszip';
import Papa from 'papaparse';
import { BulkUploadItem, BulkUploadResult, Paper } from '@/types';
import { createPaper } from './papers';
import { getOrCreateSubjectType, normalizeSubjectTypeName } from './subjectTypes';
import { getDepartments, createDepartment } from './departments';
import { parseExamDate } from '@/lib/utils';
import { Timestamp } from '@/lib/firebase/firestore';

// ============================================================
// CSV Parsing Types
// ============================================================

interface CSVRow {
  'Date of Exam': string;
  'QP Code': string;
  'Paper Name': string;
  'Total Script': string;
}

interface ParsedPaper {
  qpCode: string;
  paperName: string;
  subjectCode: string;
  subjectName: string;
  examDate: string;
  semester: number;
  yearOfExam: number;
}

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
    
    // Find CSV file
    const csvFile = findCSVFile(zip);
    if (!csvFile) {
      throw new Error('CSV file not found in ZIP archive');
    }

    onProgress?.(0, 0, 'Parsing CSV data...');
    
    // Parse CSV
    const csvContent = await csvFile.async('text');
    const parsedPapers = parseCSVContent(csvContent);

    if (parsedPapers.length === 0) {
      throw new Error('No valid entries found in CSV file');
    }

    // Find PDF files and their folders
    const pdfFiles = findPDFFiles(zip);
    
    onProgress?.(0, parsedPapers.length, 'Processing papers...');

    // Get or create default department
    let departments = await getDepartments();
    let defaultDepartmentId = departments[0]?.id;
    
    if (!defaultDepartmentId) {
      const newDept = await createDepartment(
        { name: 'General', code: 'GEN' },
        uploadedBy
      );
      defaultDepartmentId = newDept.id;
    }

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

        // Create paper
        const createdPaper = await createPaper(
          {
            subjectCode: paper.subjectCode,
            subjectName: paper.subjectName,
            qnNumber: paper.qpCode,
            departmentId: defaultDepartmentId,
            subjectTypeId: subjectType.id,
            programType: 'FYUGP', // From folder structure
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
 * Find CSV file in ZIP
 */
function findCSVFile(zip: JSZip): JSZip.JSZipObject | null {
  let csvFile: JSZip.JSZipObject | null = null;
  
  zip.forEach((relativePath, file) => {
    if (relativePath.toLowerCase().endsWith('.csv') && !file.dir) {
      csvFile = file;
    }
  });
  
  return csvFile;
}

/**
 * Parse CSV content into structured data
 * Handles the complex format with multi-line date fields
 */
function parseCSVContent(content: string): ParsedPaper[] {
  const papers: ParsedPaper[] = [];
  
  // Parse CSV
  const parsed = Papa.parse<string[]>(content, {
    skipEmptyLines: true,
  });

  if (!parsed.data || parsed.data.length < 3) {
    return papers;
  }

  // Skip header rows (first 2 rows based on reference CSV)
  let currentDate = '';
  let currentYear = 2025; // Default
  
  for (let i = 2; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    
    if (!row || row.length < 3) continue;
    
    const dateField = row[0]?.trim() || '';
    const qpCode = row[1]?.trim() || '';
    const paperName = row[2]?.trim() || '';
    
    if (!qpCode || !paperName) continue;
    
    // Update date if present
    if (dateField) {
      // Extract date from formats like "03-11-2025:\n2.00 PM" or "03-11-2025: 2.00 PM"
      const dateMatch = dateField.match(/(\d{2}-\d{2}-\d{4})/);
      if (dateMatch) {
        currentDate = dateMatch[1];
        // Extract year
        const yearMatch = currentDate.match(/\d{4}$/);
        if (yearMatch) {
          currentYear = parseInt(yearMatch[0]);
        }
      }
    }

    // Parse paper name to extract subject code and name
    // Format: "BBA3CJ201 - Domestic Logistic Management" or "BCA3CJ202 - Computer Networks"
    const paperParts = paperName.split(' - ');
    const subjectCode = paperParts[0]?.trim() || qpCode;
    const subjectName = paperParts.slice(1).join(' - ').trim() || paperName;

    // Extract semester from subject code (e.g., BBA3CJ201 -> 3)
    const semesterMatch = subjectCode.match(/[A-Z]+(\d)/);
    const semester = semesterMatch ? parseInt(semesterMatch[1]) : 1;

    papers.push({
      qpCode,
      paperName,
      subjectCode,
      subjectName,
      examDate: currentDate,
      semester,
      yearOfExam: currentYear,
    });
  }

  return papers;
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
      
      if (relativePath.toLowerCase().endsWith('.csv')) {
        csvFound = true;
      }
      
      if (relativePath.toLowerCase().endsWith('.pdf')) {
        pdfCount++;
      }
    });

    if (!csvFound) {
      errors.push('No CSV file found in the ZIP archive');
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
