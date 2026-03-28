import { getAllDepartmentsWithHierarchy } from './lib/hierarchy';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Assuming there is a .env.local

async function run() {
  try {
    const data = await getAllDepartmentsWithHierarchy();
    console.log("Departments:", data.departments.map(d => d.id));
    console.log("Semesters keys:", Object.keys(data.semesters));
    console.log("Semesters data:", data.semesters);
    console.log("Subjects:", Object.keys(data.subjectsBySemester));
  } catch (err) {
    console.error(err);
  }
}
run();
