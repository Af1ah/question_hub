/**
 * Subject Types Seed Script
 * 
 * Seeds the default subject types: Major, Minor, MDC, VAC-SEC
 * Run with: npx tsx scripts/seed-subject-types.ts
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Default subject types
const DEFAULT_SUBJECT_TYPES = [
  'Major',
  'Minor',
  'MDC',
  'VAC-SEC',
];

// ============================================================
// Firebase Admin Initialization
// ============================================================

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  if (!projectId) {
    throw new Error('Firebase project ID is required.');
  }

  initializeApp({ projectId });
  return getFirestore();
};

// ============================================================
// Seed Subject Types
// ============================================================

async function seedSubjectTypes() {
  console.log('🚀 Starting subject types seed process...\n');

  try {
    const db = initializeFirebaseAdmin();
    const subjectTypesCollection = db.collection('subjectTypes');

    // Check existing subject types
    const existing = await subjectTypesCollection.get();
    const existingNames = new Set(existing.docs.map(doc => doc.data().name));

    let created = 0;
    let skipped = 0;

    for (const name of DEFAULT_SUBJECT_TYPES) {
      if (existingNames.has(name)) {
        console.log(`⏭️  Skipping "${name}" - already exists`);
        skipped++;
        continue;
      }

      await subjectTypesCollection.add({
        name,
        createdAt: Timestamp.now(),
      });
      
      console.log(`✅ Created "${name}"`);
      created++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error seeding subject types:', error);
    process.exit(1);
  }
}

seedSubjectTypes();
