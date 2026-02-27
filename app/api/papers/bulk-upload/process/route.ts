import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import JSZip from 'jszip';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  getStorageBucket, 
  getAdminDb, 
  adminAddDocument, 
  FieldValue 
} from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';
import { generatePaperFileName, generatePaperSlug } from '@/lib/utils';
import { PaperInput } from '@/types';

export const dynamic = 'force-dynamic';

function normalizeSubjectType(folderName: string): string {
  const normalized = folderName.toLowerCase().trim();
  if (normalized.startsWith('major')) return 'Major';
  if (normalized.startsWith('minor')) return 'Minor';
  if (normalized === 'mdc') return 'MDC';
  if (normalized === 'vac-sec' || normalized === 'vacsec') return 'VAC-SEC';
  if (normalized.startsWith('aec')) return 'AEC';
  if (normalized === 'sec') return 'SEC';
  return folderName;
}

// Subject code extraction (supports 3 formats)
function extractSubjectCodeAndName(
  paperName: string,
  fallbackCode: string
): { subjectCode: string; subjectName: string } {
  const formatA = paperName.match(/^([A-Z]{2,4}\d[A-Z0-9]+(?:\([A-Z0-9]+\))?)\s*-\s*(.+)$/i);
  if (formatA) {
    return { subjectCode: formatA[1].trim(), subjectName: formatA[2].trim() };
  }
  const formatB = paperName.match(/^(.+?)--\(.+?\)--\(([A-Z]{2,4}\d[A-Z0-9()\s]*)\)\s*$/i);
  if (formatB) {
    return { subjectCode: formatB[2].replace(/[()\s]/g, '').trim(), subjectName: formatB[1].trim() };
  }
  const formatC = paperName.match(/^(.+?)\s*\(([A-Z]{2,4}\d[A-Z0-9()\s]*)\)\s*$/i);
  if (formatC) {
    return { subjectCode: formatC[2].replace(/[()\s]/g, '').trim(), subjectName: formatC[1].trim() };
  }
  return { subjectCode: fallbackCode, subjectName: paperName };
}

// Department mapping from subject code prefix
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

