import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import JSZip from 'jszip';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { getStorageBucket, getAdminDb, adminGetDocuments } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';

// ============================================================
// Subject Code Extraction (supports 3 formats)
// ============================================================

function extractSubjectCodeAndName(
  paperName: string,
  fallbackCode: string
): { subjectCode: string; subjectName: string } {
  // Format A: "CODE - Name"
  const formatA = paperName.match(/^([A-Z]{2,4}\d[A-Z0-9]+(?:\([A-Z0-9]+\))?)\s*-\s*(.+)$/i);
  if (formatA) {
    return { subjectCode: formatA[1].trim(), subjectName: formatA[2].trim() };
  }
  // Format B: "Name--(Type)--(CODE)"
  const formatB = paperName.match(/^(.+?)--\(.+?\)--\(([A-Z]{2,4}\d[A-Z0-9()\s]*)\)\s*$/i);
  if (formatB) {
    return { subjectCode: formatB[2].replace(/[()\s]/g, '').trim(), subjectName: formatB[1].trim() };
  }
  // Format C: "Name (CODE)"
  const formatC = paperName.match(/^(.+?)\s*\(([A-Z]{2,4}\d[A-Z0-9()\s]*)\)\s*$/i);
  if (formatC) {
    return { subjectCode: formatC[2].replace(/[()\s]/g, '').trim(), subjectName: formatC[1].trim() };
  }
  return { subjectCode: fallbackCode, subjectName: paperName };
}

export const dynamic = 'force-dynamic';

/**
 * POST /api/papers/bulk-upload/analyze
 * Analyzes a ZIP file from Firebase Storage (temp location)
 * Returns preview of what will be processed
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    // 1. Download ZIP from Storage
    const bucket = getStorageBucket();
    // Assuming filePath is relative to bucket root, e.g., "temp/..."
    const file = bucket.file(filePath);
    
    // Check if exists
    const [exists] = await file.exists();
    if (!exists) {
         return NextResponse.json({ error: 'File not found in staging' }, { status: 404 });
    }

    const [buffer] = await file.download();
    
    // 2. Load ZIP
    const zip = await JSZip.loadAsync(buffer);

    // 3. Find metadata file (CSV preferred, XLSX fallback)
    let metadataRows: string[][] = [];
    let csvFileName = '';
    let csvFile: JSZip.JSZipObject | null = null;
    let xlsxFile: JSZip.JSZipObject | null = null;
    
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;
      const lower = path.toLowerCase();
      if (lower.endsWith('.csv') && !csvFile) {
        csvFile = zipEntry;
        csvFileName = path;
      } else if ((lower.endsWith('.xlsx') || lower.endsWith('.xls')) && !xlsxFile) {
        xlsxFile = zipEntry;
        if (!csvFileName) csvFileName = path;
      }
    }

    if (csvFile) {
      const csvContent = await csvFile.async('text');
      const parsed = Papa.parse<string[]>(csvContent, { skipEmptyLines: true });
      metadataRows = parsed.data || [];
    } else if (xlsxFile) {
      const buffer = await xlsxFile.async('nodebuffer');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (firstSheet) {
        metadataRows = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, defval: '' });
      }
      csvFileName = xlsxFile.name;
    }

    if (metadataRows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No CSV or XLSX metadata file found in the ZIP archive.' 
      });
    }

    if (metadataRows.length < 2) {
      return NextResponse.json({ 
        success: false, 
        error: 'Metadata file is empty or missing data rows.' 
      });
    }

    // 5. Index PDF files in ZIP
    const pdfFiles: Array<{ name: string; entry: JSZip.JSZipObject; path: string }> = [];
    
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (path.toLowerCase().endsWith('.pdf') && !zipEntry.dir) {
        const fileName = path.split('/').pop() || '';
        pdfFiles.push({ name: fileName, entry: zipEntry, path });
      }
    }

    // 6. Check duplicates in DB (Batch check?)
    // This is hard to batch efficiently without checking every single ID. 
    // We can fetch ALL paper QN numbers? Or just check one by one in the processing step?
    // For "Preview", maybe we skip DB duplicate check or do a "best effort"?
    // User wants to see "mapped correctly".
    // Let's rely on the user to check the list.
    // Or we can fetch all papers (qnNumber projection) to check duplicates.
    // Given it's a bulk upload, it's worth avoiding 50 DB calls here if possible.
    // Fetch all papers qnNumbers?
    const adminDb = getAdminDb();
    const papersSnapshot = await adminDb.collection(COLLECTIONS.PAPERS).select('qnNumber').get();
    const existingQnNumbers = new Set(papersSnapshot.docs.map(doc => doc.data().qnNumber));

    // 7. Process Rows to Generate Preview
    const previewItems = [];
    let validCount = 0;
    
    // Track QP codes seen in this CSV to detect duplicates within the file
    const seenQPCodesInCSV = new Set<string>();
    
    // 7. Auto-detect CSV format and process rows
    const header = metadataRows[0];
    const isOldFormat = header && header.length >= 4;
    const startRow = isOldFormat ? 2 : 1;
    
    for (let i = startRow; i < metadataRows.length; i++) {
        const row = metadataRows[i];
        if (!row) continue;

        let dateField = '';
        let qpCode = '';
        let paperName = '';

        if (isOldFormat) {
          if (row.length < 3) continue;
          dateField = String(row[0] ?? '').trim();
          qpCode = String(row[1] ?? '').trim();
          paperName = String(row[2] ?? '').trim();
        } else {
          if (row.length < 2) continue;
          qpCode = String(row[0] ?? '').trim();
          paperName = String(row[1] ?? '').trim();
        }

        if (!qpCode || !paperName) continue;

        // Validation status
        let status = 'ready';
        let issues = [];

        // Find PDF file that contains the QP Code in its name
        const foundPdf = pdfFiles.find(f => f.name.includes(qpCode));

        if (!foundPdf) {
            status = 'error';
            issues.push('PDF missing in ZIP');
        }

        // Check for duplicate QP code in database
        if (existingQnNumbers.has(qpCode)) {
            status = 'error';
            issues.push('Already exists in database');
        }
        
        // Check for duplicate QP code within this CSV file
        if (seenQPCodesInCSV.has(qpCode)) {
            status = 'error';
            issues.push('Duplicate in CSV (will be skipped)');
        } else {
            seenQPCodesInCSV.add(qpCode);
        }

        if (status === 'ready') validCount++;

        let folderType = 'Major (Default)';
        if (foundPdf) {
             const pathParts = foundPdf.path.split('/');
             for (const part of pathParts) {
                if (/^(major|minor|mdc|vac-?sec|aec|sec)/i.test(part)) {
                   folderType = part;
                   break;
                }
             }
        }

        // Extract subject code for display
        const { subjectCode } = extractSubjectCodeAndName(paperName, qpCode);

        previewItems.push({
            id: i,
            date: dateField,
            qpCode,
            paperName,
            status,
            issues,
            detectedType: folderType
        });
    }

    return NextResponse.json({
        success: true,
        summary: {
            totalRows: previewItems.length,
            validCount,
            pdfCount: pdfFiles.length
        },
        items: previewItems,
        csvFileName
    });

  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: 'Failed to analyze ZIP file' }, { status: 500 });
  }
}
