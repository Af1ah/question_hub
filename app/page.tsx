import { HeroSection } from '@/components/home/HeroSection';
import { RecentPapers } from '@/components/home/RecentPapers';
import { Paper, Department, SubjectType } from '@/types';
import styles from './page.module.css';

// Mark route as dynamic for fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fetch data on the server
async function getInitialData() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    // Fetch papers, departments, and subject types in parallel
    const [papersRes, deptsRes, typesRes] = await Promise.all([
      fetch(`${baseUrl}/api/papers?limit=6`, {
        next: { revalidate: 0, tags: ['papers'] }
      }),
      fetch(`${baseUrl}/api/departments`, {
        next: { revalidate: 3600, tags: ['departments'] }
      }),
      fetch(`${baseUrl}/api/subject-types`, {
        next: { revalidate: 3600, tags: ['subject-types'] }
      }),
    ]);

    const papers: Paper[] = papersRes.ok ? (await papersRes.json()).items || [] : [];
    const departments: Department[] = deptsRes.ok ? await deptsRes.json() : [];
    const subjectTypes: SubjectType[] = typesRes.ok ? await typesRes.json() : [];

    return { papers, departments, subjectTypes };
  } catch (error) {
    console.error('Error fetching initial data:', error);
    return {
      papers: [] as Paper[],
      departments: [] as Department[],
      subjectTypes: [] as SubjectType[]
    };
  }
}

export default async function HomePage() {
  const { papers, departments, subjectTypes } = await getInitialData();

  return (
    <div className={styles.page}>
      <HeroSection departments={departments} subjectTypes={subjectTypes} />
      <RecentPapers papers={papers} />
    </div>
  );
}
