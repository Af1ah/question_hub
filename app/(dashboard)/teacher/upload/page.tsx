'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Department, SubjectType, Subject } from '@/types';
import { SEMESTERS, PROGRAM_TYPES, getYearOptions, MAX_FILE_SIZE, ALLOWED_EXTENSIONS } from '@/constants';
import { formatFileSize } from '@/lib/utils';
import styles from './page.module.css';

export default function TeacherUploadPage() {
    const router = useRouter();
    const { user } = useAuth();

    // Form state
    const [subjectCode, setSubjectCode] = useState('');
    const [subjectName, setSubjectName] = useState('');
    const [qnNumber, setQnNumber] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [subjectTypeId, setSubjectTypeId] = useState('');
    const [programType, setProgramType] = useState('FYUGP');
    const [semester, setSemester] = useState(1);
    const [yearOfExam, setYearOfExam] = useState(new Date().getFullYear());
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // Data state
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showNewDepartment, setShowNewDepartment] = useState(false);
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [newDepartmentCode, setNewDepartmentCode] = useState('');

    const yearOptions = getYearOptions();

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [deptsRes, typesRes, subjectsRes] = await Promise.all([
                    fetch('/api/departments'),
                    fetch('/api/subject-types'),
                    fetch('/api/subjects'),
                ]);

                if (deptsRes.ok) setDepartments(await deptsRes.json());
                if (typesRes.ok) setSubjectTypes(await typesRes.json());
                if (subjectsRes.ok) setSubjects(await subjectsRes.json());
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    // Auto-fill subject name when code changes
    useEffect(() => {
        if (subjectCode.length >= 3) {
            const match = subjects.find(
                (s) => s.code.toLowerCase() === subjectCode.toLowerCase()
            );
            if (match) {
                setSubjectName(match.name);
            }
        }
    }, [subjectCode, subjects]);

    // Auto-fill subject code when name changes
    useEffect(() => {
        if (subjectName.length >= 3 && !subjectCode) {
            const match = subjects.find(
                (s) => s.name.toLowerCase() === subjectName.toLowerCase()
            );
            if (match) {
                setSubjectCode(match.code);
            }
        }
    }, [subjectName, subjects, subjectCode]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate file size
        if (selectedFile.size > MAX_FILE_SIZE) {
            setError(`File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`);
            return;
        }

        // Validate file type
        const extension = selectedFile.name.split('.').pop()?.toLowerCase();
        if (!extension || !ALLOWED_EXTENSIONS.includes(extension as typeof ALLOWED_EXTENSIONS[number])) {
            setError('Only PDF, DOC, and DOCX files are allowed');
            return;
        }

        setFile(selectedFile);
        setError('');
    };

    const handleAddDepartment = async () => {
        if (!newDepartmentName || !newDepartmentCode) return;

        try {
            const res = await fetch('/api/departments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newDepartmentName,
                    code: newDepartmentCode,
                    createdBy: user?.id,
                }),
            });

            if (res.ok) {
                const newDept = await res.json();
                setDepartments([...departments, newDept]);
                setDepartmentId(newDept.id);
                setShowNewDepartment(false);
                setNewDepartmentName('');
                setNewDepartmentCode('');
            }
        } catch (error) {
            console.error('Error adding department:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!file) {
            setError('Please select a file to upload');
            return;
        }

        setLoading(true);

        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('subjectCode', subjectCode);
            formData.append('subjectName', subjectName);
            formData.append('qnNumber', qnNumber);
            formData.append('departmentId', departmentId);
            formData.append('subjectTypeId', subjectTypeId);
            formData.append('programType', programType);
            formData.append('semester', semester.toString());
            formData.append('yearOfExam', yearOfExam.toString());
            formData.append('description', description);
            formData.append('uploadedBy', user?.id || '');

            const res = await fetch('/api/papers/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                setSuccess('Paper uploaded successfully!');
                // Reset form
                setSubjectCode('');
                setSubjectName('');
                setQnNumber('');
                setDescription('');
                setFile(null);
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to upload paper');
            }
        } catch (error) {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Upload Question Paper</h1>
                <p className={styles.subtitle}>Fill in the details below to upload a new question paper</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* Messages */}
                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}

                <div className={styles.formGrid}>
                    {/* Subject Code */}
                    <div className={styles.field}>
                        <label htmlFor="subjectCode" className={styles.label}>
                            Subject Code <span className={styles.required}>*</span>
                        </label>
                        <input
                            id="subjectCode"
                            type="text"
                            value={subjectCode}
                            onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                            placeholder="E.G. BCA3CJ201"
                            className={styles.input}
                            required
                        />
                        <p className={styles.hint}>Auto-fills subject name if exists</p>
                    </div>

                    {/* Subject Name */}
                    <div className={styles.field}>
                        <label htmlFor="subjectName" className={styles.label}>
                            Subject Name <span className={styles.required}>*</span>
                        </label>
                        <input
                            id="subjectName"
                            type="text"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            placeholder="E.G. Computer Networks"
                            className={styles.input}
                            required
                        />
                    </div>

                    {/* QN Number */}
                    <div className={styles.field}>
                        <label htmlFor="qnNumber" className={styles.label}>
                            Question Paper Code <span className={styles.required}>*</span>
                        </label>
                        <input
                            id="qnNumber"
                            type="text"
                            value={qnNumber}
                            onChange={(e) => setQnNumber(e.target.value)}
                            placeholder="E.G. 133750"
                            className={styles.input}
                            required
                        />
                    </div>

                    {/* Year */}
                    <div className={styles.field}>
                        <label htmlFor="yearOfExam" className={styles.label}>
                            Year of Examination <span className={styles.required}>*</span>
                        </label>
                        <select
                            id="yearOfExam"
                            value={yearOfExam}
                            onChange={(e) => setYearOfExam(parseInt(e.target.value))}
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

                    {/* Semester */}
                    <div className={styles.field}>
                        <label htmlFor="semester" className={styles.label}>
                            Semester <span className={styles.required}>*</span>
                        </label>
                        <select
                            id="semester"
                            value={semester}
                            onChange={(e) => setSemester(parseInt(e.target.value))}
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

                    {/* Department */}
                    <div className={styles.field}>
                        <label htmlFor="department" className={styles.label}>
                            Department
                        </label>
                        <div className={styles.selectWithAdd}>
                            <select
                                id="department"
                                value={departmentId}
                                onChange={(e) => setDepartmentId(e.target.value)}
                                className={styles.select}
                            >
                                <option value="">Select department</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowNewDepartment(true)}
                                className={styles.addButton}
                                title="Add new department"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Subject Type */}
                    <div className={styles.field}>
                        <label htmlFor="subjectType" className={styles.label}>
                            Subject Type <span className={styles.required}>*</span>
                        </label>
                        <select
                            id="subjectType"
                            value={subjectTypeId}
                            onChange={(e) => setSubjectTypeId(e.target.value)}
                            className={styles.select}
                            required
                        >
                            <option value="">Select type</option>
                            {subjectTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Program Type */}
                    <div className={styles.field}>
                        <label htmlFor="programType" className={styles.label}>
                            Program Type <span className={styles.required}>*</span>
                        </label>
                        <select
                            id="programType"
                            value={programType}
                            onChange={(e) => setProgramType(e.target.value)}
                            className={styles.select}
                            required
                        >
                            {PROGRAM_TYPES.map((prog) => (
                                <option key={prog.value} value={prog.value}>
                                    {prog.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Description */}
                <div className={styles.field}>
                    <label htmlFor="description" className={styles.label}>
                        Description (Optional)
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Any additional notes about this paper..."
                        className={styles.textarea}
                        rows={3}
                    />
                </div>

                {/* File Upload */}
                <div className={styles.field}>
                    <label className={styles.label}>
                        Upload File <span className={styles.required}>*</span>
                    </label>
                    <div className={styles.fileUpload}>
                        <input
                            type="file"
                            id="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className={styles.fileInput}
                        />
                        <label htmlFor="file" className={styles.fileLabel}>
                            <Upload size={24} />
                            {file ? (
                                <div className={styles.fileInfo}>
                                    <span className={styles.fileName}>{file.name}</span>
                                    <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                                </div>
                            ) : (
                                <div className={styles.filePlaceholder}>
                                    <span>Click to upload or drag and drop</span>
                                    <span className={styles.fileHint}>PDF, DOC, DOCX (Max 50MB)</span>
                                </div>
                            )}
                        </label>
                        {file && (
                            <button
                                type="button"
                                onClick={() => setFile(null)}
                                className={styles.removeFile}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className={styles.submitButton}
                >
                    {loading ? 'Uploading...' : 'Upload Paper'}
                </button>
            </form>

            {/* New Department Modal */}
            {showNewDepartment && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <h3>Add New Department</h3>
                        <div className={styles.modalFields}>
                            <input
                                type="text"
                                placeholder="Department Name"
                                value={newDepartmentName}
                                onChange={(e) => setNewDepartmentName(e.target.value)}
                                className={styles.input}
                            />
                            <input
                                type="text"
                                placeholder="Department Code (e.g., CSE)"
                                value={newDepartmentCode}
                                onChange={(e) => setNewDepartmentCode(e.target.value.toUpperCase())}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                onClick={() => setShowNewDepartment(false)}
                                className={styles.cancelButton}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAddDepartment}
                                className={styles.confirmButton}
                            >
                                Add Department
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
