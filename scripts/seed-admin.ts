/**
 * Admin Seed Script
 * 
 * This script creates or updates the initial admin account in the 'users' collection.
 * Run with: npx tsx scripts/seed-admin.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { hash } from 'bcryptjs';
import * as dotenv from 'dotenv';
import { COLLECTIONS } from '../constants'; // Assuming constant exists, if not I'll string literal it

// Load environment variables
dotenv.config({ path: '.env.local' });

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    initializeApp({ projectId });
  }

  return getFirestore();
};

async function seedAdmin() {
  console.log('🚀 Starting admin seed process...\n');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'Administrator';

  if (!adminEmail || !adminPassword) {
    console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.local');
    process.exit(1);
  }

  const db = initializeFirebaseAdmin();
  const usersCollection = db.collection('users'); // Direct string to be safe

  console.log(`Checking user: ${adminEmail}`);

  // Check if user already exists
  const snapshot = await usersCollection.where('email', '==', adminEmail).get();

  const passwordHash = await hash(adminPassword, 12);

  if (!snapshot.empty) {
      console.log('User found. Updating to Admin Role...');
      const userDoc = snapshot.docs[0];
      
      await userDoc.ref.update({
          role: 'admin',
          displayName: adminName,
          passwordHash: passwordHash,
          isActive: true,
          updatedAt: FieldValue.serverTimestamp(),
          isLocked: false // Ensure it's not locked if we want to login
      });
      console.log('✅ User updated to Admin successfully.');
  } else {
      console.log('User not found. Creating new Admin user...');
      await usersCollection.add({
          email: adminEmail,
          role: 'admin',
          displayName: adminName,
          passwordHash: passwordHash,
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          isLocked: false
      });
      console.log('✅ Admin created successfully.');
  }
}

seedAdmin();
