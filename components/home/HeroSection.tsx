import Image from 'next/image';
import { HomeSearch } from './HomeSearch';
import { Department, SubjectType } from '@/types';
import { SITE_NAME } from '@/constants';
import styles from './HeroSection.module.css';

interface HeroSectionProps {
    departments: Department[];
    subjectTypes: SubjectType[];
    availableYears?: number[];
}

export function HeroSection({ departments, subjectTypes, availableYears }: HeroSectionProps) {
    return (
        <section className={styles.hero}>
            {/* Background Image */}
            <div className={styles.heroImageWrapper}>
                <Image
                    src="/hero-bg.webp"
                    alt="Question Hub Hero Background"
                    fill
                    priority
                    quality={90}
                    sizes="100vw"
                    className={styles.heroImage}
                />
            </div>

            {/* Content */}
            <div className={styles.heroContent}>
                <h1 className={styles.heroTitle}>
                    Welcome to <span className={styles.highlight}>{SITE_NAME}</span>
                </h1>
                <p className={styles.heroSubtitle}>
                    Your comprehensive question paper bank for all academic needs.
                    Browse and download previous year papers instantly.
                </p>

                <HomeSearch departments={departments} subjectTypes={subjectTypes} availableYears={availableYears} />
            </div>
        </section>
    );
}
