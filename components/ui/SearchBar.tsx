'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { debounce } from '@/lib/utils';
import styles from './SearchBar.module.css';

interface SearchBarProps {
    placeholder?: string;
    value?: string;
    onSearch: (query: string) => void;
    debounceMs?: number;
    className?: string;
}

export function SearchBar({
    placeholder = 'Search by subject name or code...',
    value = '',
    onSearch,
    debounceMs = 300,
    className = '',
}: SearchBarProps) {
    const [inputValue, setInputValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update local state when prop changes
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Debounced search
    const debouncedSearch = useCallback(
        debounce((query: string) => {
            onSearch(query);
        }, debounceMs),
        [onSearch, debounceMs]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        debouncedSearch(newValue);
    };

    const handleClear = () => {
        setInputValue('');
        onSearch('');
        inputRef.current?.focus();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(inputValue);
    };

    return (
        <form onSubmit={handleSubmit} className={`${styles.searchBar} ${className}`}>
            <div className={styles.inputWrapper}>
                <Search className={styles.searchIcon} size={20} />
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className={styles.input}
                    aria-label="Search papers"
                />
                {inputValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className={styles.clearButton}
                        aria-label="Clear search"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
        </form>
    );
}
