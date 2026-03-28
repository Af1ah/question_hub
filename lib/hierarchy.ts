import { adminGetDocuments } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/constants';
import { Department, Subject, Paper, SubjectType } from '@/types';

/**
 * Fetches all departments with their hierarchical data:
 * - Departments
 * - Semesters for each department
 * - Subjects for each department-semester combination
 * - Papers for each subject
 */
export async function getAllDepartmentsWithHierarchy() {
  try {
    // Fetch all basic data in parallel
    const [
      departments,
      subjects,
      papers,
      subjectTypes
    ] = await Promise.all([
      adminGetDocuments<Department>(COLLECTIONS.DEPARTMENTS),
      adminGetDocuments<Subject>(COLLECTIONS.SUBJECTS),
      adminGetDocuments<Paper>(COLLECTIONS.PAPERS),
      adminGetDocuments<SubjectType>(COLLECTIONS.SUBJECT_TYPES)
    ]);

    // Filter only published papers
    const publishedPapers = papers.filter(paper => paper.isPublished);

    // Create virtual subjects for papers missing subjectId
    const virtualSubjectsMap: Record<string, Subject> = {};

    publishedPapers.forEach(paper => {
      if (!paper.subjectId && paper.departmentId) {
        const identifier = paper.subjectCode || `unknown-${paper.id}`;
        // Create a unique deterministic ID
        const virtualId = `virtual-${paper.departmentId}-${identifier.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        if (!virtualSubjectsMap[virtualId]) {
          virtualSubjectsMap[virtualId] = {
            id: virtualId,
            name: paper.subjectName || identifier,
            code: identifier,
            departmentId: paper.departmentId,
            // provide safe fallback for other Subject fields based on paper fields
          } as Subject;
        }
        
        // Update the paper in memory so it references the virtual subject
        paper.subjectId = virtualId;
      }
    });

    const allSubjects = [...subjects, ...Object.values(virtualSubjectsMap)];

    const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // Organize data hierarchically
    const departmentsMap: Record<string, Department> = {};
    const departmentBySlug: Record<string, Department> = {};
    const usedDeptSlugs = new Set<string>();

    departments.forEach(dept => {
      let baseSlug = dept.code ? slugify(dept.code) : slugify(dept.name);
      if (!baseSlug) baseSlug = dept.id;
      let finalSlug = baseSlug;
      let counter = 1;
      while (usedDeptSlugs.has(finalSlug)) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      usedDeptSlugs.add(finalSlug);
      dept.slug = finalSlug;
      departmentsMap[dept.id] = dept;
      departmentBySlug[finalSlug] = dept;
    });

    const usedSubjectSlugs = new Set<string>();
    const subjectBySlug: Record<string, Subject> = {};

    allSubjects.forEach(subject => {
      let baseSlug = slugify(subject.name);
      if (!baseSlug) baseSlug = subject.code ? slugify(subject.code) : subject.id;
      let finalSlug = baseSlug;
      let counter = 1;
      while (usedSubjectSlugs.has(finalSlug)) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      usedSubjectSlugs.add(finalSlug);
      subject.slug = finalSlug;
      subjectBySlug[finalSlug] = subject;
    });

    // Group subjects by department and semester
    const subjectsByDeptSemester: Record<string, Subject[]> = {};
    allSubjects.forEach(subject => {
      const key = `${subject.departmentId}-${getSemesterForSubject(subject, publishedPapers)}`;
      if (!subjectsByDeptSemester[key]) {
        subjectsByDeptSemester[key] = [];
      }
      subjectsByDeptSemester[key].push(subject);
    });

    // Group papers by subject
    const papersBySubject: Record<string, Paper[]> = {};
    publishedPapers.forEach(paper => {
      if (!papersBySubject[paper.subjectId]) {
        papersBySubject[paper.subjectId] = [];
      }
      papersBySubject[paper.subjectId].push(paper);
    });

    // Get unique semesters for each department
    const semestersByDept: Record<string, Set<number>> = {};
    allSubjects.forEach(subject => {
      const deptId = subject.departmentId;
      const semester = getSemesterForSubject(subject, publishedPapers);
      if (!semestersByDept[deptId]) {
        semestersByDept[deptId] = new Set();
      }
      semestersByDept[deptId].add(semester);
    });

    // Convert sets to sorted arrays
    const semestersArray: Record<string, Array<{ value: number; label: string }>> = {};
    Object.keys(semestersByDept).forEach(deptId => {
      const sortedSemesters = Array.from(semestersByDept[deptId]).sort((a, b) => a - b);
      semestersArray[deptId] = sortedSemesters.map(value => ({
        value,
        label: `Semester ${value}`
      }));
    });

    return {
      departments: Object.values(departmentsMap),
      departmentBySlug,
      semesters: semestersArray,
      subjectsBySemester: subjectsByDeptSemester,
      papersBySubject: papersBySubject,
      subjectBySlug
    };
  } catch (error) {
    console.error('Error fetching hierarchy data:', error);
    throw error;
  }
}

/**
 * Helper function to determine the semester for a subject based on available papers
 * Falls back to semester 1 if no papers found
 */
function getSemesterForSubject(subject: Subject, papers: Paper[]): number {
  const subjectPapers = papers.filter(paper => paper.subjectId === subject.id);
  if (subjectPapers.length > 0) {
    // Return the most common semester for this subject's papers
    const semesterCounts: Record<number, number> = {};
    subjectPapers.forEach(paper => {
      semesterCounts[paper.semester] = (semesterCounts[paper.semester] || 0) + 1;
    });

    let maxSemester = 1;
    let maxCount = 0;
    Object.entries(semesterCounts).forEach(([semester, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxSemester = parseInt(semester);
      }
    });

    return maxSemester;
  }
  return 1; // Default to semester 1 if no papers found
}
