import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PaperCard } from '@/components/ui/PaperCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Paper } from '@/types';
import { ROUTES } from '@/constants';
import styles from './RecentPapers.module.css';

interface RecentPapersProps {
    papers: Paper[];
    title?: string;
    hideViewAll?: boolean;
}

export function RecentPapers({ papers, title = "Recent Papers", hideViewAll = false }: RecentPapersProps) {
    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>{title}</h2>
                    {!hideViewAll && (
                        <Link href={ROUTES.PAPERS} className={styles.viewAllLink}>
                            View All Papers
                            <ArrowRight size={16} />
                        </Link>
                    )}
                </div>

                {papers.length > 0 ? (
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
    );
}
