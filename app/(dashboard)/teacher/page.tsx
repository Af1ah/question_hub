'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Upload, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Paper } from '@/types';
import { ROUTES } from '@/constants';
import styles from './page.module.css';

export default function TeacherDashboardPage() {
    const { user } = useAuth();
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPapers = async () => {
            try {
                const res = await fetch('/api/papers?limit=5');
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
    }, []);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Welcome, {user?.name}!</h1>
                <p className={styles.subtitle}>Manage and upload your question papers.</p>
            </div>

            {/* Quick Actions */}
            <div className={styles.actionsGrid}>
                <Link href={ROUTES.TEACHER_UPLOAD} className={styles.actionCard}>
                    <div className={styles.actionIcon}>
                        <Upload size={28} />
                    </div>
                    <div className={styles.actionContent}>
                        <h3>Upload New Paper</h3>
                        <p>Add a new question paper to the database</p>
                    </div>
                </Link>
                <Link href={ROUTES.TEACHER_PAPERS} className={styles.actionCard}>
                    <div className={styles.actionIcon}>
                        <FileText size={28} />
                    </div>
                    <div className={styles.actionContent}>
                        <h3>My Papers</h3>
                        <p>View and manage your uploaded papers</p>
                    </div>
                </Link>
            </div>

            {/* Recent Papers */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Recent Uploads</h2>
                {loading ? (
                    <p className={styles.loading}>Loading...</p>
                ) : papers.length > 0 ? (
                    <div className={styles.papersList}>
                        {papers.map((paper) => (
                            <div key={paper.id} className={styles.paperItem}>
                                <FileText size={20} className={styles.paperIcon} />
                                <div className={styles.paperInfo}>
                                    <span className={styles.paperName}>{paper.subjectName}</span>
                                    <span className={styles.paperMeta}>
                                        {paper.subjectCode} • {paper.yearOfExam}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className={styles.empty}>No papers uploaded yet. Start by uploading your first paper!</p>
                )}
            </div>
        </div>
    );
}
