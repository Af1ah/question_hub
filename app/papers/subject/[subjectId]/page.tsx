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
  params: Promise<{ subjectId: string }> 
}) {
  const resolvedParams = await params;
  try {
    const hierarchyData = await getAllDepartmentsWithHierarchy();
    
    // Find the subject from all groups
    let subject = null;
    let deptId = null;
    let semNum = null;

    for (const [key, subjects] of Object.entries(hierarchyData.subjectsBySemester)) {
      const found = subjects.find(s => s.id === resolvedParams.subjectId);
      if (found) {
        subject = found;
        const [dId, sNum] = key.split('-');
        deptId = dId;
        semNum = parseInt(sNum);
        break;
      }
    }
    
    if (!subject) return { title: 'Subject Papers - QnHub' };

    return {
      title: `${subject.name} Previous Year Papers | QnHub`,
      description: `Download previous year question papers for ${subject.name} (${subject.code}).`,
    };
  } catch (error) {
    return { title: 'QnHub' };
  }
}

export default async function SubjectPapersPage({
  params
}: {
  params: Promise<{ subjectId: string }>
}) {
  const resolvedParams = await params;
  try {
    const hierarchyData = await getAllDepartmentsWithHierarchy();
    
    // Find the subject and its context
    let subject = null;
    let currDepartment = null;
    let currSemester = null;

    for (const [key, subjects] of Object.entries(hierarchyData.subjectsBySemester)) {
      const found = subjects.find(s => s.id === resolvedParams.subjectId);
      if (found) {
        subject = found;
        const [dId, sNum] = key.split('-');
        currDepartment = hierarchyData.departments.find(d => d.id === dId);
        currSemester = parseInt(sNum);
        break;
      }
    }
    
    if (!subject) {
      notFound();
    }

    const papers = hierarchyData.papersBySubject[subject.id] || [];

    // Group papers by year
    const papersByYear = papers.reduce((acc, paper) => {
      const year = paper.yearOfExam;
      if (!acc[year]) acc[year] = [];
      acc[year].push(paper);
      return acc;
    }, {} as Record<number, typeof papers>);

    const years = Object.keys(papersByYear).map(Number).sort((a, b) => b - a);

    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Link href={ROUTES.PAPERS} className={styles.crumbLink}>Departments</Link>
            {currDepartment && (
              <>
                <span className={styles.separator}>/</span>
                <Link href={ROUTES.DEPARTMENT_SEMESTERS(currDepartment.id)} className={styles.crumbLink}>
                  {currDepartment.code}
                </Link>
                {currSemester && (
                  <>
                    <span className={styles.separator}>/</span>
                    <Link href={ROUTES.DEPARTMENT_SUBJECTS(currDepartment.id, currSemester)} className={styles.crumbLink}>
                      Sem {currSemester}
                    </Link>
                  </>
                )}
              </>
            )}
            <span className={styles.separator}>/</span>
            <span className={styles.crumbCurrent}>{subject.code}</span>
          </div>

          <header className={styles.header}>
            <h1 className={styles.title}>{subject.name}</h1>
            <p className={styles.subtitle}>
              Question Papers Archive
            </p>
          </header>

          {!years || years.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>No Papers Found</h2>
              <p>There are currently no question papers available for this subject.</p>
            </div>
          ) : (
            <div className={styles.yearsList}>
              {years.map((year) => (
                <section key={year} className={styles.yearSection}>
                  <div className={styles.yearHeader}>
                    <h2 className={styles.yearTitle}>{year}</h2>
                    <span className={styles.paperCount}>
                      {papersByYear[year].length} Paper{papersByYear[year].length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className={styles.papersGrid}>
                    {papersByYear[year].map(paper => {
                      const cleanName = subject!.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                      const cleanCode = subject!.code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                      const slug = `${cleanName}-${cleanCode}-${paper.yearOfExam}-qn-${paper.qnNumber}`;
                      
                      const previewUrl = `/api/papers/${slug}/file?mode=preview`;
                      const downloadUrl = `/api/papers/${slug}/file?mode=download`;
                      
                      return (
                        <div key={paper.id} className={styles.paperCard}>
                          <div className={styles.paperInfo}>
                            <h3 className={styles.paperTitle}>QN: {paper.qnNumber}</h3>
                            <span className={styles.paperYear}>{paper.yearOfExam}</span>
                          </div>
                          <div className={styles.paperActions}>
                            <a 
                              href={previewUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className={styles.btnSecondary}
                            >
                              Preview
                            </a>
                            <a 
                              href={downloadUrl} 
                              className={styles.btnPrimary}
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading subject papers:', error);
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <h2>Error Loading Data</h2>
            <p>Unable to load subject papers at the moment. Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }
}
