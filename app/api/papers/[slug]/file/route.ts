import { NextResponse, NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';

/**
 * GET /api/papers/[slug]/file?mode=preview|download
 * Proxies the Firebase Storage file to hide the raw storage URL.
 * - mode=preview  → Content-Disposition: inline (opens in browser)
 * - mode=download → Content-Disposition: attachment (triggers save dialog)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const mode = request.nextUrl.searchParams.get('mode') || 'preview';

    // Fetch the paper to get the fileUrl
    const db = getAdminDb();
    
    // First try by SEO slug
    let docRef: any = null;
    let paper: any = null;
    let id: string = '';

    const snapshot = await db.collection(COLLECTIONS.PAPERS)
      .where('seoSlug', '==', slug)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      docRef = snapshot.docs[0];
      paper = docRef.data();
      id = docRef.id;
    } else {
      // Fallback: try looking up by ID
      const byId = await db.collection(COLLECTIONS.PAPERS).doc(slug).get();
      if (byId.exists) {
        docRef = byId;
        paper = docRef.data();
        id = docRef.id;
      } else {
        return NextResponse.json({ error: 'Paper not found' }, { status: 404 });
      }
    }

    const fileUrl = paper.fileUrl as string;
    const fileName = paper.fileName as string || `${paper.subjectCode}_${paper.yearOfExam}.pdf`;

    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL not available' }, { status: 404 });
    }

    // Fetch the file from Firebase Storage
    const fileRes = await fetch(fileUrl);

    if (!fileRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch file' }, { status: 502 });
    }

    const contentType = fileRes.headers.get('Content-Type') || 'application/pdf';

    // Increment download count for actual downloads in the background
    if (mode === 'download') {
      const currentCount = (paper.downloadCount as number) || 0;
      db.collection(COLLECTIONS.PAPERS).doc(id).update({
        downloadCount: currentCount + 1,
      }).catch(err => console.error('Error proxying paper file - download count update:', err));
    }

    const disposition = mode === 'download'
      ? `attachment; filename="${fileName}"`
      : `inline; filename="${fileName}"`;

    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': disposition,
      'Cache-Control': 'public, max-age=3600',
    });

    const contentLength = fileRes.headers.get('Content-Length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new Response(fileRes.body, { headers });
  } catch (error) {
    console.error('Error proxying paper file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
