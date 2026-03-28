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
  params: Promise<{ departmentSlug: string; semester: string }> 
}) {
  const resolvedParams = await params;
  try {
    const slugOrId = (resolvedParams as any).departmentSlug || (resolvedParams as any).departmentId;
    const hierarchyData = await getAllDepartmentsWithHierarchy();
    const department = hierarchyData.departmentBySlug[slugOrId] || hierarchyData.departments.find(d => d.id === slugOrId);
    
    if (!department) return { title: 'Semester Subjects - QnHub' };

    return {
      title: `Semester ${resolvedParams.semester} Subjects - ${department.name} | QnHub`,
      description: `Explore question papers for Semester ${resolvedParams.semester} in ${department.name}.`,
    };
  } catch (error) {
    return { title: 'QnHub' };
  }
}

export default async function SemesterSubjectsPage({
  params
}: {
  params: Promise<{ departmentSlug: string; semester: string }>
}) {
  const resolvedParams = await params;
  try {
    const slugOrId = (resolvedParams as any).departmentSlug || (resolvedParams as any).departmentId;
    const hierarchyData = await getAllDepartmentsWithHierarchy();
    const department = hierarchyData.departmentBySlug[slugOrId] || hierarchyData.departments.find(d => d.id === slugOrId);
    const semNumber = parseInt(resolvedParams.semester);
    
    if (!department || isNaN(semNumber)) {
      notFound();
    }

    const key = `${department.id}-${semNumber}`;
    const subjects = hierarchyData.subjectsBySemester[key] || [];

    // Sort subjects alphabetically
    subjects.sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Link href={ROUTES.PAPERS} className={styles.crumbLink}>Departments</Link>
            <span className={styles.separator}>/</span>
            <Link href={ROUTES.DEPARTMENT_SEMESTERS(department.slug)} className={styles.crumbLink}>
              {department.code}
            </Link>
            <span className={styles.separator}>/</span>
            <span className={styles.crumbCurrent}>Semester {semNumber}</span>
          </div>

          <header className={styles.header}>
            <h1 className={styles.title}>Semester {semNumber} Subjects</h1>
            <p className={styles.subtitle}>
              {department.name}
            </p>
          </header>

          {!subjects || subjects.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>No Subjects Found</h2>
              <p>There are currently no subjects available for this semester.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {subjects.map((subject) => (
                <Link 
                  href={ROUTES.SUBJECT_PAPERS(subject.slug)} 
                  key={subject.id}
                  className={styles.card}
                >
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>{subject.name}</h2>
                    <span className={styles.badge}>{subject.code}</span>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={styles.linkText}>View Papers &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading subjects:', error);
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <h2>Error Loading Data</h2>
            <p>Unable to load subjects at the moment. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }
}
