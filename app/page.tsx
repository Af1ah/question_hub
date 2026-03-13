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
    const [papersRes, deptsRes, typesRes, yearsRes] = await Promise.all([
      fetch(`${baseUrl}/api/papers?limit=10`, {
        next: { revalidate: 0, tags: ['papers'] }
      }),
      fetch(`${baseUrl}/api/departments`, {
        next: { revalidate: 3600, tags: ['departments'] }
      }),
      fetch(`${baseUrl}/api/subject-types`, {
        next: { revalidate: 3600, tags: ['subject-types'] }
      }),
      fetch(`${baseUrl}/api/papers/years`, {
        next: { revalidate: 3600, tags: ['paper-years'] }
      }),
    ]);

    const papers: Paper[] = papersRes.ok ? (await papersRes.json()).items || [] : [];
    const departments: Department[] = deptsRes.ok ? await deptsRes.json() : [];
    const subjectTypes: SubjectType[] = typesRes.ok ? await typesRes.json() : [];
    const availableYears: number[] = yearsRes.ok ? await yearsRes.json() : [];

    return { papers, departments, subjectTypes, availableYears };
  } catch (error) {
    console.error('Error fetching initial data:', error);
    return {
      papers: [] as Paper[],
      departments: [] as Department[],
      subjectTypes: [] as SubjectType[],
      availableYears: [] as number[],
    };
  }
}

export default async function HomePage() {
  const { papers, departments, subjectTypes, availableYears } = await getInitialData();

  return (
    <div className={styles.page}>
      <HeroSection departments={departments} subjectTypes={subjectTypes} availableYears={availableYears} />
      <RecentPapers papers={papers} />
    </div>
  );
}

