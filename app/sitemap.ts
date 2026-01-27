import { MetadataRoute } from 'next';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { COLLECTIONS, SITE_URL } from '@/constants';

// ============================================================
// Firebase Admin for Sitemap Generation
// ============================================================

function getAdminDb() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (getApps().length === 0) {
    if (clientEmail && privateKey) {
      initializeApp({
        credential: cert({ projectId: projectId!, clientEmail, privateKey }),
      });
    } else {
      initializeApp({ projectId });
    }
  }

  return getFirestore();
}

// ============================================================
// Dynamic Sitemap Generation
// ============================================================

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/papers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Dynamic paper pages
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(COLLECTIONS.PAPERS)
      .where('isPublished', '==', true)
      .select('seoSlug', 'updatedAt')
      .get();

    const paperPages: MetadataRoute.Sitemap = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        url: `${baseUrl}/papers/${data.seoSlug || doc.id}`,
        lastModified: data.updatedAt?.toDate?.() || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    });

    return [...staticPages, ...paperPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return staticPages;
  }
}
