/** ElevateX sample students — seed via `pnpm run seed:elevatex` or POST `/api/setup/seed-elevatex-sample`. */

export const ELEVATEX_SAMPLE_PASSWORD = 'ElevateX2026';

export type ElevateXSampleStudent = {
  roll: string;
  fullName: string;
  department: string;
  year: string;
};

export const ELEVATEX_SAMPLE_STUDENTS: ElevateXSampleStudent[] = [
  { roll: 'EX26001', fullName: 'ElevateX Sample 01', department: 'Computer Science Engineering', year: 'III Year' },
  { roll: 'EX26002', fullName: 'ElevateX Sample 02', department: 'Electronics & Communication Engineering', year: 'III Year' },
  { roll: 'EX26003', fullName: 'ElevateX Sample 03', department: 'Mechanical Engineering', year: 'III Year' },
  { roll: 'EX26004', fullName: 'ElevateX Sample 04', department: 'Civil Engineering', year: 'III Year' },
  { roll: 'EX26005', fullName: 'ElevateX Sample 05', department: 'Computer Science Engineering (Cyber Security)', year: 'III Year' },
  { roll: 'EX26006', fullName: 'ElevateX Sample 06', department: 'Artificial Intelligence and Data Science', year: 'III Year' },
  { roll: 'EX26007', fullName: 'ElevateX Sample 07', department: 'Artificial Intelligence & Machine Learning', year: 'III Year' },
  { roll: 'EX26008', fullName: 'ElevateX Sample 08', department: 'Electrical & Electronics Engineering', year: 'III Year' },
  { roll: 'EX26009', fullName: 'ElevateX Sample 09', department: 'Computer Science Engineering (Internet of Things)', year: 'III Year' },
  { roll: 'EX26010', fullName: 'ElevateX Sample 10', department: 'Business Administration', year: 'III Year' },
  { roll: 'EX26011', fullName: 'ElevateX Sample 11', department: 'Computer Science Engineering', year: 'III Year' },
  { roll: 'EX26012', fullName: 'ElevateX Sample 12', department: 'Electronics & Communication Engineering', year: 'III Year' },
  { roll: 'EX26013', fullName: 'ElevateX Sample 13', department: 'Mechanical Engineering', year: 'III Year' },
  { roll: 'EX26014', fullName: 'ElevateX Sample 14', department: 'Civil Engineering', year: 'III Year' },
  { roll: 'EX26015', fullName: 'ElevateX Sample 15', department: 'Artificial Intelligence and Data Science', year: 'III Year' },
];
