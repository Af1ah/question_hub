import { NextRequest, NextResponse } from 'next/server';
import { 
  getDocuments, 
  where, 
  orderBy, 
  Timestamp 
} from '@/lib/firebase/firestore';
import { COLLECTIONS, DEFAULT_PAGE_SIZE } from '@/constants';
import { Paper, PaperFilters } from '@/types';

/**
 * GET /api/papers
 * Get papers with optional filters
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

    // Build query constraints
    const constraints = [];
    constraints.push(where('isPublished', '==', true));

    if (filters.subjectCode) {
      constraints.push(where('subjectCode', '==', filters.subjectCode));
    }
    if (filters.departmentId) {
      constraints.push(where('departmentId', '==', filters.departmentId));
    }
    if (filters.subjectTypeId) {
      constraints.push(where('subjectTypeId', '==', filters.subjectTypeId));
    }
    if (filters.programType) {
      constraints.push(where('programType', '==', filters.programType));
    }
    if (filters.semester) {
      constraints.push(where('semester', '==', filters.semester));
    }
    if (filters.yearOfExam) {
      constraints.push(where('yearOfExam', '==', filters.yearOfExam));
    }

    constraints.push(orderBy('uploadedAt', 'desc'));

    // Get papers
    let papers = await getDocuments<Paper>(COLLECTIONS.PAPERS, constraints);

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