/**
 * POST /api/papers/bulk-upload/process
 * Processes the validated list of papers from ZIP
 * Streams progress updates via SSE
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') {
    return new Response('Unauthorized', { status: 401 });
  }

  const { filePath } = await request.json();

  if (!filePath) {
     return new Response('No file path provided', { status: 400 });
  }

  // Set up SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        sendEvent({ type: 'start', message: 'Initializing upload process...' });

        // 1. Download ZIP
        const bucket = getStorageBucket();
        const file = bucket.file(filePath);
        
        if (!(await file.exists())[0]) {
             sendEvent({ type: 'error', message: 'File expired or missing' });
             controller.close();
             return;
        }

        sendEvent({ type: 'status', message: 'Loading ZIP file...' });
        const [buffer] = await file.download();
        const zip = await JSZip.loadAsync(buffer);

        // 2. Parse metadata (CSV preferred, XLSX fallback)
        let metadataRows: string[][] = [];
        
        // 2.1 Index ZIP files
        const pdfFiles: Array<{ name: string; entry: JSZip.JSZipObject; path: string }> = [];
        let csvEntry: JSZip.JSZipObject | null = null;
        let xlsxEntry: JSZip.JSZipObject | null = null;

        for (const [path, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir) continue;
            const lower = path.toLowerCase();
            if (lower.endsWith('.csv') && !csvEntry) {
                csvEntry = zipEntry;
            } else if ((lower.endsWith('.xlsx') || lower.endsWith('.xls')) && !xlsxEntry) {
                xlsxEntry = zipEntry;
            } else if (lower.endsWith('.pdf')) {
                const fileName = path.split('/').pop() || '';
                pdfFiles.push({ name: fileName, entry: zipEntry, path });
            }
        }

        if (csvEntry) {
          const csvContent = await csvEntry.async('text');
          const parsed = Papa.parse<string[]>(csvContent, { skipEmptyLines: true });
          metadataRows = parsed.data || [];
        } else if (xlsxEntry) {
          const xlsxBuffer = await xlsxEntry.async('nodebuffer');
          const workbook = XLSX.read(xlsxBuffer, { type: 'buffer' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          if (firstSheet) {
            metadataRows = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, defval: '' });
          }
        }

        if (metadataRows.length < 2) {
          sendEvent({ type: 'error', message: 'No valid metadata (CSV/XLSX) found in ZIP' });
          controller.close();
          return;
        }

        // 3. Prepare Subject Types Map
        const adminDb = getAdminDb();
        const typesSnap = await adminDb.collection(COLLECTIONS.SUBJECT_TYPES).get();
        const typeMap = new Map<string, string>();
        typesSnap.docs.forEach(d => typeMap.set(d.data().name, d.id));

        // 3.5 Pre-fetch ALL existing QP codes to prevent duplicates (single query)
        const existingPapersSnap = await adminDb.collection(COLLECTIONS.PAPERS).select('qnNumber').get();
        const existingQPCodes = new Set<string>();
        existingPapersSnap.forEach(doc => {
            const qn = doc.data().qnNumber;
            if (qn) existingQPCodes.add(qn);
        });
        
        // Track QP codes processed in this batch (to handle CSV duplicates)
        const processedQPCodes = new Set<string>();

        // 4. Pre-filter: Build list of valid items (skip duplicates & missing PDFs upfront)
        interface ValidItem {
          qpCode: string;
          paperName: string;
          dateField: string;
          zipEntryObj: typeof pdfFiles[0];
        }
        const validItems: ValidItem[] = [];
        let skippedCount = 0;

        // Auto-detect CSV format
        const header = metadataRows[0];
        const isOldFormat = header && header.length >= 4;
        const startRow = isOldFormat ? 2 : 1;

        // Pre-build department cache
        const deptSnap = await adminDb.collection(COLLECTIONS.DEPARTMENTS).get();
        const deptByCode = new Map<string, string>();
        deptSnap.docs.forEach(d => {
          const code = d.data().code;
          if (code) deptByCode.set(code, d.id);
        });

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

             // Skip duplicates in database
             if (existingQPCodes.has(qpCode)) {
                 skippedCount++;
                 continue;
             }

             // Skip duplicates within CSV
             if (processedQPCodes.has(qpCode)) {
                 skippedCount++;
                 continue;
             }

             // Find matching PDF
             const zipEntryObj = pdfFiles.find(f => f.name.includes(qpCode));
             if (!zipEntryObj) {
                 skippedCount++;
                 continue;
             }

             processedQPCodes.add(qpCode);
             validItems.push({ qpCode, paperName, dateField, zipEntryObj });
        }

        sendEvent({ 
            type: 'status', 
            message: `Found ${validItems.length} valid papers to upload (${skippedCount} skipped as duplicates/missing)` 
        });

        // 5. Process in batches of 10
        const BATCH_SIZE = 10;
        let processedCount = 0;
        let successCount = 0;
        let failCount = 0;
        const totalItems = validItems.length;

        for (let batchStart = 0; batchStart < totalItems; batchStart += BATCH_SIZE) {
            const batch = validItems.slice(batchStart, batchStart + BATCH_SIZE);
            
            sendEvent({ 
                type: 'progress', 
                message: `Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(totalItems / BATCH_SIZE)} (${processedCount}/${totalItems} done)`,
                current: processedCount,
                total: totalItems
            });

            const results = await Promise.allSettled(batch.map(async (item) => {
                const { qpCode, paperName, dateField, zipEntryObj } = item;

                // Parse date
                let currentDate = '';
                let currentYear = new Date().getFullYear();
                if (dateField) {
                    const dMatch = dateField.match(/(\d{2}-\d{2}-\d{4})/);
                    if (dMatch) {
                        currentDate = dMatch[1];
                        const yMatch = currentDate.match(/\d{4}$/);
                        if (yMatch) currentYear = parseInt(yMatch[0]);
                    }
                }

                // Subject Type
                let folderName = 'Major';
                const pathParts = zipEntryObj.path.split('/');
                for (const p of pathParts) {
                    if (/^(major|minor|mdc|vac-?sec|aec|sec)/i.test(p)) {
                        folderName = p;
                        break;
                    }
                }
                
                const normalizedType = normalizeSubjectType(folderName);
                let subjectTypeId = typeMap.get(normalizedType);
                if (!subjectTypeId) {
                    const newTypeRef = await adminAddDocument(COLLECTIONS.SUBJECT_TYPES, { name: normalizedType });
                    subjectTypeId = newTypeRef;
                    typeMap.set(normalizedType, subjectTypeId);
                }

                // Extract PDF buffer
                const pdfBuffer = await zipEntryObj.entry.async('nodebuffer');

                // Extract subject code and name
                const { subjectCode, subjectName } = extractSubjectCodeAndName(paperName, qpCode);
                
                // Resolve department
                const deptCodePrefix = subjectCode.replace(/\s/g, '').slice(0, 3).toUpperCase();
                let departmentId = deptByCode.get(deptCodePrefix) || '';
                if (!departmentId) {
                    const deptName = DEPARTMENT_MAP[deptCodePrefix] || deptCodePrefix;
                    const newDeptRef = await adminAddDocument(COLLECTIONS.DEPARTMENTS, {
                        name: deptName,
                        code: deptCodePrefix,
                        createdBy: session.user.id,
                    });
                    departmentId = newDeptRef;
                    deptByCode.set(deptCodePrefix, departmentId);
                }
                
                const fileName = generatePaperFileName(subjectCode, currentYear, qpCode);
                const fullFileName = `${fileName}.pdf`;

                // Upload PDF to Storage
                const fileRef = bucket.file(`papers/${fullFileName}`);
                await fileRef.save(pdfBuffer, {
                    metadata: { contentType: 'application/pdf' },
                    public: true,
                });
                
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/papers/${fullFileName}`;
                
                // Create DB Doc
                const paperDoc: PaperInput = {
                    qnNumber: qpCode,
                    fileName: fullFileName,
                    subjectCode: subjectCode.toUpperCase(),
                    subjectName,
                    subjectId: '',
                    departmentId,
                    subjectTypeId,
                    programType: 'FYUGP',
                    semester: 1,
                    yearOfExam: currentYear,
                    examDate: currentDate,
                    description: '',
                    fileUrl: publicUrl,
                    fileSize: pdfBuffer.length,
                    uploadedBy: session.user.id,
                    uploadedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    downloadCount: 0,
                    isPublished: true,
                    seoSlug: generatePaperSlug(subjectName, currentYear, qpCode),
                };
                
                const semMatch = subjectCode.match(/[A-Z]+(\d)/);
                if (semMatch) paperDoc.semester = parseInt(semMatch[1]);

                await adminAddDocument(COLLECTIONS.PAPERS, paperDoc);
                existingQPCodes.add(qpCode);
                
                return qpCode;
            }));

            // Tally results from this batch
            for (const result of results) {
                processedCount++;
                if (result.status === 'fulfilled') {
                    successCount++;
                } else {
                    failCount++;
                    const reason = result.reason instanceof Error ? result.reason.message : 'Unknown error';
                    sendEvent({ type: 'log', message: `Error: ${reason}` });
                }
            }
        }
        
        // Clean up temp file
        try {
            await file.delete();
        } catch (e) { /* ignore */ }

        sendEvent({ 
            type: 'done', 
            stats: { processed: processedCount, success: successCount, failed: failCount, skipped: skippedCount } 
        });

      } catch (error) {
         console.error('Process error:', error);
         sendEvent({ type: 'error', message: 'Processing failed unexpectedly' });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
