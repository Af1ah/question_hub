import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addDocument, Timestamp, where, getDocuments } from '@/lib/firebase/firestore';
import { uploadPaperFile } from '@/lib/firebase/storage';
import { COLLECTIONS } from '@/constants';
import { generatePaperFileName, generatePaperSlug } from '@/lib/utils';

/**
 * POST /api/papers/upload
 * Upload a new paper (requires authentication)
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

    // Check for duplicate QN number
    const existingPapers = await getDocuments(COLLECTIONS.PAPERS, [
      where('qnNumber', '==', qnNumber),
    ]);

    if (existingPapers.length > 0) {
      return NextResponse.json(
        { error: 'A paper with this question number already exists' },
        { status: 409 }
      );
    }

    // Generate file name and slug
    const fileName = generatePaperFileName(subjectCode, yearOfExam, qnNumber);
    const seoSlug = generatePaperSlug(subjectName, yearOfExam, qnNumber);

    // Upload file to storage
    const uploadResult = await uploadPaperFile(file, fileName);

    // Get or create subject
    let subjectId = '';
    const existingSubjects = await getDocuments(COLLECTIONS.SUBJECTS, [
      where('code', '==', subjectCode.toUpperCase()),
    ]);

    if (existingSubjects.length > 0) {
      subjectId = (existingSubjects[0] as { id: string }).id;
    } else {
      subjectId = await addDocument(COLLECTIONS.SUBJECTS, {
        code: subjectCode.toUpperCase(),
        name: subjectName,
        departmentId,
        createdBy: session.user.id,
      });
    }

    // Create paper document
    const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const paperData = {
      qnNumber,
      fileName: `${fileName}.${extension}`,
      subjectCode: subjectCode.toUpperCase(),
      subjectName,
      subjectId,
      departmentId,
      subjectTypeId,
      programType,
      semester,
      yearOfExam,
      description,
      fileUrl: uploadResult.url,
      fileSize: uploadResult.size,
      uploadedBy: session.user.id,
      uploadedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      downloadCount: 0,
      isPublished: true,
      seoSlug,
    };

    const paperId = await addDocument(COLLECTIONS.PAPERS, paperData);

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
