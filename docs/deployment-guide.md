# Firebase App Hosting Deployment Guide

## Prerequisites
- Firebase CLI installed and logged in
- Firebase project with App Hosting enabled

---

## Step 1: Set Up Secrets

Run these commands to set your secrets:

```bash
# Firebase Admin Private Key (paste entire key when prompted)
firebase apphosting:secrets:set FIREBASE_ADMIN_PRIVATE_KEY

# NextAuth Secret
firebase apphosting:secrets:set NEXTAUTH_SECRET

# SMTP Credentials
firebase apphosting:secrets:set SMTP_USER
firebase apphosting:secrets:set SMTP_PASS
```

### Secret Values to Use:
| Secret | Value |
|--------|-------|
| FIREBASE_ADMIN_PRIVATE_KEY | Your service account private key (from JSON file) |
| NEXTAUTH_SECRET | `` |
| SMTP_USER | `` |
| SMTP_PASS | Your Gmail app password |

---

## Step 2: Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules  
firebase deploy --only storage:rules
```

---

## Step 3: Deploy Application

```bash
# Trigger a new deployment
firebase apphosting:backends:create qnhub

# Or redeploy existing
git add .
git commit -m "Configure Firebase App Hosting"
git push
```

The deployment will automatically trigger when you push to your connected branch.

---

## Verify Deployment

After deployment, check:
1. App loads at: `https://qnhub--sample-firebase-ai-3e3e5.firebaseapp.com`
2. Admin login works
3. Teacher login works
4. Paper upload works

---

## Troubleshooting

**Error: auth/invalid-api-key**
- Verify `NEXT_PUBLIC_FIREBASE_API_KEY` is correct in `apphosting.yaml`

**Error: Firebase Admin not initialized**
- Check `FIREBASE_ADMIN_PRIVATE_KEY` secret is set correctly

**Build fails**
- Check Cloud Build logs in Firebase Console
