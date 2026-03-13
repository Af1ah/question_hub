import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS, DEFAULT_PAGE_SIZE } from '@/constants';
import { Paper, PaperFilters } from '@/types';

/**
 * Build a Firestore query with the given filters applied
 */
function buildPapersQuery(
  baseQuery: FirebaseFirestore.Query,
  filters: PaperFilters,
  uploadedBy?: string | null
): FirebaseFirestore.Query {
  let query = baseQuery;

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
  if (uploadedBy) {
    query = query.where('uploadedBy', '==', uploadedBy);
  }

  return query.orderBy('uploadedAt', 'desc');
}

/**
 * GET /api/papers
 * Get papers with optional filters (uses Admin SDK to bypass Firestore rules)
 * 
 * Performance notes:
 * - Session check is skipped for public requests (avoids Firebase token minting)
 * - Firestore-native pagination (.limit/.offset) is used when no text search is active
 * - Text search falls back to in-memory filtering (Firestore lacks full-text search)
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

    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0;

    const pageSize = filters.limit || DEFAULT_PAGE_SIZE;
    const uploadedBy = searchParams.get('uploadedBy');

    // Only check auth when explicitly requesting unpublished papers (admin use-case)
    // This avoids the expensive getServerSession → createCustomToken call for public visitors
    const showAll = searchParams.get('showAll') === 'true';
    let isAdmin = false;

    if (showAll) {
      const session = await getServerSession(authOptions);
      isAdmin = session?.user?.role === 'admin';
    }

    const db = getAdminDb();
    const collectionRef = db.collection(COLLECTIONS.PAPERS);
    let baseQuery: FirebaseFirestore.Query = collectionRef;

    // Only show published papers for public requests
    if (!isAdmin || !showAll) {
      baseQuery = baseQuery.where('isPublished', '==', true);
    }

    const query = buildPapersQuery(baseQuery, filters, uploadedBy);
    const hasSearch = !!filters.search;

    if (hasSearch) {
      // Text search requires fetching all matching docs and filtering in memory
      const snapshot = await query.get();
      let allPapers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Paper[];

      const searchLower = filters.search!.toLowerCase();
      allPapers = allPapers.filter(
        (paper) =>
          paper.subjectName.toLowerCase().includes(searchLower) ||
          paper.subjectCode.toLowerCase().includes(searchLower) ||
          paper.qnNumber.toLowerCase().includes(searchLower)
      );

      const total = allPapers.length;
      const paginatedPapers = allPapers.slice(offset, offset + pageSize);
      const hasMore = offset + paginatedPapers.length < total;

      return NextResponse.json({
        items: paginatedPapers,
        total,
        hasMore,
        offset,
        limit: pageSize,
      });
    }

    // No text search: use Firestore-native pagination
    const [countSnapshot, dataSnapshot] = await Promise.all([
      query.count().get(),
      query.offset(offset).limit(pageSize).get(),
    ]);

    const total = countSnapshot.data().count;
    const papers = dataSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Paper[];

    const hasMore = offset + papers.length < total;

    return NextResponse.json({
      items: papers,
      total,
      hasMore,
      offset,
      limit: pageSize,
    });
  } catch (error) {
    console.error('Error fetching papers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch papers' },
      { status: 500 }
    );
  }
}

