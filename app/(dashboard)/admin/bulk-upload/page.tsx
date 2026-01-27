'use client';

import { useState, useRef } from 'react';
import { Upload, FileArchive, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import styles from './page.module.css';

interface UploadProgress {
    status: 'idle' | 'validating' | 'uploading' | 'done' | 'error';
    message: string;
    processed: number;
    total: number;
    errors: string[];
}

export default function AdminBulkUploadPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState<UploadProgress>({
        status: 'idle',
        message: '',
        processed: 0,
        total: 0,
        errors: [],
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith('.zip')) {
            setProgress({
                status: 'error',
                message: 'Please select a ZIP file',
                processed: 0,
                total: 0,
                errors: [],
            });
            return;
        }

        setFile(selectedFile);
        setProgress({
            status: 'idle',
            message: `Selected: ${selectedFile.name}`,
            processed: 0,
            total: 0,
            errors: [],
        });
    };

    const handleUpload = async () => {
        if (!file) return;

        setProgress({
            status: 'validating',
            message: 'Validating ZIP file...',
            processed: 0,
            total: 0,
            errors: [],
        });

        try {
            const formData = new FormData();
            formData.append('file', file);

            setProgress(prev => ({
                ...prev,
                status: 'uploading',
                message: 'Processing papers...',
            }));

            const res = await fetch('/api/papers/bulk-upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setProgress({
                    status: 'done',
                    message: `Successfully uploaded ${data.processed} papers`,
                    processed: data.processed,
                    total: data.processed + data.failed,
                    errors: data.errors || [],
                });
            } else {
                setProgress({
                    status: 'error',
                    message: data.error || 'Upload failed',
                    processed: 0,
                    total: 0,
                    errors: data.errors || [],
                });
            }
        } catch (error) {
            setProgress({
                status: 'error',
                message: 'An unexpected error occurred',
                processed: 0,
                total: 0,
                errors: [],
            });
        }
    };

    const resetUpload = () => {
        setFile(null);
        setProgress({
            status: 'idle',
            message: '',
            processed: 0,
            total: 0,
            errors: [],
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Bulk Upload Papers</h1>
                <p className={styles.subtitle}>
                    Upload a ZIP file containing question papers and a CSV file with metadata
                </p>
            </div>

            {/* Instructions */}
            <div className={styles.instructions}>
                <h3>Expected ZIP Structure:</h3>
                <pre className={styles.structure}>
                    {`archive.zip
├── Third Sem QP Details.csv
└── 3 FYUGP QP NOV 25/
    ├── MAJOR 1/
    │   ├── 133750_xxx.pdf
    │   └── ...
    ├── MAJOR 2/
    ├── MINOR 1/
    ├── MINOR 2/
    ├── MDC/
    └── VAC-SEC/`}
                </pre>
                <p className={styles.note}>
                    The CSV file should have columns: Date of Exam, QP Code, Paper Name
                </p>
            </div>

            {/* Upload Area */}
            <div className={styles.uploadArea}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                    id="zipFile"
                />

                {progress.status === 'idle' || progress.status === 'error' ? (
                    <label htmlFor="zipFile" className={styles.uploadLabel}>
                        <FileArchive size={48} />
                        <span className={styles.uploadText}>
                            {file ? file.name : 'Click to select ZIP file'}
                        </span>
                        {file && (
                            <span className={styles.fileSize}>
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                        )}
                    </label>
                ) : (
                    <div className={styles.progressArea}>
                        {progress.status === 'validating' || progress.status === 'uploading' ? (
                            <Loader2 size={48} className={styles.spinner} />
                        ) : progress.status === 'done' ? (
                            <CheckCircle2 size={48} className={styles.successIcon} />
                        ) : null}
                        <span className={styles.progressText}>{progress.message}</span>
                        {progress.total > 0 && (
                            <span className={styles.progressCount}>
                                {progress.processed} / {progress.total} papers processed
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Error Messages */}
            {progress.errors.length > 0 && (
                <div className={styles.errorList}>
                    <h4><AlertCircle size={16} /> Errors:</h4>
                    <ul>
                        {progress.errors.slice(0, 10).map((error, i) => (
                            <li key={i}>{error}</li>
                        ))}
                        {progress.errors.length > 10 && (
                            <li>... and {progress.errors.length - 10} more errors</li>
                        )}
                    </ul>
                </div>
            )}

            {/* Actions */}
            <div className={styles.actions}>
                {progress.status === 'done' ? (
                    <button onClick={resetUpload} className={styles.resetButton}>
                        Upload Another
                    </button>
                ) : (
                    <button
                        onClick={handleUpload}
                        disabled={!file || progress.status === 'validating' || progress.status === 'uploading'}
                        className={styles.uploadButton}
                    >
                        {progress.status === 'uploading' ? 'Processing...' : 'Start Upload'}
                    </button>
                )}
            </div>
        </div>
    );
}
