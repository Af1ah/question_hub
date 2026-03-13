import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getAdminDb, 
  getStorageBucket, 
  adminGetDocument, 
  adminUpdateDocument, 
  adminDeleteDocument 
} from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';
import { Paper } from '@/types';

/**
 * GET /api/papers/[id]
 * Get single paper details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: id } = await params;
    const paper = await adminGetDocument<Paper>(COLLECTIONS.PAPERS, id);
    
    if (!paper) {
      return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(paper);
  } catch (error) {
    console.error('Error fetching paper:', error);
    return NextResponse.json(
      { error: 'Failed to fetch paper' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/papers/[id]
 * Update paper details (Admin or Owner)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { slug: id } = await params;
    const updates = await request.json();
    
    // Validate updates (prevent modifying protected fields like uploadedBy, etc if needed)
    // For simplicity, we allow updating most fields provided by client
    
    // Check ownership
    const paper = await adminGetDocument<Paper>(COLLECTIONS.PAPERS, id);
    if (!paper) {
       return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    if (session.user.role !== 'admin' && paper.uploadedBy !== session.user.id) {
       return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await adminUpdateDocument(COLLECTIONS.PAPERS, id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating paper:', error);
    return NextResponse.json(
      { error: 'Failed to update paper' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/papers/[id]
 * Delete paper and file (Admin or Owner)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { slug: id } = await params;

    // Check ownership
    const paper = await adminGetDocument<Paper>(COLLECTIONS.PAPERS, id);
    if (!paper) {
       return NextResponse.json(
        { error: 'Paper not found' },
        { status: 404 }
      );
    }

    if (session.user.role !== 'admin' && paper.uploadedBy !== session.user.id) {
       return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete file from Storage
    if (paper.fileName) {
      try {
        const bucket = getStorageBucket();
        // Handle potential path variations (root or papers/)
        // Our bulk upload puts in papers/, client upload puts in papers/
        // fileName usually includes the path if we stored it that way?
        // Step 195 (bulk upload) stored fileName: `${fileName}.pdf` but uploaded to `papers/${fileName}.pdf`.
        // Step 187 (storage rules) matches /papers/{allPaths=**}.
        // We should try to delete `papers/${paper.fileName}`.
        const fileRef = bucket.file(`papers/${paper.fileName}`);
        await fileRef.delete();
      } catch (storageError) {
        console.warn('Error deleting file from storage:', storageError);
        // Continue to delete document even if storage delete fails (e.g. file already gone)
      }
    }

    // Delete document from Firestore
    await adminDeleteDocument(COLLECTIONS.PAPERS, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting paper:', error);
    return NextResponse.json(
      { error: 'Failed to delete paper' },
      { status: 500 }
    );
  }
}
