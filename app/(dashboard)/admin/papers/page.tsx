'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Eye, Filter, User } from 'lucide-react';
import { Paper, User as UserType } from '@/types';
import { formatFileSize, formatDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

export default function AdminPapersPage() {
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<UserType[]>([]);

    // Filters
    const [uploaderFilter, setUploaderFilter] = useState('');
    const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Users for filter dropdown
                const usersRes = await fetch('/api/users');
                if (usersRes.ok) setUsers(await usersRes.json());

                // Fetch Papers
                await fetchPapers();
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const fetchPapers = async () => {
        try {
            let url = `/api/papers?limit=100`;
            if (uploaderFilter) url += `&uploadedBy=${uploaderFilter}`;

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                let fetchedPapers = data.items || [];

                // Client-side sorting for date if API doesn't support generic sort param
                fetchedPapers.sort((a: Paper, b: Paper) => {
                    const dateA = new Date(a.uploadedAt.seconds * 1000).getTime();
                    const dateB = new Date(b.uploadedAt.seconds * 1000).getTime();
                    return dateSort === 'asc' ? dateA - dateB : dateB - dateA;
                });

                setPapers(fetchedPapers);
            }
        } catch (error) {
            console.error('Error fetching papers:', error);
        }
    };

    useEffect(() => {
        if (!loading) fetchPapers();
    }, [uploaderFilter, dateSort]);

    const handleDelete = async (paperId: string) => {
        if (!confirm('Are you sure you want to delete this paper site-wide?')) return;

        try {
            const res = await fetch(`/api/papers?id=${paperId}`, { method: 'DELETE' });
            if (res.ok) {
                setPapers(papers.filter(p => p.id !== paperId));
            } else {
                alert('Failed to delete paper');
            }
        } catch (error) {
            console.error('Error deleting paper:', error);
            alert('Error deleting paper');
        }
    };

    const getUploaderName = (uid: string) => {
        const user = users.find(u => u.id === uid);
        return user ? user.displayName : 'Unknown';
    };

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
                <div>
                    <h1 className={styles.title}>Manage Papers</h1>
                    <p className={styles.subtitle}>View and manage all uploaded question papers</p>
                </div>

                <div className={styles.filters}>
                    <div className={styles.filterGroup}>
                        <Filter size={16} className={styles.filterIcon} />
                        <select
                            value={uploaderFilter}
                            onChange={(e) => setUploaderFilter(e.target.value)}
                            className={styles.select}
                        >
                            <option value="">All Uploaders</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.displayName} ({u.role})</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <select
                            value={dateSort}
                            onChange={(e) => setDateSort(e.target.value as 'asc' | 'desc')}
                            className={styles.select}
                        >
                            <option value="desc">Newest First</option>
                            <option value="asc">Oldest First</option>
                        </select>
                    </div>
                </div>
            </div>

            {papers.length > 0 ? (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Code</th>
                                <th>Uploaded By</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {papers.map((paper) => (
                                <tr key={paper.id}>
                                    <td>
                                        <div className={styles.subjectCell}>
                                            <FileText size={18} className={styles.icon} />
                                            <div>
                                                <div className={styles.subjectName}>{paper.subjectName}</div>
                                                <div className={styles.paperMeta}>
                                                    {paper.yearOfExam} • Sem {paper.semester}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><code>{paper.subjectCode}</code></td>
                                    <td>
                                        <div className={styles.uploaderCell}>
                                            <User size={14} />
                                            <span>{getUploaderName(paper.uploadedBy)}</span>
                                        </div>
                                    </td>
                                    <td>{formatDate(new Date(paper.uploadedAt.seconds * 1000))}</td>
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
                                            <button
                                                onClick={() => handleDelete(paper.id)}
                                                className={`${styles.actionButton} ${styles.delete}`}
                                                title="Delete Site-wide"
                                            >
                                                <Trash2 size={16} />
                                            </button>
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
                    title="No Papers Found"
                    description="No papers match your filters."
                />
            )}
        </div>
    );
}
