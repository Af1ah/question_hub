import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FileText, Download, Calendar, BookOpen, Building, Tag, ArrowLeft } from 'lucide-react';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Paper } from '@/types';
import { COLLECTIONS, SITE_NAME, SITE_URL } from '@/constants';
import { formatFileSize, formatDate } from '@/lib/utils';
import styles from './page.module.css';

// ============================================================
// Firebase Admin for Server-Side Fetching
// ============================================================

function getAdminDb() {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (getApps().length === 0) {
        if (clientEmail && privateKey) {
            initializeApp({
                credential: cert({ projectId: projectId!, clientEmail, privateKey }),
            });
        } else {
            initializeApp({ projectId });
        }
    }

    return getFirestore();
}

async function getPaperBySlug(slug: string): Promise<Paper | null> {
    try {
        const db = getAdminDb();
        const snapshot = await db.collection(COLLECTIONS.PAPERS)
            .where('seoSlug', '==', slug)
            .limit(1)
            .get();

        if (snapshot.empty) {
            // Try by ID as fallback
            const docRef = await db.collection(COLLECTIONS.PAPERS).doc(slug).get();
            if (!docRef.exists) return null;
            return { id: docRef.id, ...docRef.data() } as Paper;
        }

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Paper;
    } catch (error) {
        console.error('Error fetching paper:', error);
        return null;
    }
}

// ============================================================
// SEO Metadata Generation
// ============================================================

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const paper = await getPaperBySlug(slug);

    if (!paper) {
        return {
            title: 'Paper Not Found',
        };
    }

    const title = `${paper.subjectName} - ${paper.yearOfExam} Question Paper | ${SITE_NAME}`;
    const description = `Download ${paper.subjectName} (${paper.subjectCode}) question paper from ${paper.yearOfExam}. ${paper.programType} Semester ${paper.semester} examination paper.`;
    const url = `${SITE_URL}/papers/${paper.seoSlug}`;

    return {
        title,
        description,
        keywords: [
            paper.subjectName,
            paper.subjectCode,
            `${paper.yearOfExam} question paper`,
            `semester ${paper.semester}`,
            paper.programType,
            'university exam',
            'question paper download',
        ],
        openGraph: {
            title,
            description,
            url,
            siteName: SITE_NAME,
            type: 'article',
            locale: 'en_IN',
        },
        twitter: {
            card: 'summary',
            title,
            description,
        },
        alternates: {
            canonical: url,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

// ============================================================
// JSON-LD Structured Data
// ============================================================

function generateStructuredData(paper: Paper) {
    return {
        '@context': 'https://schema.org',
        '@type': 'DigitalDocument',
        name: `${paper.subjectName} Question Paper ${paper.yearOfExam}`,
        description: `${paper.subjectCode} - ${paper.subjectName} examination question paper from ${paper.yearOfExam}`,
        url: `${SITE_URL}/papers/${paper.seoSlug}`,
        datePublished: paper.yearOfExam.toString(),
        educationalLevel: paper.programType,
        inLanguage: 'en',
        provider: {
            '@type': 'Organization',
            name: SITE_NAME,
            url: SITE_URL,
        },
        potentialAction: {
            '@type': 'DownloadAction',
            target: paper.fileUrl,
        },
    };
}

// ============================================================
// Page Component
// ============================================================

export default async function PaperDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const paper = await getPaperBySlug(slug);

    if (!paper) {
        notFound();
    }

    const structuredData = generateStructuredData(paper);

    return (
        <>
            {/* JSON-LD Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
            />

            <div className={styles.page}>
                <div className={styles.container}>
                    {/* Back Link */}
                    <Link href="/papers" className={styles.backLink}>
                        <ArrowLeft size={18} />
                        <span>Back to Papers</span>
                    </Link>

                    {/* Main Content */}
                    <div className={styles.content}>
                        {/* Header */}
                        <div className={styles.header}>
                            <div className={styles.icon}>
                                <FileText size={40} />
                            </div>
                            <div className={styles.headerInfo}>
                                <h1 className={styles.title}>{paper.subjectName}</h1>
                                <p className={styles.subtitle}>
                                    {paper.subjectCode} • {paper.yearOfExam}
                                </p>
                            </div>
                        </div>

                        {/* Meta Info Grid */}
                        <div className={styles.metaGrid}>
                            <div className={styles.metaItem}>
                                <Calendar size={18} />
                                <div>
                                    <span className={styles.metaLabel}>Year</span>
                                    <span className={styles.metaValue}>{paper.yearOfExam}</span>
                                </div>
                            </div>
                            <div className={styles.metaItem}>
                                <BookOpen size={18} />
                                <div>
                                    <span className={styles.metaLabel}>Semester</span>
                                    <span className={styles.metaValue}>Semester {paper.semester}</span>
                                </div>
                            </div>
                            <div className={styles.metaItem}>
                                <Tag size={18} />
                                <div>
                                    <span className={styles.metaLabel}>Program</span>
                                    <span className={styles.metaValue}>{paper.programType}</span>
                                </div>
                            </div>
                            <div className={styles.metaItem}>
                                <FileText size={18} />
                                <div>
                                    <span className={styles.metaLabel}>QP Code</span>
                                    <span className={styles.metaValue}>{paper.qnNumber}</span>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {paper.description && (
                            <div className={styles.description}>
                                <h2>Description</h2>
                                <p>{paper.description}</p>
                            </div>
                        )}

                        {/* Download Section */}
                        <div className={styles.downloadSection}>
                            <div className={styles.fileInfo}>
                                <span className={styles.fileName}>{paper.fileName}</span>
                                <span className={styles.fileSize}>{formatFileSize(paper.fileSize)}</span>
                            </div>
                            <a
                                href={paper.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.downloadButton}
                            >
                                <Download size={20} />
                                <span>Download Paper</span>
                            </a>
                        </div>

                        {/* Stats */}
                        <div className={styles.stats}>
                            <span>{paper.downloadCount || 0} downloads</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
