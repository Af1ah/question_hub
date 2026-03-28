import type { Metadata } from 'next';
import { Inter, Nova_Round } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/ui/Header';
import { Footer } from '@/components/ui/Footer';
import { baseMetadata } from '@/lib/seo';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const novaRound = Nova_Round({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-brand',
});

export const metadata: Metadata = {
  ...baseMetadata,
  title: 'QnHub - Your Question Paper Bank',
  description: 'Access and download question papers for all your academic needs. Search and browse by subject, semester, or department.',
  keywords: [
    'question papers',
    'previous year papers',
    'exam papers',
    'question bank',
    'academic resources',
    'university papers',
    'study materials',
    'exam preparation'
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'QnHub',
    title: 'QnHub - Your Question Paper Bank',
    description: 'Access and download question papers for all your academic needs. Search and browse by subject, semester, or department.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QnHub - Your Question Paper Bank',
    description: 'Access and download question papers for all your academic needs. Search and browse by subject, semester, or department.',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${novaRound.variable}`}>
      <body>
        <Providers>
          <div className="app-wrapper">
            <Header />
            <main className="main-content">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
