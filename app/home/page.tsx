import { redirect } from 'next/navigation';

export default function StudentHomeRedirectPage() {
  redirect('/exams');
}
