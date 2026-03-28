import Link from 'next/link';
import { Department } from '@/types';
import { getAllDepartmentsWithHierarchy } from '@/lib/hierarchy';
import { ROUTES } from '@/constants';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata() {
  try {
    const hierarchyData = await getAllDepartmentsWithHierarchy();
    const totalDepartments = hierarchyData.departments?.length || 0;
    
    return {
      title: `Browse Departments - QnHub`,
      description: `Explore question papers from ${totalDepartments} departments. Browse and download previous year papers for your academic needs.`,
    };
  } catch (error) {
    return {
      title: 'Browse Departments - QnHub',
      description: 'Explore question papers by department, semester, and subject.',
    };
  }
}

export default async function PapersPage() {
  try {
    const hierarchyData = await getAllDepartmentsWithHierarchy();
    
    // Sort departments alphabetically
    const departments = (hierarchyData.departments || []).sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>Browse Question Papers</h1>
            <p className={styles.subtitle}>
              Select a department to view available semesters and subjects
            </p>
          </header>

          {!departments || departments.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>No Departments Found</h2>
              <p>No departments have been added yet. Please check back later.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {departments.map((dept) => (
                <Link 
                  href={ROUTES.DEPARTMENT_SEMESTERS(dept.id)} 
                  key={dept.id}
                  className={styles.card}
                >
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{dept.name}</h2>
                    <span className={styles.badge}>{dept.code}</span>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.linkText}>View Semesters &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading papers hierarchy:', error);
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <h2>Error Loading Data</h2>
            <p>Unable to load departments at the moment. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }
}
