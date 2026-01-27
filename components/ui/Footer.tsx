import Link from 'next/link';
import { SITE_NAME } from '@/constants';
import styles from './Footer.module.css';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.top}>
                    {/* Brand */}
                    <div className={styles.brand}>
                        <Link href="/" className={styles.logo}>
                            <span className={styles.logoIcon}>📚</span>
                            <span className={styles.logoText}>{SITE_NAME}</span>
                        </Link>
                        <p className={styles.tagline}>
                            Your comprehensive question paper bank for all academic needs.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className={styles.linkGroup}>
                        <h4 className={styles.linkGroupTitle}>Quick Links</h4>
                        <ul className={styles.linkList}>
                            <li><Link href="/" className={styles.link}>Home</Link></li>
                            <li><Link href="/papers" className={styles.link}>Browse Papers</Link></li>
                            <li><Link href="/teacher/login" className={styles.link}>Teacher Portal</Link></li>
                            <li><Link href="/admin/login" className={styles.link}>Admin Portal</Link></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div className={styles.linkGroup}>
                        <h4 className={styles.linkGroupTitle}>Resources</h4>
                        <ul className={styles.linkList}>
                            <li><Link href="/papers?semester=1" className={styles.link}>Semester 1</Link></li>
                            <li><Link href="/papers?semester=2" className={styles.link}>Semester 2</Link></li>
                            <li><Link href="/papers?semester=3" className={styles.link}>Semester 3</Link></li>
                            <li><Link href="/papers?semester=4" className={styles.link}>Semester 4</Link></li>
                        </ul>
                    </div>
                </div>

                <div className={styles.bottom}>
                    <p className={styles.copyright}>
                        © {currentYear} {SITE_NAME}. All rights reserved.
                    </p>
                    <p className={styles.credits}>
                        Made with ❤️ for students
                    </p>
                </div>
            </div>
        </footer>
    );
}
