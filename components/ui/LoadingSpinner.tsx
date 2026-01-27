import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
    return (
        <div className={`${styles.spinner} ${styles[size]} ${className}`}>
            <div className={styles.circle}></div>
        </div>
    );
}

interface LoadingPageProps {
    message?: string;
}

export function LoadingPage({ message = 'Loading...' }: LoadingPageProps) {
    return (
        <div className={styles.page}>
            <LoadingSpinner size="lg" />
            <p className={styles.message}>{message}</p>
        </div>
    );
}
