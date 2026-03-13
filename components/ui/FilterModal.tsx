'use client';

import { useState, useEffect } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { PaperFilters, Department, SubjectType } from '@/types';
import { SEMESTERS, PROGRAM_TYPES, getYearOptions } from '@/constants';
import styles from './FilterModal.module.css';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: PaperFilters;
    onApply: (filters: PaperFilters) => void;
    departments: Department[];
    subjectTypes: SubjectType[];
    availableYears?: number[];
}

export function FilterModal({
    isOpen,
    onClose,
    filters,
    onApply,
    departments,
    subjectTypes,
    availableYears,
}: FilterModalProps) {
    const [localFilters, setLocalFilters] = useState<PaperFilters>(filters);
    const yearOptions = availableYears
        ? availableYears.map((y) => ({ value: y, label: String(y) }))
        : getYearOptions();

    // Reset local filters when modal opens
    useEffect(() => {
        if (isOpen) {
            setLocalFilters(filters);
        }
    }, [isOpen, filters]);

    const handleChange = (key: keyof PaperFilters, value: string | number | undefined) => {
        setLocalFilters((prev) => ({
            ...prev,
            [key]: value || undefined,
        }));
    };

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleReset = () => {
        setLocalFilters({});
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <SlidersHorizontal size={20} />
                        <h2>Advanced Filters</h2>
                    </div>
                    <button onClick={onClose} className={styles.closeButton} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <p className={styles.subtitle}>
                    Refine your search with multiple filter options
                </p>

                {/* Filters */}
                <div className={styles.content}>
                    <div className={styles.filterGrid}>
                        {/* Subject Code */}
                        <div className={styles.filterGroup}>
                            <label className={styles.label}>Subject Code</label>
                            <input
                                type="text"
                                placeholder="E.G. CS101"
                                value={localFilters.subjectCode || ''}
                                onChange={(e) => handleChange('subjectCode', e.target.value)}
                                className={styles.input}
                            />
                        </div>

                        {/* Year */}
                        <div className={styles.filterGroup}>
                            <label className={styles.label}>Year</label>
                            <select
                                value={localFilters.yearOfExam || ''}
                                onChange={(e) => handleChange('yearOfExam', e.target.value ? parseInt(e.target.value) : undefined)}
                                className={styles.select}
                            >
                                <option value="">All years</option>
                                {yearOptions.map((year) => (
                                    <option key={year.value} value={year.value}>
                                        {year.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Semester */}
                        <div className={styles.filterGroup}>
                            <label className={styles.label}>Semester</label>
                            <select
                                value={localFilters.semester || ''}
                                onChange={(e) => handleChange('semester', e.target.value ? parseInt(e.target.value) : undefined)}
                                className={styles.select}
                            >
                                <option value="">All semesters</option>
                                {SEMESTERS.map((sem) => (
                                    <option key={sem.value} value={sem.value}>
                                        {sem.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Department */}
                        <div className={styles.filterGroup}>
                            <label className={styles.label}>Department</label>
                            <select
                                value={localFilters.departmentId || ''}
                                onChange={(e) => handleChange('departmentId', e.target.value)}
                                className={styles.select}
                            >
                                <option value="">All departments</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Subject Type */}
                        <div className={styles.filterGroup}>
                            <label className={styles.label}>Subject Type</label>
                            <select
                                value={localFilters.subjectTypeId || ''}
                                onChange={(e) => handleChange('subjectTypeId', e.target.value)}
                                className={styles.select}
                            >
                                <option value="">All types</option>
                                {subjectTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Program Type */}
                        <div className={styles.filterGroup}>
                            <label className={styles.label}>Program Type</label>
                            <select
                                value={localFilters.programType || ''}
                                onChange={(e) => handleChange('programType', e.target.value)}
                                className={styles.select}
                            >
                                <option value="">All program types</option>
                                {PROGRAM_TYPES.map((prog) => (
                                    <option key={prog.value} value={prog.value}>
                                        {prog.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button onClick={handleReset} className={styles.resetButton}>
                        Reset Filters
                    </button>
                    <button onClick={handleApply} className={styles.applyButton}>
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    );
}
