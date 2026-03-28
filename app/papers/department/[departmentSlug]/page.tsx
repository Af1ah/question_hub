import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllDepartmentsWithHierarchy } from '@/lib/hierarchy';
import { ROUTES } from '@/constants';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ departmentSlug: string }> 
}) {
  const resolvedParams = await params;
  try {
    const slugOrId = (resolvedParams as any).departmentSlug || (resolvedParams as any).departmentId;
    const hierarchyData = await getAllDepartmentsWithHierarchy();
    const department = hierarchyData.departmentBySlug[slugOrId] || hierarchyData.departments.find(d => d.id === slugOrId);
    
    if (!department) {
      return { title: 'Department Not Found - QnHub' };
    }

    return {
      title: `${department.name} Semesters - QnHub`,
      description: `Explore question papers for ${department.name} by selecting a semester.`,
    };
  } catch (error) {
    return { title: 'QnHub' };
  }
}

export default async function DepartmentSemestersPage({
  params
}: {
  params: Promise<{ departmentSlug: string }>
}) {
  const resolvedParams = await params;
  try {
    const slugOrId = (resolvedParams as any).departmentSlug || (resolvedParams as any).departmentId;
    const hierarchyData = await getAllDepartmentsWithHierarchy();
    const department = hierarchyData.departmentBySlug[slugOrId] || hierarchyData.departments.find(d => d.id === slugOrId);
    
    if (!department) {
      notFound();
    }

    const semesters = hierarchyData.semesters[department.id] || [];

    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Link href={ROUTES.PAPERS} className={styles.backLink}>
              &larr; Back to Departments
            </Link>
          </div>

          <header className={styles.header}>
            <h1 className={styles.title}>{department.name} <span className={styles.code}>({department.code})</span></h1>
            <p className={styles.subtitle}>
              Select a semester to view available subjects
            </p>
          </header>

          {!semesters || semesters.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>No Semesters Found</h2>
              <p>There are currently no question papers available for this department.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {semesters.map((semester) => (
                <Link 
                  href={ROUTES.DEPARTMENT_SUBJECTS(department.slug, semester.value)} 
                  key={semester.value}
                  className={styles.card}
                >
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{semester.label}</h2>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.linkText}>View Subjects &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading semesters:', error);
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <h2>Error Loading Data</h2>
            <p>Unable to load semesters at the moment. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }
}
