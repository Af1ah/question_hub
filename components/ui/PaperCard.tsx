import Link from 'next/link';
import { Download, Calendar, BookOpen, Tag } from 'lucide-react';
import { Paper } from '@/types';
import { formatFileSize, formatDate } from '@/lib/utils';
import { ROUTES } from '@/constants';
import styles from './PaperCard.module.css';

interface PaperCardProps {
    paper: Paper;
}

export function PaperCard({ paper }: PaperCardProps) {
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

                {/* Meta */}
                <div className={styles.meta}>
                    <div className={styles.metaItem}>
                        <Calendar size={14} />
                        <span>{paper.yearOfExam}</span>
                    </div>
                    <div className={styles.metaItem}>
                        <BookOpen size={14} />
                        <span>{formatFileSize(paper.fileSize)}</span>
                    </div>
                </div>
            </Link>

            {/* Actions */}
            <div className={styles.actions}>
                <a
                    href={paper.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadButton}
                    download
                >
                    <Download size={16} />
                    <span>Download</span>
                </a>
            </div>
        </article>
    );
}
