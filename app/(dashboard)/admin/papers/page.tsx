'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Search,
    Trash2,
    Pencil,
    Download,
    User as UserIcon,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { Paper, User, Department, SubjectType } from '@/types';
import { formatDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { EditPaperModal } from '@/components/admin/EditPaperModal';
import { getYearOptions } from '@/constants';
import styles from './page.module.css';

export default function AdminPapersPage() {
    const router = useRouter();
    const [papers, setPapers] = useState<Paper[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [selectedYear, setSelectedYear] = useState<number | ''>('');
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Edit modal
    const [editingPaper, setEditingPaper] = useState<Paper | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchData();
    }, [debouncedSearch, selectedYear, selectedUser]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (selectedYear) params.append('yearOfExam', selectedYear.toString());
            if (selectedUser) params.append('uploadedBy', selectedUser);
            params.append('showAll', 'true');

            const [papersRes, usersRes, deptsRes, typesRes] = await Promise.all([
                fetch(`/api/papers?${params.toString()}`),
                users.length === 0 ? fetch('/api/users') : Promise.resolve(null),
                departments.length === 0 ? fetch('/api/departments') : Promise.resolve(null),
                subjectTypes.length === 0 ? fetch('/api/subject-types') : Promise.resolve(null),
            ]);

            if (papersRes.ok) {
                const data = await papersRes.json();
                setPapers(data.items || []);
            }
            if (usersRes && usersRes.ok) setUsers(await usersRes.json());
            if (deptsRes && deptsRes.ok) setDepartments(await deptsRes.json());
            if (typesRes && typesRes.ok) setSubjectTypes(await typesRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (paperId: string) => {
        if (!confirm('Are you sure you want to delete this paper? This action cannot be undone.')) return;

        try {
            const res = await fetch(`/api/papers/${paperId}`, { method: 'DELETE' });
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

    const handleEditSave = (updatedPaper: Paper) => {
        setPapers(papers.map(p => p.id === updatedPaper.id ? updatedPaper : p));
        setEditingPaper(null);
    };

    const getUserName = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user ? user.displayName : 'Unknown User';
    };

    const yearOptions = getYearOptions();

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Manage Papers</h1>
                    <p className={styles.subtitle}>View and manage all uploaded question papers</p>
                </div>
                <div className={styles.headerActions}>
                    <button
                        onClick={() => router.push('/admin/upload')}
                        className={styles.uploadButton}
                    >
                        Upload Paper
                    </button>
                    <button
                        onClick={() => router.push('/admin/bulk-upload')}
                        className={styles.bulkUploadButton}
                    >
                        Bulk Upload
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.searchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search papers by code or subject..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}
                    className={styles.filterSelect}
                >
                    <option value="">All Years</option>
                    {yearOptions.map(year => (
                        <option key={year.value} value={year.value}>{year.label}</option>
                    ))}
                </select>

                <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="">All Users</option>
                    {users.map(user => (
                        <option key={user.id} value={user.id}>{user.displayName} ({user.role})</option>
                    ))}
                </select>
            </div>

            {loading && papers.length === 0 ? (
                <div className={styles.loadingWrapper}>
                    <LoadingSpinner size="lg" />
                </div>
            ) : papers.length > 0 ? (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Paper Info</th>
                                <th>Detail</th>
                                <th>Uploaded By</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {papers.map((paper) => (
                                <tr key={paper.id}>
                                    <td>
                                        <div className={styles.paperInfo}>
                                            <div className={styles.paperIcon}>
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <div className={styles.paperCode}>{paper.subjectCode}</div>
                                                <div className={styles.paperSubject}>{paper.subjectName}</div>
                                                <div className={styles.paperId}>QP: {paper.qnNumber}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.detailMeta}>
                                            <span>Sem {paper.semester}</span>
                                            <span className={styles.dot}>•</span>
                                            <span>{paper.yearOfExam}</span>
                                            <span className={styles.dot}>•</span>
                                            <span className={styles.typeBadge}>{paper.programType}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.userInfo}>
                                            <UserIcon size={14} />
                                            <span>{getUserName(paper.uploadedBy)}</span>
                                        </div>
                                        <div className={styles.dateInfo}>
                                            {formatDate(paper.uploadedAt)}
                                        </div>
                                    </td>
                                    <td>
                                        {paper.isPublished ? (
                                            <span className={`${styles.statusBadge} ${styles.published}`}>
                                                <CheckCircle size={12} /> Published
                                            </span>
                                        ) : (
                                            <span className={`${styles.statusBadge} ${styles.draft}`}>
                                                <XCircle size={12} /> Draft
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            <a
                                                href={paper.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.iconButton}
                                                title="View/Download"
                                            >
                                                <Download size={16} />
                                            </a>
                                            <button
                                                onClick={() => setEditingPaper(paper)}
                                                className={`${styles.iconButton} ${styles.edit}`}
                                                title="Edit paper details"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(paper.id)}
                                                className={`${styles.iconButton} ${styles.delete}`}
                                                title="Delete"
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
                    description="Try adjusting your search or filters."
                />
            )}

            {/* Edit Modal */}
            {editingPaper && (
                <EditPaperModal
                    paper={editingPaper}
                    departments={departments}
                    subjectTypes={subjectTypes}
                    onClose={() => setEditingPaper(null)}
                    onSave={handleEditSave}
                />
            )}
        </div>
    );
}
