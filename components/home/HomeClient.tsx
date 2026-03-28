'use client';

import { useState, useEffect, useRef } from 'react';
import { HeroSection } from './HeroSection';
import { RecentPapers } from './RecentPapers';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Paper, Department, SubjectType, PaperFilters } from '@/types';

interface HomeClientProps {
  initialPapers: Paper[];
  departments: Department[];
  subjectTypes: SubjectType[];
  availableYears: number[];
}

export function HomeClient({
  initialPapers,
  departments,
  subjectTypes,
  availableYears,
}: HomeClientProps) {
  const [filters, setFilters] = useState<PaperFilters>({});
  const [papers, setPapers] = useState<Paper[]>(initialPapers);
  const [loading, setLoading] = useState(false);
  
  const isSearchActive = Object.values(filters).some(val => val !== undefined && val !== '');
  
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSearchActive) {
      setPapers(initialPapers);
      return;
    }

    const fetchFiltered = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.set(key, String(value));
          }
        });
        
        const res = await fetch(`/api/papers?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setPapers(data.items || []);
        } else {
          console.error("Failed to fetch search results");
        }
      } catch (error) {
        console.error("Error fetching papers:", error);
      } finally {
        setLoading(false);
        // Scroll to results on first search if we are not at top
        if (resultsRef.current && window.scrollY < 200) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    // Basic debounce for typing
    const timeoutId = setTimeout(fetchFiltered, 300);
    return () => clearTimeout(timeoutId);

  }, [filters, initialPapers, isSearchActive]);

  return (
    <>
      <HeroSection
        departments={departments}
        subjectTypes={subjectTypes}
        availableYears={availableYears}
        onSearch={(query) => setFilters(prev => ({ ...prev, search: query }))}
        onApplyFilters={(newFilters) => setFilters(newFilters)}
        currentFilters={filters}
      />
      
      <div ref={resultsRef} style={{ scrollMarginTop: '80px', minHeight: '400px' }}>
        {loading ? (
            <div style={{ padding: '6rem 0', display: 'flex', justifyContent: 'center' }}>
                <LoadingSpinner />
            </div>
        ) : (
            <RecentPapers 
                papers={papers} 
                title={isSearchActive ? "Search Results" : "Recent Papers"} 
                hideViewAll={isSearchActive}
            />
        )}
      </div>
    </>
  );
}
