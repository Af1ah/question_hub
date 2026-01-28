import {
  adminGetDocuments,
  adminGetDocument,
  adminAddDocument,
  adminUpdateDocument,
  adminDeleteDocument,
  adminDocumentExists,
  Timestamp,
} from '@/lib/firebase/admin';
import { COLLECTIONS, DEFAULT_PAGE_SIZE } from '@/constants';
import { Paper, PaperFormData, PaperFilters, PaginatedResponse } from '@/types';
import { generatePaperFileName, generatePaperSlug } from '@/lib/utils';
import { uploadPaperFile, deletePaperFile } from '@/lib/firebase/storage';
import { getAdminDb } from '@/lib/firebase/admin';

// ============================================================
// Paper Service (Server-Side Admin SDK)
// ============================================================

/**
 * Create a new paper
 */
export async function createPaper(
  data: PaperFormData,
  uploadedBy: string
): Promise<Paper> {
  // Validate required fields
  if (!data.file) {
    throw new Error('File is required');
  }

  // Check for duplicate QN number
  const existingPapers = await adminGetDocuments<Paper>(COLLECTIONS.PAPERS, (ref) => 
    ref.where('qnNumber', '==', data.qnNumber)
  );

  if (existingPapers.length > 0) {
    throw new Error('A paper with this question number already exists');
  }

  // Generate file name and slug
  const fileName = generatePaperFileName(data.subjectCode, data.yearOfExam, data.qnNumber);
  const seoSlug = generatePaperSlug(data.subjectName, data.yearOfExam, data.qnNumber);

  // Upload file to storage (Client SDK used here as it handles File object nicely)
  // Note: If this fails in production (Node.js), we might need an Admin SDK version for storage.
  const uploadResult = await uploadPaperFile(data.file, fileName);

  // Get or create subject
  const subjectId = await getOrCreateSubject(data.subjectCode, data.subjectName, data.departmentId, uploadedBy);

  // Create paper document
  const paperData = {
    qnNumber: data.qnNumber,
    fileName: `${fileName}.${data.file.name.split('.').pop()}`,
    subjectCode: data.subjectCode,
    subjectName: data.subjectName,
    subjectId,
    departmentId: data.departmentId,
    subjectTypeId: data.subjectTypeId,
    programType: data.programType,
    semester: data.semester,
    yearOfExam: data.yearOfExam,
    examDate: data.examDate,
    description: data.description,
    fileUrl: uploadResult.url,
    fileSize: uploadResult.size,
    uploadedBy,
    uploadedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    downloadCount: 0,
    isPublished: true,
    seoSlug,
  };

  const paperId = await adminAddDocument(COLLECTIONS.PAPERS, paperData);

  return {
    id: paperId,
    ...paperData,
  } as Paper;
}

/**
 * Get papers with filtering and pagination
 */
export async function getPapers(
  filters: PaperFilters = {}
): Promise<PaginatedResponse<Paper>> {
  const {
    search,
    subjectCode,
    departmentId,
    subjectTypeId,
    programType,
    semester,
    yearOfExam,
    page = 1,
    limit: limitVal = DEFAULT_PAGE_SIZE,
  } = filters;

  const db = getAdminDb();
  let query = db.collection(COLLECTIONS.PAPERS).where('isPublished', '==', true);

  if (subjectCode) query = query.where('subjectCode', '==', subjectCode);
  if (departmentId) query = query.where('departmentId', '==', departmentId);
  if (subjectTypeId) query = query.where('subjectTypeId', '==', subjectTypeId);
  if (programType) query = query.where('programType', '==', programType);
  if (semester) query = query.where('semester', '==', semester);
  if (yearOfExam) query = query.where('yearOfExam', '==', yearOfExam);

  // Order by newest first
  query = query.orderBy('uploadedAt', 'desc');

  // get total count for pagination (Admin SDK)
  const countSnapshot = await query.count().get();
  const total = countSnapshot.data().count;

  // Pagination
  const offset = (page - 1) * limitVal;
  query = query.offset(offset).limit(limitVal);

  const snapshot = await query.get();
  const documents = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Paper[];

  // Client-side search (if needed) -- reusing logic but be aware limit applies before filtering
  // Ideal solution involves full-text search engine (Algolia/Typesense)
  // For now, if search string is present, we might miss results if we paginate first.
  let filteredDocs = documents;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredDocs = documents.filter(
      (paper) =>
        paper.subjectName.toLowerCase().includes(searchLower) ||
        paper.subjectCode.toLowerCase().includes(searchLower) ||
        paper.qnNumber.toLowerCase().includes(searchLower)
    );
  }

  return {
    items: filteredDocs,
    total, // Note: Total count matches query filters, but not search text
    page,
    limit: limitVal,
    hasMore: offset + documents.length < total,
  };
}

