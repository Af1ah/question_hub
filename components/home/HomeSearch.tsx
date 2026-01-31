'use client';

import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterModal } from '@/components/ui/FilterModal';
import { PaperFilters, Department, SubjectType } from '@/types';
import { ROUTES } from '@/constants';
import styles from './HomeSearch.module.css';

interface HomeSearchProps {
    departments: Department[];
    subjectTypes: SubjectType[];
}

export function HomeSearch({ departments, subjectTypes }: HomeSearchProps) {
    const [filters, setFilters] = useState<PaperFilters>({});
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const handleSearch = (query: string) => {
        setFilters((prev) => ({ ...prev, search: query }));
        if (query) {
            window.location.href = `${ROUTES.PAPERS}?search=${encodeURIComponent(query)}`;
        }
    };

    const handleApplyFilters = (newFilters: PaperFilters) => {
        const params = new URLSearchParams();

        Object.entries(newFilters).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                params.set(key, String(value));
            }
        });

        window.location.href = `${ROUTES.PAPERS}?${params.toString()}`;
    };

    return (
        <>
            <div className={styles.searchWrapper}>
                <SearchBar
                    placeholder="Search by subject name or code..."
                    onSearch={handleSearch}
                />
                <button
                    onClick={() => setIsFilterOpen(true)}
                    className={styles.filterButton}
                    aria-label="Open filters"
                >
                    <SlidersHorizontal size={20} />
                </button>
            </div>

            <FilterModal
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filters={filters}
                onApply={handleApplyFilters}
                departments={departments}
                subjectTypes={subjectTypes}
            />
        </>
    );
}
