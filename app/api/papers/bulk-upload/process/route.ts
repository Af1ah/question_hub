import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { 
  getAdminStorage, 
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
  return folderName;
}

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
        const bucket = getAdminStorage().bucket();
        const file = bucket.file(filePath);
        
        if (!(await file.exists())[0]) {
             sendEvent({ type: 'error', message: 'File expired or missing' });
             controller.close();
             return;
        }

        sendEvent({ type: 'status', message: 'Loading ZIP file...' });
        const [buffer] = await file.download();
        const zip = await JSZip.loadAsync(buffer);

        // 2. Parse CSV
        let csvContent = '';
        
        // 2.1 Index PDF files with robust structure
        // Store objects: { name, entry, path }
        const pdfFiles: Array<{ name: string; entry: JSZip.JSZipObject; path: string }> = [];

        // Index ZIP
        for (const [path, zipEntry] of Object.entries(zip.files)) {
            if (path.endsWith('.csv') && !zipEntry.dir) {
                csvContent = await zipEntry.async('text');
            } else if (path.toLowerCase().endsWith('.pdf') && !zipEntry.dir) {
                const fileName = path.split('/').pop() || '';
                pdfFiles.push({ name: fileName, entry: zipEntry, path });
            }
        }

        const parsed = Papa.parse<string[]>(csvContent, { skipEmptyLines: true });
        
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
        let skippedCount = 0;

        // 4. Process Loop
        let processedCount = 0;
        let successCount = 0;
        let failCount = 0;
        const totalEstimate = parsed.data.length - 2; // Rough estimate
        
        // Skip headers
        for (let i = 2; i < parsed.data.length; i++) {
             const row = parsed.data[i];
             if (!row || row.length < 3) continue;

             const dateField = row[0]?.trim() || '';
             const qpCode = row[1]?.trim() || '';
             const paperName = row[2]?.trim() || '';

             if (!qpCode || !paperName) continue;

             // Find matching PDF by inclusion of QP code
             const zipEntryObj = pdfFiles.find(f => f.name.includes(qpCode));
             
             if (!zipEntryObj) {
                 // Log error only if supposed to process
                 console.warn(`PDF not found for QP ${qpCode}`);
                 failCount++;
                 continue; 
             }

             // Check for duplicate QP code in database (using pre-fetched set)
             if (existingQPCodes.has(qpCode)) {
                 sendEvent({ type: 'log', message: `Skipping duplicate QP ${qpCode} (already in database)` });
                 failCount++;
                 processedCount++;
                 continue;
             }
             
             // Check for duplicate QP code within this CSV batch
             if (processedQPCodes.has(qpCode)) {
                 sendEvent({ type: 'log', message: `Skipping duplicate QP ${qpCode} (duplicate in CSV)` });
                 skippedCount++;
                 continue;
             }
             
             // Mark as being processed
             processedQPCodes.add(qpCode);

             // Send progress
             sendEvent({ 
                 type: 'progress', 
                 message: `Processing QP ${qpCode}: ${paperName.substring(0, 20)}...`,
                 current: processedCount + 1,
                 total: totalEstimate
             });

             try {
                 // Parse Metadata
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
                 let folderName = 'Major'; // Default
                 if (zipEntryObj) {
                    const pathParts = zipEntryObj.path.split('/');
                    for (const p of pathParts) {
                        if (/^(major|minor|mdc|vac-?sec)/i.test(p)) {
                        folderName = p;
                        break;
                        }
                    }
                 }
                 
                 const normalizedType = normalizeSubjectType(folderName);
                 let subjectTypeId = typeMap.get(normalizedType);
                 if (!subjectTypeId) {
                     const newTypeRef = await adminAddDocument(COLLECTIONS.SUBJECT_TYPES, { name: normalizedType });
                     subjectTypeId = newTypeRef;
                     typeMap.set(normalizedType, subjectTypeId);
                 }

                 // Upload PDF to Storage
                 const pdfBuffer = await zipEntryObj.entry.async('nodebuffer');
                 
                 // Generate clean filename
                 const paperParts = paperName.split(' - ');
                 const subjectCode = paperParts[0]?.trim() || qpCode;
                 const subjectName = paperParts.slice(1).join(' - ').trim() || paperName;
                 
                 const fileName = generatePaperFileName(subjectCode, currentYear, qpCode);
                 const fullFileName = `${fileName}.pdf`;

                 const fileRef = bucket.file(`papers/${fullFileName}`);
                 await fileRef.save(pdfBuffer, {
                     metadata: { contentType: 'application/pdf' }
                 });
                 await fileRef.makePublic();
                 
                 const publicUrl = `https://storage.googleapis.com/${bucket.name}/papers/${fullFileName}`;
                 
                 // Create DB Doc
                 const paperDoc: PaperInput = {
                    qnNumber: qpCode,
                    fileName: fullFileName,
                    subjectCode: subjectCode.toUpperCase(),
                    subjectName,
                    subjectId: '',
                    departmentId: '',
                    subjectTypeId,
                    programType: 'FYUGP', // Default
                    semester: 1, // Default or extract
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
                 
                 // Attempt semantic extractions
                 const semMatch = subjectCode.match(/[A-Z]+(\d)/);
                 if (semMatch) paperDoc.semester = parseInt(semMatch[1]);

                 await adminAddDocument(COLLECTIONS.PAPERS, paperDoc);
                 
                 // Add to existing set to prevent duplicates within this batch
                 existingQPCodes.add(qpCode);
                 
                 successCount++;
             } catch (err) {
                 console.error(`Error processing ${qpCode}:`, err);
                 sendEvent({ type: 'log', message: `Error uploading ${qpCode}` });
                 failCount++;
             }
             
             processedCount++;
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
