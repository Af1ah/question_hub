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

function PapersContent() {
    const searchParams = useSearchParams();

    const [papers, setPapers] = useState<Paper[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filters, setFilters] = useState<PaperFilters>({});
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);

    const PAGE_SIZE = 12;

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

    // Fetch data when filters change (reset pagination)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setOffset(0);
            try {
                // Build query string
                const params = new URLSearchParams();
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== '') {
                        params.set(key, String(value));
                    }
                });
                params.set('limit', String(PAGE_SIZE));
                params.set('offset', '0');

                const [papersRes, deptsRes, typesRes] = await Promise.all([
                    fetch(`/api/papers?${params.toString()}`),
                    fetch('/api/departments'),
                    fetch('/api/subject-types'),
                ]);

                if (papersRes.ok) {
                    const data = await papersRes.json();
                    setPapers(data.items || []);
                    setTotal(data.total || 0);
                    setHasMore(data.hasMore || false);
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

    const handleLoadMore = async () => {
        setLoadingMore(true);
        const newOffset = offset + PAGE_SIZE;
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    params.set(key, String(value));
                }
            });
            params.set('limit', String(PAGE_SIZE));
            params.set('offset', String(newOffset));

            const res = await fetch(`/api/papers?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setPapers((prev) => [...prev, ...(data.items || [])]);
                setHasMore(data.hasMore || false);
                setOffset(newOffset);
            }
        } catch (error) {
            console.error('Error loading more:', error);
        } finally {
            setLoadingMore(false);
        }
    };

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
                            {total} papers found
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

                {/* Papers List */}
                {loading ? (
                    <div className={styles.loadingWrapper}>
                        <LoadingSpinner size="lg" />
                    </div>
                ) : papers.length > 0 ? (
                    <>
                        <div className={styles.papersList}>
                            {papers.map((paper) => (
                                <PaperCard key={paper.id} paper={paper} variant="compact" />
                            ))}
                        </div>
                        {hasMore && (
                            <div className={styles.loadMoreWrapper}>
                                <button
                                    onClick={handleLoadMore}
                                    className={styles.loadMoreButton}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? (
                                        <>
                                            <LoadingSpinner size="sm" />
                                            <span>Loading...</span>
                                        </>
                                    ) : (
                                        <span>Load More Papers</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
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

// Loading fallback for Suspense
function PapersLoading() {
    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.loadingWrapper}>
                    <LoadingSpinner size="lg" />
                </div>
            </div>
        </div>
    );
}

import { Suspense } from 'react';

export default function PapersPage() {
    return (
        <Suspense fallback={<PapersLoading />}>
            <PapersContent />
        </Suspense>
    );
}
