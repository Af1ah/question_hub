'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Mail, Check, X, User as UserIcon, Trash2, Shield, GraduationCap, ArrowRightLeft } from 'lucide-react';
import { User, Department } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);

    // Filter State
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher'>('all');

    // Invite form
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviteDepartment, setInviteDepartment] = useState('');
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, deptsRes] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/departments'),
            ]);

            if (usersRes.ok) setUsers(await usersRes.json());
            if (deptsRes.ok) setDepartments(await deptsRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

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
                const newUser = await res.json();
                setUsers([...users, newUser]);
                setInviteSuccess('Invitation sent successfully!');
                setInviteEmail('');
                setInviteName('');
                setInviteDepartment('');
                setTimeout(() => setShowInviteModal(false), 2000);
            } else {
                const data = await res.json();
                setInviteError(data.error || 'Failed to invite user');
            }
        } catch (error) {
            setInviteError('An unexpected error occurred');
        } finally {
            setInviting(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' });
            if (res.ok) {
                setUsers(users.filter(u => u.id !== userId));
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user');
        }
    };

    const handleRoleSwitch = async (userId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'teacher' : 'admin';
        if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole }),
            });

            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            } else {
                alert('Failed to update role');
            }
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Error updating role');
        }
    };

    const filteredUsers = roleFilter === 'all'
        ? users
        : users.filter(u => u.role === roleFilter);

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
                    <h1 className={styles.title}>Manage Users</h1>
                    <p className={styles.subtitle}>Manage admins and teachers</p>
                </div>
                <div className={styles.headerActions}>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as any)}
                        className={styles.roleFilter}
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admins</option>
                        <option value="teacher">Teachers</option>
                    </select>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className={styles.inviteButton}
                    >
                        <UserPlus size={18} />
                        <span>Invite Teacher</span>
                    </button>
                </div>
            </div>

            {filteredUsers.length > 0 ? (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className={styles.nameCell}>
                                            <div className={styles.avatar}>
                                                <UserIcon size={16} />
                                            </div>
                                            <span>{user.displayName}</span>
                                        </div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`${styles.roleBadge} ${user.role === 'admin' ? styles.admin : styles.teacher}`}>
                                            {user.role === 'admin' ? <Shield size={12} /> : <GraduationCap size={12} />}
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>
                                        {user.departmentId ? departments.find(d => d.id === user.departmentId)?.name : '-'}
                                    </td>
                                    <td>
                                        <div className={styles.actions}>
                                            <button
                                                onClick={() => handleRoleSwitch(user.id, user.role)}
                                                className={styles.iconButton}
                                                title="Switch Role"
                                            >
                                                <ArrowRightLeft size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className={`${styles.iconButton} ${styles.delete}`}
                                                title="Delete User"
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
                    icon={<UserIcon size={48} />}
                    title="No Users Found"
                    description="No users match your current filter."
                    action={
                        <button onClick={() => setShowInviteModal(true)} className={styles.emptyInviteButton}>
                            Invite Teacher
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
