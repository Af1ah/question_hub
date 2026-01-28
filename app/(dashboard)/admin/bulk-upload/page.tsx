'use client';

import { useState, useRef, useEffect } from 'react';

import {
    Upload,
    FileArchive,
    AlertCircle,
    CheckCircle2,
    Loader2,
    X,
    ArrowRight,
    FileText,
    AlertTriangle
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

interface PreviewItem {
    id: number;
    qpCode: string;
    paperName: string;
    date?: string;
    status: 'ready' | 'error';
    issues: string[];
    detectedType: string;
}

interface AnalysisResult {
    success: boolean;
    summary?: {
        totalRows: number;
        validCount: number;
        pdfCount: number;
    };
    items?: PreviewItem[];
    error?: string;
}

type Stage = 'idle' | 'uploading_zip' | 'analyzing' | 'review' | 'processing' | 'completed';

export default function AdminBulkUploadPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [stage, setStage] = useState<Stage>('idle');
    const [progress, setProgress] = useState(0); // 0-100
    const [statusMessage, setStatusMessage] = useState('');
    const [isDragging, setIsDragging] = useState(false);

    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [tempFilePath, setTempFilePath] = useState('');

    // Processing logs
    const [logs, setLogs] = useState<string[]>([]);
    const [stats, setStats] = useState({ processed: 0, success: 0, failed: 0, total: 0 });

    const { user } = useAuth();

    // Reset workflow
    const resetUpload = () => {
        setFile(null);
        setStage('idle');
        setAnalysis(null);
        setTempFilePath('');
        setLogs([]);
        setStats({ processed: 0, success: 0, failed: 0, total: 0 });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) handleFile(selectedFile);
    };

    const handleFile = (selectedFile: File) => {
        if (!selectedFile.name.endsWith('.zip')) {
            alert('Please select a ZIP file');
            return;
        }
        setFile(selectedFile);
    };

    const startAnalysis = async () => {
        if (!file || !user) return;

        console.log('[BulkUpload] Starting analysis. Auth User:', auth.currentUser?.uid);
        if (!auth.currentUser) {
            alert('Firebase Auth not ready. Please wait a moment or refresh.');
            return;
        }

        setStage('uploading_zip');
        setStatusMessage('Uploading ZIP file to staging...');

        try {
            // 1. Upload to Firebase Storage (Temp)
            const timestamp = Date.now();
            const storagePath = `temp/bulk/${user.id}/${timestamp}_${file.name}`;
            const storageRef = ref(storage, storagePath);

            await uploadBytes(storageRef, file);
            setTempFilePath(storagePath);

            // 2. Analyze
            setStage('analyzing');
            setStatusMessage('Analyzing ZIP contents...');

            const res = await fetch('/api/papers/bulk-upload/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: storagePath }),
            });

            const data = await res.json();

            if (data.success) {
                setAnalysis(data);
                setStage('review');
            } else {
                alert(data.error || 'Analysis failed');
                setStage('idle');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to upload/analyze file');
            setStage('idle');
        }
    };

    const startProcessing = async () => {
        setStage('processing');
        setStats(prev => ({ ...prev, total: analysis?.summary?.validCount || 0 }));
        setLogs(prev => [...prev, 'Starting upload process...']);

        try {
            const response = await fetch('/api/papers/bulk-upload/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: tempFilePath }),
            });

            if (!response.ok) throw new Error('Failed to start process');
            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            handleStreamEvent(data);
                        } catch (e) {
                            console.error('Parse error', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
            setLogs(prev => [...prev, 'Error: Connection lost or failed']);
        }
    };

    const handleStreamEvent = (data: any) => {
        switch (data.type) {
            case 'start':
                setLogs(prev => [...prev, 'Process initialized.']);
                break;
            case 'status':
                setStatusMessage(data.message);
                break;
            case 'progress':
                setStatusMessage(data.message);
                setStats(prev => ({
                    ...prev,
                    processed: data.current // Simplified progress
                }));
                // Limit logs to last 5
                setLogs(prev => [...prev.slice(-4), data.message]);
                break;
            case 'log':
                setLogs(prev => [...prev.slice(-4), data.message]);
                break;
            case 'error':
                setLogs(prev => [...prev, `Error: ${data.message}`]);
                break;
            case 'done':
                setStage('completed');
                setStats(data.stats);
                setLogs(prev => [...prev, 'Completed!']);
                break;
        }
    };

    // Drag and drop handlers...
    // (Simplified for brevity, same as before)
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleFile(f);
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Bulk Upload Papers</h1>
                <p className={styles.subtitle}>Upload multiple papers via ZIP with CSV metadata.</p>
            </div>

            {/* Stage: IDLE or UPLOADING_ZIP or ANALYZING */}
            {['idle', 'uploading_zip', 'analyzing'].includes(stage) && (
                <div
                    className={`${styles.uploadArea} ${isDragging ? styles.uploadAreaDragOver : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {stage === 'idle' ? (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".zip"
                                onChange={handleFileSelect}
                                className={styles.fileInput}
                                id="zipFile"
                            />
                            <label htmlFor="zipFile" className={styles.uploadLabel}>
                                <FileArchive size={48} />
                                <span className={styles.uploadText}>
                                    {isDragging ? 'Drop ZIP file here' : (file ? file.name : 'Click to select ZIP file')}
                                </span>
                                {file && <span className={styles.fileSize}>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>}
                            </label>
                            {file && (
                                <button onClick={startAnalysis} className={styles.analyzeButton}>
                                    Analyze File <ArrowRight size={16} />
                                </button>
                            )}
                        </>
                    ) : (
                        <div className={styles.loadingState}>
                            <Loader2 size={48} className={styles.spinner} />
                            <p>{statusMessage}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Stage: REVIEW */}
            {stage === 'review' && analysis && (
                <div className={styles.reviewArea}>
                    <div className={styles.reviewHeader}>
                        <div className={styles.statBox}>
                            <span className={styles.statLabel}>Total Pairs Found</span>
                            <span className={styles.statValue}>{analysis.summary?.totalRows}</span>
                        </div>
                        <div className={styles.statBox}>
                            <span className={styles.statLabel}>Valid to Upload</span>
                            <span className={styles.statValue} style={{ color: 'var(--color-success)' }}>
                                {analysis.summary?.validCount}
                            </span>
                        </div>
                        <div className={styles.statBox}>
                            <span className={styles.statLabel}>Errors</span>
                            <span className={styles.statValue} style={{ color: 'var(--color-error)' }}>
                                {(analysis.summary?.totalRows || 0) - (analysis.summary?.validCount || 0)}
                            </span>
                        </div>
                    </div>

                    <div className={styles.previewTableWrapper}>
                        <table className={styles.previewTable}>
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>QP Code</th>
                                    <th>Paper Name</th>
                                    <th>Detected Type</th>
                                    <th>Issues</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.items?.map((item) => (
                                    <tr key={item.id} className={item.status === 'error' ? styles.rowError : ''}>
                                        <td>
                                            {item.status === 'ready' ?
                                                <CheckCircle2 size={16} className={styles.iconSuccess} /> :
                                                <AlertTriangle size={16} className={styles.iconError} />
                                            }
                                        </td>
                                        <td>{item.qpCode}</td>
                                        <td>{item.paperName}</td>
                                        <td>{item.detectedType}</td>
                                        <td>
                                            {item.issues.length > 0 && (
                                                <span className={styles.issueTag}>{item.issues.join(', ')}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.actions}>
                        <button onClick={resetUpload} className={styles.cancelButton}>Cancel</button>
                        <button onClick={startProcessing} className={styles.confirmButton}>
                            Start Upload ({analysis.summary?.validCount} Papers)
                        </button>
                    </div>
                </div>
            )}

            {/* Stage: PROCESSING or COMPLETED */}
            {(stage === 'processing' || stage === 'completed') && (
                <div className={styles.processArea}>
                    <div className={styles.processHeader}>
                        {stage === 'completed' ? (
                            <div className={styles.completedTitle}>
                                <CheckCircle2 size={32} />
                                <h2>Upload Completed</h2>
                            </div>
                        ) : (
                            <div className={styles.processingTitle}>
                                <Loader2 size={32} className={styles.spinner} />
                                <h2>Processing...</h2>
                            </div>
                        )}
                        <p>{statusMessage}</p>
                    </div>

                    <div className={styles.logs}>
                        {logs.map((log, i) => (
                            <div key={i} className={styles.logLine}>
                                <span className={styles.logTime}>{new Date().toLocaleTimeString()}</span>
                                {log}
                            </div>
                        ))}
                    </div>

                    {stage === 'completed' && (
                        <div className={styles.finalStats}>
                            <div className={styles.statCard}>
                                <h3>Total</h3>
                                <p>{stats.processed}</p>
                            </div>
                            <div className={styles.statCard}>
                                <h3>Success</h3>
                                <p className={styles.successText}>{stats.success}</p>
                            </div>
                            <div className={styles.statCard}>
                                <h3>Failed</h3>
                                <p className={styles.errorText}>{stats.failed}</p>
                            </div>
                        </div>
                    )}

                    {stage === 'completed' && (
                        <button onClick={resetUpload} className={styles.resetButton}>
                            Upload Another Batch
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
