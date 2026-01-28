import { NextRequest, NextResponse } from 'next/server';
import { adminGetDocuments } from '@/lib/firebase/admin';
import { COLLECTIONS, DEFAULT_PAGE_SIZE } from '@/constants';
import { Paper, PaperFilters } from '@/types';

/**
 * GET /api/papers
 * Get papers with optional filters (uses Admin SDK to bypass Firestore rules)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query params
    const filters: PaperFilters = {
      search: searchParams.get('search') || undefined,
      subjectCode: searchParams.get('subjectCode') || undefined,
      departmentId: searchParams.get('departmentId') || undefined,
      subjectTypeId: searchParams.get('subjectTypeId') || undefined,
      programType: searchParams.get('programType') || undefined,
      semester: searchParams.get('semester') 
        ? parseInt(searchParams.get('semester')!) 
        : undefined,
      yearOfExam: searchParams.get('yearOfExam') 
        ? parseInt(searchParams.get('yearOfExam')!) 
        : undefined,
      limit: searchParams.get('limit') 
        ? parseInt(searchParams.get('limit')!) 
        : DEFAULT_PAGE_SIZE,
    };

    // Build query using Admin SDK
    let papers = await adminGetDocuments<Paper>(
      COLLECTIONS.PAPERS,
      (ref) => {
        let query: FirebaseFirestore.Query = ref.where('isPublished', '==', true);

        if (filters.subjectCode) {
          query = query.where('subjectCode', '==', filters.subjectCode);
        }
        if (filters.departmentId) {
          query = query.where('departmentId', '==', filters.departmentId);
        }
        if (filters.subjectTypeId) {
          query = query.where('subjectTypeId', '==', filters.subjectTypeId);
        }
        if (filters.programType) {
          query = query.where('programType', '==', filters.programType);
        }
        if (filters.semester) {
          query = query.where('semester', '==', filters.semester);
        }
        if (filters.yearOfExam) {
          query = query.where('yearOfExam', '==', filters.yearOfExam);
        }
        
        const uploadedBy = new URL(request.url).searchParams.get('uploadedBy');
        if (uploadedBy) {
          query = query.where('uploadedBy', '==', uploadedBy);
        }

        return query.orderBy('uploadedAt', 'desc');
      }
    );

    // Client-side text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      papers = papers.filter(
        (paper) =>
          paper.subjectName.toLowerCase().includes(searchLower) ||
          paper.subjectCode.toLowerCase().includes(searchLower) ||
          paper.qnNumber.toLowerCase().includes(searchLower)
      );
    }

    // Apply limit
    if (filters.limit) {
      papers = papers.slice(0, filters.limit);
    }

    return NextResponse.json({
      items: papers,
      total: papers.length,
      hasMore: false,
    });
  } catch (error) {
    console.error('Error fetching papers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch papers' },
      { status: 500 }
    );
  }
}

