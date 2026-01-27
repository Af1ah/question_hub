import {
  getDocuments,
  getDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  getPaginatedDocuments,
  where,
  orderBy,
  Timestamp,
} from '@/lib/firebase/firestore';
import { COLLECTIONS, DEFAULT_PAGE_SIZE } from '@/constants';
import { Paper, PaperFormData, PaperFilters, PaginatedResponse } from '@/types';
import { generatePaperFileName, generatePaperSlug } from '@/lib/utils';
import { uploadPaperFile, deletePaperFile } from '@/lib/firebase/storage';

// ============================================================
// Paper Service
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
  const existingPapers = await getDocuments<Paper>(COLLECTIONS.PAPERS, [
    where('qnNumber', '==', data.qnNumber),
  ]);

  if (existingPapers.length > 0) {
    throw new Error('A paper with this question number already exists');
  }

  // Generate file name and slug
  const fileName = generatePaperFileName(data.subjectCode, data.yearOfExam, data.qnNumber);
  const seoSlug = generatePaperSlug(data.subjectName, data.yearOfExam, data.qnNumber);

  // Upload file to storage
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

  const paperId = await addDocument(COLLECTIONS.PAPERS, paperData);

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
    limit = DEFAULT_PAGE_SIZE,
  } = filters;

  // Build query constraints
  const constraints = [];

  // Only show published papers
  constraints.push(where('isPublished', '==', true));

  if (subjectCode) {
    constraints.push(where('subjectCode', '==', subjectCode));
  }

  if (departmentId) {
    constraints.push(where('departmentId', '==', departmentId));
  }

  if (subjectTypeId) {
    constraints.push(where('subjectTypeId', '==', subjectTypeId));
  }

  if (programType) {
    constraints.push(where('programType', '==', programType));
  }

  if (semester) {
    constraints.push(where('semester', '==', semester));
  }

  if (yearOfExam) {
    constraints.push(where('yearOfExam', '==', yearOfExam));
  }

  // Order by newest first
  constraints.push(orderBy('uploadedAt', 'desc'));

  // Get paginated results
  const { documents, hasMore } = await getPaginatedDocuments<Paper>(
    COLLECTIONS.PAPERS,
    constraints,
    limit
  );

  // If search is provided, filter results client-side
  // (Firestore doesn't support full-text search)
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
    total: filteredDocs.length,
    page,
    limit,
    hasMore,
  };
}

/**
 * Get paper by ID
 */
export async function getPaperById(id: string): Promise<Paper | null> {
  return getDocument<Paper>(COLLECTIONS.PAPERS, id);
}

/**
 * Get paper by SEO slug
 */
export async function getPaperBySlug(slug: string): Promise<Paper | null> {
  const papers = await getDocuments<Paper>(COLLECTIONS.PAPERS, [
    where('seoSlug', '==', slug),
    where('isPublished', '==', true),
  ]);

  return papers.length > 0 ? papers[0] : null;
}

/**
 * Get papers by uploader
 */
export async function getPapersByUploader(
  uploadedBy: string,
  limit?: number
): Promise<Paper[]> {
  const constraints = [
    where('uploadedBy', '==', uploadedBy),
    orderBy('uploadedAt', 'desc'),
  ];

  return getDocuments<Paper>(COLLECTIONS.PAPERS, constraints);
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

  await updateDocument(COLLECTIONS.PAPERS, id, updates);
}

/**
 * Delete paper (soft delete - unpublish)
 */
export async function deletePaper(id: string): Promise<void> {
  await updateDocument(COLLECTIONS.PAPERS, id, { isPublished: false });
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
    await deleteDocument(COLLECTIONS.PAPERS, id);
  }
}

/**
 * Increment download count
 */
export async function incrementDownloadCount(id: string): Promise<void> {
  const paper = await getPaperById(id);
  if (paper) {
    await updateDocument(COLLECTIONS.PAPERS, id, {
      downloadCount: (paper.downloadCount || 0) + 1,
    });
  }
}

/**
 * Get recent papers for homepage
 */
export async function getRecentPapers(limit: number = 6): Promise<Paper[]> {
  return getDocuments<Paper>(COLLECTIONS.PAPERS, [
    where('isPublished', '==', true),
    orderBy('uploadedAt', 'desc'),
  ]);
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
  const existingSubjects = await getDocuments<{ id: string }>(COLLECTIONS.SUBJECTS, [
    where('code', '==', code),
  ]);

  if (existingSubjects.length > 0) {
    return existingSubjects[0].id;
  }

  // Create new subject
  return addDocument(COLLECTIONS.SUBJECTS, {
    code,
    name,
    departmentId,
    createdBy,
  });
}
