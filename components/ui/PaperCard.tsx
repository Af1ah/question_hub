import Link from 'next/link';
import { Download, Eye, Calendar, BookOpen, Tag } from 'lucide-react';
import { Paper } from '@/types';
import { ROUTES } from '@/constants';
import styles from './PaperCard.module.css';

interface PaperCardProps {
    paper: Paper;
    variant?: 'default' | 'compact';
}

export function PaperCard({ paper, variant = 'default' }: PaperCardProps) {
    const previewUrl = `/api/papers/${paper.seoSlug}/file?mode=preview`;
    const downloadUrl = `/api/papers/${paper.seoSlug}/file?mode=download`;

    if (variant === 'compact') {
        return (
            <article className={styles.compactCard}>
                <Link href={ROUTES.PAPER_DETAIL(paper.seoSlug)} className={styles.compactCardLink}>
                    <div className={styles.compactContent}>
                        <h3 className={styles.compactTitle}>{paper.subjectName}</h3>
                        <div className={styles.compactMeta}>
                            <span className={styles.compactMetaItem}>
                                <Tag size={12} />
                                {paper.subjectCode}
                            </span>
                            <span className={styles.compactMetaItem}>
                                <BookOpen size={12} />
                                Sem {paper.semester}
                            </span>
                            <span className={styles.compactMetaItem}>
                                <Calendar size={12} />
                                {paper.yearOfExam}
                            </span>
                        </div>
                    </div>
                </Link>
                <div className={styles.compactActions}>
                    <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.primaryDownloadBtn}
                        aria-label="Preview paper"
                    >
                        <Eye size={18} />
                        <span>Preview</span>
                    </a>
                    <a
                        href={downloadUrl}
                        className={styles.secondaryDownloadBtn}
                        aria-label="Download paper"
                    >
                        <Download size={18} />
                    </a>
                </div>
            </article>
        );
    }

    return (
        <article className={styles.card}>
            <Link href={ROUTES.PAPER_DETAIL(paper.seoSlug)} className={styles.cardLink}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.badge}>{paper.programType}</div>
                    <span className={styles.semester}>Sem {paper.semester}</span>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    <h3 className={styles.title}>{paper.subjectName}</h3>
                    <p className={styles.code}>{paper.subjectCode}</p>
                </div>
            </Link>

            {/* Actions */}
            <div className={styles.actions}>
                <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadButton}
                >
                    <Eye size={16} />
                    <span>Preview</span>
                </a>
                <a
                    href={downloadUrl}
                    className={styles.downloadButtonSecondary}
                >
                    <Download size={16} />
                </a>
            </div>
        </article>
    );
}

