import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { getAdminStorage, getAdminDb, adminGetDocuments } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';

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
    const bucket = getAdminStorage().bucket();
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

    // 3. Find CSV
    let csvContent = '';
    let csvFileName = '';
    
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (path.toLowerCase().endsWith('.csv') && !zipEntry.dir) {
        csvContent = await zipEntry.async('text');
        csvFileName = path;
        break;
      }
    }

    if (!csvContent) {
      return NextResponse.json({ 
        success: false, 
        error: 'No CSV file found in the ZIP archive.' 
      });
    }

    // 4. Parse CSV
    const parsed = Papa.parse<string[]>(csvContent, { skipEmptyLines: true });
    
    if (!parsed.data || parsed.data.length < 3) {
      return NextResponse.json({ 
        success: false, 
        error: 'CSV file is empty or missing header/data rows.' 
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
    
    // Skip first 2 headers (as per original logic)
    for (let i = 2; i < parsed.data.length; i++) {
        const row = parsed.data[i];
        if (!row || row.length < 3) continue;

        const dateField = row[0]?.trim();
        const qpCode = row[1]?.trim();
        const paperName = row[2]?.trim();

        if (!qpCode || !paperName) continue;

        // Validation status
        let status = 'ready';
        let issues = [];

        // Find PDF file that contains the QP Code in its name
        // (Assuming QP Code is unique enough to not match random parts of other filenames)
        const foundPdf = pdfFiles.find(f => f.name.includes(qpCode));

        if (!foundPdf) {
            status = 'error';
            issues.push('PDF missing in ZIP');
        }

        if (existingQnNumbers.has(qpCode)) {
            status = 'error';
            issues.push('Duplicate QP Code');
        }

        if (status === 'ready') validCount++;

        let folderType = 'Major (Default)';
        if (foundPdf) {
             const pathParts = foundPdf.path.split('/');
             for (const part of pathParts) {
                if (/^(major|minor|mdc|vac-?sec)/i.test(part)) {
                   folderType = part;
                   break;
                }
             }
        }

        previewItems.push({
            id: i, // row index
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
