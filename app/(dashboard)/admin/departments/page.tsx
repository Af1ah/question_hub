'use client';

import { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Department } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './page.module.css';

export default function AdminDepartmentsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/departments');
            if (res.ok) {
                setDepartments(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (dept: Department) => {
        setEditingDept(dept);
        setName(dept.name);
        setCode(dept.code);
        setError('');
        setShowModal(true);
    };

    const handleAdd = () => {
        setEditingDept(null);
        setName('');
        setCode('');
        setError('');
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This will remove the department.')) return;

        try {
            const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setDepartments(departments.filter(d => d.id !== id));
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            alert('Error deleting department');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const url = editingDept
                ? `/api/departments/${editingDept.id}`
                : '/api/departments';

            const method = editingDept ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, code }),
            });

            if (res.ok) {
                fetchDepartments();
                setShowModal(false);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to save');
            }
        } catch (error) {
            setError('An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner size="lg" />;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Manage Departments</h1>
                    <p className={styles.subtitle}>Add or edit academic departments</p>
                </div>
                <button onClick={handleAdd} className={styles.addButton}>
                    <Plus size={18} /> Add Department
                </button>
            </div>

            {departments.length > 0 ? (
                <div className={styles.grid}>
                    {departments.map((dept) => (
                        <div key={dept.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.icon}>
                                    <Building2 size={24} />
                                </div>
                                <div className={styles.actions}>
                                    <button
                                        onClick={() => handleEdit(dept)}
                                        className={styles.iconButton}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(dept.id)}
                                        className={`${styles.iconButton} ${styles.delete}`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className={styles.deptName}>{dept.name}</h3>
                            <span className={styles.deptCode}>{dept.code}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={<Building2 size={48} />}
                    title="No Departments"
                    description="Create a department to get started."
                    action={<button onClick={handleAdd}>Create Department</button>}
                />
            )}

            {showModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2>{editingDept ? 'Edit Department' : 'New Department'}</h2>
                            <button onClick={() => setShowModal(false)} className={styles.closeButton}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className={styles.form}>
                            {error && <div className={styles.error}>{error}</div>}
                            <div className={styles.field}>
                                <label>Name</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Computer Science"
                                    required
                                />
                            </div>
                            <div className={styles.field}>
                                <label>Code</label>
                                <input
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. CS"
                                    required
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" onClick={() => setShowModal(false)} className={styles.cancelButton}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className={styles.submitButton}>
                                    {submitting ? 'Saving...' : 'Save Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
