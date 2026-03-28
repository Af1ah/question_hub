'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Paper, Department, SubjectType } from '@/types';
import { SEMESTERS, PROGRAM_TYPES, getYearOptions } from '@/constants';
import styles from './EditPaperModal.module.css';

interface EditPaperModalProps {
    paper: Paper;
    departments: Department[];
    subjectTypes: SubjectType[];
    onClose: () => void;
    onSave: (updatedPaper: Paper) => void;
}

export function EditPaperModal({
    paper,
    departments,
    subjectTypes,
    onClose,
    onSave,
}: EditPaperModalProps) {
    const [subjectCode, setSubjectCode] = useState(paper.subjectCode);
    const [subjectName, setSubjectName] = useState(paper.subjectName);
    const [departmentId, setDepartmentId] = useState(paper.departmentId);
    const [subjectTypeId, setSubjectTypeId] = useState(paper.subjectTypeId);
    const [programType, setProgramType] = useState(paper.programType);
    const [semester, setSemester] = useState(paper.semester);
    const [yearOfExam, setYearOfExam] = useState(paper.yearOfExam);
    const [description, setDescription] = useState(paper.description ?? '');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const yearOptions = getYearOptions();

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        const updates = {
            subjectCode,
            subjectName,
            departmentId,
            subjectTypeId,
            programType,
            semester,
            yearOfExam,
            description: description || undefined,
        };

        try {
            const res = await fetch(`/api/papers/${paper.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            if (res.ok) {
                onSave({ ...paper, ...updates });
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to update paper. Please try again.');
            }
        } catch {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-paper-title"
            >
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h2 id="edit-paper-title" className={styles.title}>Edit Paper Details</h2>
                        <p className={styles.subtitle}>QP: {paper.qnNumber}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={styles.closeButton}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.formGrid}>
                        {/* Subject Code */}
                        <div className={styles.field}>
                            <label className={styles.label}>
                                Subject Code <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                value={subjectCode}
                                onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                                className={styles.input}
                                required
                            />
                        </div>

                        {/* Subject Name */}
                        <div className={styles.field}>
                            <label className={styles.label}>
                                Subject Name <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                value={subjectName}
                                onChange={(e) => setSubjectName(e.target.value)}
                                className={styles.input}
                                required
                            />
                        </div>

                        {/* Department */}
                        <div className={styles.field}>
                            <label className={styles.label}>
                                Department <span className={styles.required}>*</span>
                            </label>
                            <select
                                value={departmentId}
                                onChange={(e) => setDepartmentId(e.target.value)}
                                className={styles.select}
                                required
                            >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Subject Type */}
                        <div className={styles.field}>
                            <label className={styles.label}>
                                Subject Type <span className={styles.required}>*</span>
                            </label>
                            <select
                                value={subjectTypeId}
                                onChange={(e) => setSubjectTypeId(e.target.value)}
                                className={styles.select}
                                required
                            >
                                <option value="">Select Type</option>
                                {subjectTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Program Type */}
                        <div className={styles.field}>
                            <label className={styles.label}>
                                Program Type <span className={styles.required}>*</span>
                            </label>
                            <select
                                value={programType}
                                onChange={(e) => setProgramType(e.target.value)}
                                className={styles.select}
                                required
                            >
                                {PROGRAM_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Semester */}
                        <div className={styles.field}>
                            <label className={styles.label}>
                                Semester <span className={styles.required}>*</span>
                            </label>
                            <select
                                value={semester}
                                onChange={(e) => setSemester(Number(e.target.value))}
                                className={styles.select}
                                required
                            >
                                {SEMESTERS.map((sem) => (
                                    <option key={sem.value} value={sem.value}>
                                        {sem.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Year of Exam */}
                        <div className={styles.field}>
                            <label className={styles.label}>
                                Year of Exam <span className={styles.required}>*</span>
                            </label>
                            <select
                                value={yearOfExam}
                                onChange={(e) => setYearOfExam(Number(e.target.value))}
                                className={styles.select}
                                required
                            >
                                {yearOptions.map((year) => (
                                    <option key={year.value} value={year.value}>
                                        {year.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>

                    {/* Description */}
                    <div className={styles.field}>
                        <label className={styles.label}>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Any additional notes about this paper..."
                            className={styles.textarea}
                            rows={3}
                        />
                    </div>

                    {/* Actions */}
                    <div className={styles.actions}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={styles.cancelButton}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.saveButton}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className={styles.spinner} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
