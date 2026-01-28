'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Eye } from 'lucide-react';
import { Paper } from '@/types';
import { formatFileSize, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import styles from './page.module.css';

export default function TeacherPapersPage() {
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(true);

    const { user } = useAuth();

    useEffect(() => {
        const fetchPapers = async () => {
            if (!user?.id) return;

            try {
                const res = await fetch(`/api/papers?uploadedBy=${user.id}&limit=100`);
                if (res.ok) {
                    const data = await res.json();
                    setPapers(data.items || []);
                }
            } catch (error) {
                console.error('Error fetching papers:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPapers();
    }, [user?.id]);

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingWrapper}>
                    <LoadingSpinner size="lg" />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>My Papers</h1>
                <p className={styles.subtitle}>View all question papers you have uploaded</p>
            </div>

            {papers.length > 0 ? (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Code</th>
                                <th>Year</th>
                                <th>Semester</th>
                                <th>Size</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {papers.map((paper) => (
                                <tr key={paper.id}>
                                    <td>
                                        <div className={styles.subjectCell}>
                                            <FileText size={18} className={styles.icon} />
                                            <span>{paper.subjectName}</span>
                                        </div>
                                    </td>
                                    <td><code>{paper.subjectCode}</code></td>
                                    <td>{paper.yearOfExam}</td>
                                    <td>Sem {paper.semester}</td>
                                    <td>{formatFileSize(paper.fileSize)}</td>
                                    <td>
                                        <div className={styles.actions}>
                                            <a
                                                href={paper.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.actionButton}
                                                title="View"
                                            >
                                                <Eye size={16} />
                                            </a>
                                            <a
                                                href={paper.fileUrl}
                                                download
                                                className={styles.actionButton}
                                                title="Download"
                                            >
                                                <Download size={16} />
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState
                    icon={<FileText size={48} />}
                    title="No Papers Yet"
                    description="You haven't uploaded any papers yet. Start by uploading your first paper!"
                />
            )}
        </div>
    );
}
