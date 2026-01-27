'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Mail, Check, X, User } from 'lucide-react';
import { Teacher, Department } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

export default function AdminTeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Invite form
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteDepartment, setInviteDepartment] = useState('');
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [teachersRes, deptsRes] = await Promise.all([
                    fetch('/api/teachers'),
                    fetch('/api/departments'),
                ]);

                if (teachersRes.ok) setTeachers(await teachersRes.json());
                if (deptsRes.ok) setDepartments(await deptsRes.json());
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteError('');
        setInviteSuccess('');
        setInviting(true);

        try {
            const res = await fetch('/api/teachers/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inviteEmail,
                    displayName: inviteName,
                    departmentId: inviteDepartment,
                }),
            });

            if (res.ok) {
                const newTeacher = await res.json();
                setTeachers([...teachers, newTeacher]);
                setInviteSuccess('Invitation sent successfully!');
                setInviteEmail('');
                setInviteName('');
                setInviteDepartment('');
                setTimeout(() => setShowInviteModal(false), 2000);
            } else {
                const data = await res.json();
                setInviteError(data.error || 'Failed to invite teacher');
            }
        } catch (error) {
            setInviteError('An unexpected error occurred');
        } finally {
            setInviting(false);
        }
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
                    <h1 className={styles.title}>Manage Teachers</h1>
                    <p className={styles.subtitle}>Invite and manage teacher accounts</p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className={styles.inviteButton}
                >
                    <UserPlus size={18} />
                    <span>Invite Teacher</span>
                </button>
            </div>

            {teachers.length > 0 ? (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.map((teacher) => (
                                <tr key={teacher.id}>
                                    <td>
                                        <div className={styles.nameCell}>
                                            <div className={styles.avatar}>
                                                <User size={16} />
                                            </div>
                                            <span>{teacher.displayName}</span>
                                        </div>
                                    </td>
                                    <td>{teacher.email}</td>
                                    <td>
                                        {departments.find(d => d.id === teacher.departmentId)?.name || '-'}
                                    </td>
                                    <td>
                                        <span className={`${styles.status} ${teacher.isActive ? styles.active : styles.inactive}`}>
                                            {teacher.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState
                    icon={<User size={48} />}
                    title="No Teachers Yet"
                    description="Invite teachers to help manage question papers."
                    action={
                        <button onClick={() => setShowInviteModal(true)} className={styles.emptyInviteButton}>
                            Invite Your First Teacher
                        </button>
                    }
                />
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Invite Teacher</h2>
                            <button onClick={() => setShowInviteModal(false)} className={styles.closeButton}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleInvite} className={styles.modalForm}>
                            {inviteError && <div className={styles.error}>{inviteError}</div>}
                            {inviteSuccess && <div className={styles.success}>{inviteSuccess}</div>}

                            <div className={styles.field}>
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    placeholder="Teacher's full name"
                                    required
                                />
                            </div>

                            <div className={styles.field}>
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="teacher@example.com"
                                    required
                                />
                            </div>

                            <div className={styles.field}>
                                <label>Department (Optional)</label>
                                <select
                                    value={inviteDepartment}
                                    onChange={(e) => setInviteDepartment(e.target.value)}
                                >
                                    <option value="">Select department</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={styles.modalActions}>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className={styles.cancelButton}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviting}
                                    className={styles.submitButton}
                                >
                                    {inviting ? 'Sending...' : 'Send Invitation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
