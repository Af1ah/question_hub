'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterModal } from '@/components/ui/FilterModal';
import { PaperCard } from '@/components/ui/PaperCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Paper, PaperFilters, Department, SubjectType } from '@/types';
import styles from './page.module.css';

export default function PapersPage() {
    const searchParams = useSearchParams();

    const [papers, setPapers] = useState<Paper[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<PaperFilters>({});
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Initialize filters from URL params
    useEffect(() => {
        const initialFilters: PaperFilters = {
            search: searchParams.get('search') || undefined,
            subjectCode: searchParams.get('subjectCode') || undefined,
            departmentId: searchParams.get('departmentId') || undefined,
            subjectTypeId: searchParams.get('subjectTypeId') || undefined,
            programType: searchParams.get('programType') || undefined,
            semester: searchParams.get('semester') ? parseInt(searchParams.get('semester')!) : undefined,
            yearOfExam: searchParams.get('yearOfExam') ? parseInt(searchParams.get('yearOfExam')!) : undefined,
        };
        setFilters(initialFilters);
    }, [searchParams]);

    // Fetch data when filters change
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Build query string
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== '') {
                        params.set(key, String(value));
                    }
                });

                const [papersRes, deptsRes, typesRes] = await Promise.all([
                    fetch(`/api/papers?${params.toString()}`),
                    fetch('/api/departments'),
                    fetch('/api/subject-types'),
                ]);

                if (papersRes.ok) {
                    const data = await papersRes.json();
                    setPapers(data.items || []);
                }
                if (deptsRes.ok) setDepartments(await deptsRes.json());
                if (typesRes.ok) setSubjectTypes(await typesRes.json());
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters]);

    const handleSearch = (query: string) => {
        setFilters((prev) => ({ ...prev, search: query }));
    };

    const handleApplyFilters = (newFilters: PaperFilters) => {
        setFilters(newFilters);
    };

    const activeFiltersCount = Object.values(filters).filter(
        (v) => v !== undefined && v !== ''
    ).length;

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>Browse Question Papers</h1>
                        <p className={styles.subtitle}>
                            {papers.length} papers found
                            {filters.search && ` for "${filters.search}"`}
                        </p>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className={styles.toolbar}>
                    <SearchBar
                        value={filters.search}
                        onSearch={handleSearch}
                        className={styles.searchBar}
                    />
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className={styles.filterButton}
                    >
                        <SlidersHorizontal size={18} />
                        <span>Filters</span>
                        {activeFiltersCount > 0 && (
                            <span className={styles.filterBadge}>{activeFiltersCount}</span>
                        )}
                    </button>
                </div>

                {/* Papers Grid */}
                {loading ? (
                    <div className={styles.loadingWrapper}>
                        <LoadingSpinner size="lg" />
                    </div>
                ) : papers.length > 0 ? (
                    <div className={styles.papersGrid}>
                        {papers.map((paper) => (
                            <PaperCard key={paper.id} paper={paper} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        title="No Papers Found"
                        description={
                            filters.search
                                ? "No papers match your search criteria. Try adjusting your filters."
                                : "No question papers have been uploaded yet."
                        }
                    />
                )}
            </div>

            {/* Filter Modal */}
            <FilterModal
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onApply={handleApplyFilters}
                departments={departments}
                subjectTypes={subjectTypes}
            />
        </div>
    );
}
