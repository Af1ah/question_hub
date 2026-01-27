import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
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

export const metadata: Metadata = {
  ...baseMetadata,
  title: 'Question Hub - Your Question Paper Bank',
  description: 'Access and download question papers for all your academic needs. Browse by subject, semester, or department.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
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
