/**
 * Admin Seed Script
 * 
 * This script creates the initial admin account.
 * Run with: npx tsx scripts/seed-admin.ts
 * 
 * IMPORTANT: This script should only be run ONCE during initial setup.
 * After the admin is created, the account is locked and cannot be recreated.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { hash } from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// ============================================================
// Firebase Admin Initialization
// ============================================================

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getFirestore();
  }

  // Initialize with project ID only (for local development)
  // For production, use service account credentials
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  
  if (!projectId) {
    throw new Error('Firebase project ID is required. Set FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  }

  // Check if we have service account credentials
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    // Use default credentials (works with Firebase Emulator or gcloud auth)
    initializeApp({
      projectId,
    });
  }

  return getFirestore();
};

// ============================================================
// Seed Admin
// ============================================================

async function seedAdmin() {
  console.log('🚀 Starting admin seed process...\n');

  // Validate required environment variables
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Administrator';

  if (!adminEmail || !adminPassword) {
    console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local');
    console.log('\nExample:');
    console.log('  ADMIN_EMAIL=admin@example.com');
    console.log('  ADMIN_PASSWORD=your-secure-password');
    console.log('  ADMIN_NAME=Administrator');
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error('❌ Error: Admin password must be at least 8 characters long');
    process.exit(1);
  }

  try {
    const db = initializeFirebaseAdmin();
    const adminsCollection = db.collection('admins');

    // Check if admin already exists
    const existingAdmins = await adminsCollection.get();
    
    if (!existingAdmins.empty) {
      const existingAdmin = existingAdmins.docs[0].data();
      
      if (existingAdmin.isLocked) {
        console.log('⚠️  Admin account is already locked. Cannot create new admin.');
        console.log('   If you need to reset the admin, manually delete the admin document from Firestore.');
        process.exit(0);
      }
      
      console.log('⚠️  An admin account already exists.');
      console.log(`   Email: ${existingAdmin.email}`);
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await hash(adminPassword, 12);

    // Create admin document
    console.log('📝 Creating admin account...');
    const adminDoc = {
      email: adminEmail,
      displayName: adminName,
      passwordHash,
      createdAt: Timestamp.now(),
      isLocked: true, // Lock immediately after creation
    };

    const docRef = await adminsCollection.add(adminDoc);

    console.log('\n✅ Admin account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ID:    ${docRef.id}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Name:  ${adminName}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔒 Account is locked. No new admins can be created.');
    console.log('\n⚠️  For security, remove ADMIN_PASSWORD from .env.local');

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
}

// Run the seed function
seedAdmin();
