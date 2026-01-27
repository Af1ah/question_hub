import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from './config';
import { STORAGE_PATHS, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/constants';

// ============================================================
// Types
// ============================================================

export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
  state: 'paused' | 'running' | 'success' | 'canceled' | 'error';
}

// ============================================================
// Validation
// ============================================================

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
    return {
      valid: false,
      error: 'Only PDF, DOC, and DOCX files are allowed',
    };
  }

  return { valid: true };
}

// ============================================================
// Upload Functions
// ============================================================

/**
 * Upload a paper file to Firebase Storage
 * @param file - File to upload
 * @param fileName - Unique filename (without extension)
 * @returns Upload result with URL and path
 */
export async function uploadPaperFile(
  file: File,
  fileName: string
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Get file extension
  const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const storagePath = `${STORAGE_PATHS.PAPERS}/${fileName}.${extension}`;
  const storageRef = ref(storage, storagePath);

  // Upload file
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Get download URL
  const url = await getDownloadURL(snapshot.ref);

  return {
    url,
    path: storagePath,
    size: file.size,
  };
}

/**
 * Upload with progress tracking (for large files)
 */
export function uploadPaperFileWithProgress(
  file: File,
  fileName: string,
  onProgress?: (progress: UploadProgress) => void
): { task: UploadTask; promise: Promise<UploadResult> } {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Get file extension
  const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const storagePath = `${STORAGE_PATHS.PAPERS}/${fileName}.${extension}`;
  const storageRef = ref(storage, storagePath);

  // Create upload task
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  const promise = new Promise<UploadResult>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        
        if (onProgress) {
          onProgress({
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress,
            state: snapshot.state,
          });
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url,
            path: storagePath,
            size: file.size,
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });

  return { task: uploadTask, promise };
}

/**
 * Delete a file from storage
 */
export async function deletePaperFile(storagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error: unknown) {
    // Ignore if file doesn't exist
    if ((error as { code?: string }).code === 'storage/object-not-found') {
      console.warn(`File not found: ${storagePath}`);
      return;
    }
    throw error;
  }
}

/**
 * Get download URL for a file
 */
export async function getFileDownloadURL(storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  return getDownloadURL(storageRef);
}

// ============================================================
// Bulk Upload Helpers
// ============================================================

/**
 * Upload multiple files in parallel with concurrency limit
 */
export async function uploadMultipleFiles(
  files: { file: File; fileName: string }[],
  concurrency: number = 3,
  onProgress?: (completed: number, total: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  let completed = 0;

  // Process files in batches
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(async ({ file, fileName }) => {
        const result = await uploadPaperFile(file, fileName);
        completed++;
        onProgress?.(completed, files.length);
        return result;
      })
    );
    
    results.push(...batchResults);
  }

  return results;
}
