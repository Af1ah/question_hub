import { Metadata } from 'next';
import { Paper } from '@/types';
import { SITE_NAME, SITE_DESCRIPTION } from '@/constants';

// ============================================================
// Base Metadata
// ============================================================

export const baseMetadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'question papers',
    'exam papers',
    'university papers',
    'previous year papers',
    'question bank',
    'academic resources',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
  },
};

// ============================================================
// Paper-Specific Metadata
// ============================================================

/**
 * Generate metadata for a paper detail page
 */
export function generatePaperMetadata(paper: Paper): Metadata {
  const title = `${paper.subjectName} - ${paper.yearOfExam} Question Paper`;
  const description = `Download ${paper.subjectName} (${paper.subjectCode}) question paper from ${paper.yearOfExam}. Semester ${paper.semester} examination paper for ${paper.programType} program.`;

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
      'previous year paper',
    ],
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/papers/${paper.seoSlug}`,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: `/papers/${paper.seoSlug}`,
    },
  };
}

// ============================================================
// JSON-LD Structured Data
// ============================================================

/**
 * Generate JSON-LD structured data for a paper
 */
export function generatePaperJsonLd(paper: Paper): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'DigitalDocument',
    name: `${paper.subjectName} - ${paper.yearOfExam} Question Paper`,
    description: `Question paper for ${paper.subjectName} (${paper.subjectCode}) from ${paper.yearOfExam} examination. Semester ${paper.semester}, ${paper.programType} program.`,
    url: `/papers/${paper.seoSlug}`,
    datePublished: paper.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    dateModified: paper.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    encodingFormat: 'application/pdf',
    accessMode: 'textual',
    accessibilityControl: ['fullKeyboardControl', 'fullMouseControl'],
    accessibilityHazard: 'none',
    educationalLevel: paper.programType,
    teaches: paper.subjectName,
    isPartOf: {
      '@type': 'CreativeWorkSeries',
      name: `${paper.programType} Semester ${paper.semester} Papers`,
    },
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    about: {
      '@type': 'Course',
      name: paper.subjectName,
      courseCode: paper.subjectCode,
    },
  };
}

/**
 * Generate JSON-LD for the website (homepage)
 */
export function generateWebsiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/papers?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Generate JSON-LD for organization
 */
export function generateOrganizationJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    sameAs: [],
  };
}

// ============================================================
// Sitemap Helpers
// ============================================================

interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Generate sitemap entry for a paper
 */
export function generatePaperSitemapEntry(paper: Paper): SitemapEntry {
  return {
    url: `/papers/${paper.seoSlug}`,
    lastModified: paper.updatedAt?.toDate?.() || new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  };
}

/**
 * Static pages for sitemap
 */
export const staticPages: SitemapEntry[] = [
  {
    url: '/',
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    url: '/papers',
    changeFrequency: 'daily',
    priority: 0.9,
  },
];
