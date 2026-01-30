# Security Audit - QnHub

## Overview
Security review of the QnHub application.

---

## Authentication

### ✅ Implementation
- **NextAuth.js** with CredentialsProvider
- Separate providers for admin and teacher roles
- Password hashing with **bcryptjs** (10 rounds)
- Session-based auth with JWT tokens

### ✅ Security Measures
- Server-side password verification via Firebase Admin SDK
- Role stored in JWT token and session
- Protected routes check session before rendering

---

## Authorization

### ✅ Route Protection
| Route | Protection |
|-------|------------|
| `/admin/*` | Admin session required |
| `/teacher/*` | Teacher session required |
| `/api/papers/upload` | Session required |
| `/api/teachers/*` | Admin session required |
| `/papers/*` | Public access |

### ✅ Firebase Security Rules
- Firestore rules enforce read/write per collection
- Storage rules allow public read, auth write
- `isAdmin()`, `isTeacher()`, `isOwner()` helper functions

---

## Input Validation

### ✅ Server-Side
- File size validation (50MB max)
- File type validation (PDF, DOC, DOCX only)
- Email format validation
- Subject code format validation

### ✅ Client-Side
- Form validation before submission
- Real-time feedback on invalid inputs

---

## Data Protection

### ✅ Environment Variables
All sensitive data in `.env.local`:
- Firebase credentials
- NextAuth secret
- Admin seed credentials
- SMTP credentials

### ✅ Gitignore
- `.env*` files excluded
- Firebase service account JSON excluded

---

## API Security

### ✅ Measures
- Session verification on protected endpoints
- Role-based access control
- Error messages don't leak sensitive info

---

## Recommendations

1. **Rate Limiting**: Add rate limiting to login endpoints
2. **CSRF Protection**: Built-in with NextAuth
3. **Content Security Policy**: Add CSP headers
4. **Dependency Audit**: Run `pnpm audit` regularly

---

## Checklist

- [x] Password hashing implemented
- [x] Session-based authentication
- [x] Role-based authorization
- [x] Firebase security rules defined
- [x] Environment variables secured
- [x] Input validation on server
- [x] Sensitive files in .gitignore
- [ ] Rate limiting (recommended)
- [ ] CSP headers (recommended)
