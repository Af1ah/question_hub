'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, ArrowRight } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterModal } from '@/components/ui/FilterModal';
import { PaperCard } from '@/components/ui/PaperCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Paper, PaperFilters, Department, SubjectType } from '@/types';
import { ROUTES, SITE_NAME } from '@/constants';
import styles from './page.module.css';

export default function HomePage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjectTypes, setSubjectTypes] = useState<SubjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PaperFilters>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch papers
        const papersRes = await fetch('/api/papers?limit=6');
        if (papersRes.ok) {
          const papersData = await papersRes.json();
          setPapers(papersData.items || []);
        }

        // Fetch departments
        const deptsRes = await fetch('/api/departments');
        if (deptsRes.ok) {
          const deptsData = await deptsRes.json();
          setDepartments(deptsData || []);
        }

        // Fetch subject types
        const typesRes = await fetch('/api/subject-types');
        if (typesRes.ok) {
          const typesData = await typesRes.json();
          setSubjectTypes(typesData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
    // Navigate to papers page with search
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
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Welcome to <span className={styles.highlight}>{SITE_NAME}</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Your comprehensive question paper bank for all academic needs.
            Browse and download previous year papers instantly.
          </p>

          {/* Search */}
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
        </div>
      </section>

      {/* Recent Papers Section */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Papers</h2>
            <Link href={ROUTES.PAPERS} className={styles.viewAllLink}>
              View All Papers
              <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className={styles.loadingWrapper}>
              <LoadingSpinner size="lg" />
            </div>
          ) : papers.length > 0 ? (
            <div className={styles.recentPapersList}>
              {papers.map((paper) => (
                <PaperCard key={paper.id} paper={paper} variant="compact" />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Papers Found"
              description="No question papers have been uploaded yet."
            />
          )}
        </div>
      </section>

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
