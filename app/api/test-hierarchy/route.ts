import { NextResponse } from 'next/server';
import { getAllDepartmentsWithHierarchy } from '@/lib/hierarchy';

export async function GET() {
  const data = await getAllDepartmentsWithHierarchy();
  return NextResponse.json({
    departmentSlugs: Object.keys(data.departmentBySlug),
    subjectSlugs: Object.keys(data.subjectBySlug),
    departments: data.departments,
  });
}
