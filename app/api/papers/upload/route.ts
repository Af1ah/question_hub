import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  adminAddDocument, 
  adminGetDocuments, 
  getStorageBucket,
  getAdminDb,
  FieldValue 
} from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';
import { generatePaperFileName, generatePaperSlug } from '@/lib/utils';

/**
 * POST /api/papers/upload
 * Upload a new paper (requires authentication - teacher or admin)
 * Uses Admin SDK to bypass security rules (auth is checked via session)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only allow teachers and admins
    if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only teachers and admins can upload papers' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    
    const file = formData.get('file') as File | null;
    const subjectCode = formData.get('subjectCode') as string;
    const subjectName = formData.get('subjectName') as string;
    const qnNumber = formData.get('qnNumber') as string;
    const departmentId = formData.get('departmentId') as string || '';
    const subjectTypeId = formData.get('subjectTypeId') as string;
    const programType = formData.get('programType') as string;
    const semester = parseInt(formData.get('semester') as string);
    const yearOfExam = parseInt(formData.get('yearOfExam') as string);
    const description = formData.get('description') as string || '';

    // Validate required fields
    if (!file || !subjectCode || !subjectName || !qnNumber || !subjectTypeId || !programType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Check for duplicate QN number using Admin SDK
    const existingPapersSnapshot = await adminDb
      .collection(COLLECTIONS.PAPERS)
      .where('qnNumber', '==', qnNumber)
      .limit(1)
      .get();

    if (!existingPapersSnapshot.empty) {
      return NextResponse.json(
        { error: 'A paper with this question number already exists' },
        { status: 409 }
      );
    }

    // Generate file name and slug
    const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const fileName = generatePaperFileName(subjectCode, yearOfExam, qnNumber);
    const fullFileName = `${fileName}.${extension}`;
    const seoSlug = generatePaperSlug(subjectName, yearOfExam, qnNumber);

    // Upload file to storage using Admin SDK
    const bucket = getStorageBucket();
    const fileRef = bucket.file(`papers/${fullFileName}`);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type || 'application/pdf',
      },
    });
    
    // Make file public
    await fileRef.makePublic();
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/papers/${fullFileName}`;

    // Get or create subject using Admin SDK
    let subjectId = '';
    const existingSubjectsSnapshot = await adminDb
      .collection(COLLECTIONS.SUBJECTS)
      .where('code', '==', subjectCode.toUpperCase())
      .limit(1)
      .get();

    if (!existingSubjectsSnapshot.empty) {
      subjectId = existingSubjectsSnapshot.docs[0].id;
    } else {
      subjectId = await adminAddDocument(COLLECTIONS.SUBJECTS, {
        code: subjectCode.toUpperCase(),
        name: subjectName,
        departmentId,
        createdBy: session.user.id,
      });
    }

    // Create paper document using Admin SDK
    const paperData = {
      qnNumber,
      fileName: fullFileName,
      subjectCode: subjectCode.toUpperCase(),
      subjectName,
      subjectId,
      departmentId,
      subjectTypeId,
      programType,
      semester,
      yearOfExam,
      description,
      fileUrl,
      fileSize: buffer.length,
      uploadedBy: session.user.id,
      uploadedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      downloadCount: 0,
      isPublished: true,
      seoSlug,
    };

    const paperId = await adminAddDocument(COLLECTIONS.PAPERS, paperData);

    return NextResponse.json({
      success: true,
      id: paperId,
      seoSlug,
    });
  } catch (error) {
    console.error('Error uploading paper:', error);
    return NextResponse.json(
      { error: 'Failed to upload paper' },
      { status: 500 }
    );
  }
}
