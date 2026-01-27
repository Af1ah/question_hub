import Link from 'next/link';
import { FileQuestion, Home, Search } from 'lucide-react';
import { ROUTES } from '@/constants';
import styles from './not-found.module.css';

export default function NotFound() {
    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.icon}>
                    <FileQuestion size={64} />
                </div>
                <h1 className={styles.title}>Page Not Found</h1>
                <p className={styles.description}>
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div className={styles.actions}>
                    <Link href={ROUTES.HOME} className={styles.primaryButton}>
                        <Home size={18} />
                        <span>Go Home</span>
                    </Link>
                    <Link href={ROUTES.PAPERS} className={styles.secondaryButton}>
                        <Search size={18} />
                        <span>Browse Papers</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
