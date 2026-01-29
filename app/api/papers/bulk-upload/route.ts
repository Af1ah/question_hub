import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { 
  adminAddDocument, 
  adminGetDocuments, 
  getAdminStorage, 
  getAdminDb,
  FieldValue,
  Timestamp 
} from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';
import { generatePaperFileName, generatePaperSlug } from '@/lib/utils';

/**
 * POST /api/papers/bulk-upload
 * Process bulk upload ZIP (admin only)
 * Uses Admin SDK to bypass security rules
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Load ZIP
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find CSV file
    let csvContent = '';
    
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (path.toLowerCase().endsWith('.csv') && !zipEntry.dir) {
        csvContent = await zipEntry.async('text');
        break;
      }
    }

    if (!csvContent) {
      return NextResponse.json(
        { error: 'No CSV file found in ZIP' },
        { status: 400 }
      );
    }

    // Parse CSV
    const parsed = Papa.parse<string[]>(csvContent, { skipEmptyLines: true });
    
    if (!parsed.data || parsed.data.length < 3) {
      return NextResponse.json(
        { error: 'CSV file is empty or invalid' },
        { status: 400 }
      );
    }

    // Find PDF files
    const pdfFiles: Map<string, JSZip.JSZipObject> = new Map();
    const pdfFolders: Map<string, string> = new Map();

    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (path.toLowerCase().endsWith('.pdf') && !zipEntry.dir) {
        const fileName = path.split('/').pop() || '';
        const qpCodeMatch = fileName.match(/^(\d+)/);
        if (qpCodeMatch) {
          pdfFiles.set(qpCodeMatch[1], zipEntry);
          
          // Extract folder name for subject type
          const pathParts = path.split('/');
          for (const part of pathParts) {
            if (/^(major|minor|mdc|vac-?sec)/i.test(part)) {
              pdfFolders.set(qpCodeMatch[1], part);
              break;
            }
          }
        }
      }
    }

    // Get or create subject types using Admin SDK
    const subjectTypes = await adminGetDocuments<{ id: string; name: string }>(COLLECTIONS.SUBJECT_TYPES);
    const subjectTypeMap = new Map(subjectTypes.map((st) => [st.name, st.id]));

    // Check existing papers to avoid duplicates using Admin SDK
    // Note: adminGetDocuments doesn't support complex queries efficiently without helpers
    // So we fetch all papers first? No, that's too heavy.
    // We can use direct Firestore query via getAdminDb
    const adminDb = getAdminDb();

    // Process CSV rows
    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    let currentDate = '';
    let currentYear = new Date().getFullYear();

    // Skip header rows (typically first 2)
    for (let i = 2; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      if (!row || row.length < 3) continue;

      const dateField = row[0]?.trim() || '';
      const qpCode = row[1]?.trim() || '';
      const paperName = row[2]?.trim() || '';

      if (!qpCode || !paperName) continue;

      // Update date if present
      if (dateField) {
        const dateMatch = dateField.match(/(\d{2}-\d{2}-\d{4})/);
        if (dateMatch) {
          currentDate = dateMatch[1];
          const yearMatch = currentDate.match(/\d{4}$/);
          if (yearMatch) currentYear = parseInt(yearMatch[0]);
        }
      }

      try {
        // Find PDF file
        const pdfFile = pdfFiles.get(qpCode);
        if (!pdfFile) {
          results.errors.push(`PDF not found for QP Code: ${qpCode}`);
          results.failed++;
          continue;
        }

        // Check for duplicate QP code
        const papersRef = adminDb.collection(COLLECTIONS.PAPERS);
        const duplicateSnapshot = await papersRef.where('qnNumber', '==', qpCode).limit(1).get();
        
        if (!duplicateSnapshot.empty) {
          results.errors.push(`Duplicate QP Code: ${qpCode}`);
          results.failed++;
          continue;
        }

        // Parse subject info
        const paperParts = paperName.split(' - ');
        const subjectCode = paperParts[0]?.trim() || qpCode;
        const subjectName = paperParts.slice(1).join(' - ').trim() || paperName;

        // Get semester from code
        const semMatch = subjectCode.match(/[A-Z]+(\d)/);
        const semester = semMatch ? parseInt(semMatch[1]) : 1;

        // Get subject type
        const folderName = pdfFolders.get(qpCode) || 'Major';
        const normalizedType = normalizeSubjectType(folderName);
        let subjectTypeId = subjectTypeMap.get(normalizedType);

        if (!subjectTypeId) {
          // Create new subject type
          subjectTypeId = await adminAddDocument(COLLECTIONS.SUBJECT_TYPES, { name: normalizedType });
          subjectTypeMap.set(normalizedType, subjectTypeId);
        }

        // Upload PDF using Admin SDK Storage
        const pdfBuffer = await pdfFile.async('nodebuffer');
        const fileName = generatePaperFileName(subjectCode, currentYear, qpCode);
        const fullFileName = `${fileName}.pdf`;
        
        const bucket = getAdminStorage().bucket();
        const fileRef = bucket.file(`papers/${fullFileName}`);
        
        await fileRef.save(pdfBuffer, {
          metadata: {
            contentType: 'application/pdf',
          },
        });
        
        // Make file public to get a URL
        await fileRef.makePublic();
        const fileUrl = `https://storage.googleapis.com/${bucket.name}/papers/${fullFileName}`;
        const [metadata] = await fileRef.getMetadata();
        const fileSize = typeof metadata.size === 'number' ? metadata.size : parseInt(String(metadata.size) || '0');

        // Create paper document
        await adminAddDocument(COLLECTIONS.PAPERS, {
          qnNumber: qpCode,
          fileName: fullFileName,
          subjectCode: subjectCode.toUpperCase(),
          subjectName,
          subjectId: '', // Subject linking logic intentionally skipped for simplicity in bulk upload as per original code
          departmentId: '',
          subjectTypeId,
          programType: 'FYUGP',
          semester,
          yearOfExam: currentYear,
          examDate: currentDate,
          description: '',
          fileUrl,
          fileSize,
          uploadedBy: session.user.id,
          uploadedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          downloadCount: 0,
          isPublished: true,
          seoSlug: generatePaperSlug(subjectName, currentYear, qpCode),
        });

        results.processed++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Failed to process ${qpCode}: ${msg}`);
        results.failed++;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    );
  }
}

function normalizeSubjectType(folderName: string): string {
  const normalized = folderName.toLowerCase().trim();
  if (normalized.startsWith('major')) return 'Major';
  if (normalized.startsWith('minor')) return 'Minor';
  if (normalized === 'mdc') return 'MDC';
  if (normalized === 'vac-sec' || normalized === 'vacsec') return 'VAC-SEC';
  return folderName;
}