/**
 * Get paper by ID
 */
export async function getPaperById(id: string): Promise<Paper | null> {
  return adminGetDocument<Paper>(COLLECTIONS.PAPERS, id);
}

/**
 * Get paper by SEO slug
 */
export async function getPaperBySlug(slug: string): Promise<Paper | null> {
  const papers = await adminGetDocuments<Paper>(COLLECTIONS.PAPERS, (ref) => 
    ref.where('seoSlug', '==', slug).where('isPublished', '==', true)
  );

  return papers.length > 0 ? papers[0] : null;
}

/**
 * Get papers by uploader
 */
export async function getPapersByUploader(
  uploadedBy: string,
  limitVal?: number
): Promise<Paper[]> {
  const papers = await adminGetDocuments<Paper>(COLLECTIONS.PAPERS, (ref) => {
    let q = ref.where('uploadedBy', '==', uploadedBy).orderBy('uploadedAt', 'desc');
    if (limitVal) q = q.limit(limitVal);
    return q;
  });
  return papers;
}

/**
 * Update paper
 */
export async function updatePaper(
  id: string,
  data: Partial<PaperFormData>
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (data.subjectCode) updates.subjectCode = data.subjectCode;
  if (data.subjectName) updates.subjectName = data.subjectName;
  if (data.departmentId) updates.departmentId = data.departmentId;
  if (data.subjectTypeId) updates.subjectTypeId = data.subjectTypeId;
  if (data.programType) updates.programType = data.programType;
  if (data.semester) updates.semester = data.semester;
  if (data.yearOfExam) updates.yearOfExam = data.yearOfExam;
  if (data.examDate !== undefined) updates.examDate = data.examDate;
  if (data.description !== undefined) updates.description = data.description;

  // Update slug if subject name or year changed
  if (data.subjectName || data.yearOfExam) {
    const paper = await getPaperById(id);
    if (paper) {
      updates.seoSlug = generatePaperSlug(
        data.subjectName || paper.subjectName,
        data.yearOfExam || paper.yearOfExam,
        paper.qnNumber
      );
    }
  }

  await adminUpdateDocument(COLLECTIONS.PAPERS, id, updates);
}

/**
 * Delete paper (soft delete - unpublish)
 */
export async function deletePaper(id: string): Promise<void> {
  await adminUpdateDocument(COLLECTIONS.PAPERS, id, { isPublished: false });
}

/**
 * Permanently delete paper including file
 */
export async function permanentlyDeletePaper(id: string): Promise<void> {
  const paper = await getPaperById(id);
  
  if (paper) {
    // Delete file from storage
    await deletePaperFile(`papers/${paper.fileName}`);
    
    // Delete document
    await adminDeleteDocument(COLLECTIONS.PAPERS, id);
  }
}

/**
 * Increment download count
 */
export async function incrementDownloadCount(id: string): Promise<void> {
  const paper = await getPaperById(id);
  if (paper) {
    await adminUpdateDocument(COLLECTIONS.PAPERS, id, {
      downloadCount: (paper.downloadCount || 0) + 1,
    });
  }
}

/**
 * Get recent papers for homepage
 */
export async function getRecentPapers(limitVal: number = 6): Promise<Paper[]> {
  return adminGetDocuments<Paper>(COLLECTIONS.PAPERS, (ref) => 
    ref.where('isPublished', '==', true).orderBy('uploadedAt', 'desc').limit(limitVal)
  );
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get or create subject from code
 */
async function getOrCreateSubject(
  code: string,
  name: string,
  departmentId: string,
  createdBy: string
): Promise<string> {
  const existingSubjects = await adminGetDocuments<{ id: string }>(COLLECTIONS.SUBJECTS, (ref) => 
    ref.where('code', '==', code)
  );

  if (existingSubjects.length > 0) {
    return existingSubjects[0].id;
  }

  // Create new subject
  return adminAddDocument(COLLECTIONS.SUBJECTS, {
    code,
    name,
    departmentId,
    createdBy,
  });
}
