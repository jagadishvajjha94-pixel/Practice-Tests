import { POST as parseDocumentPost } from '../parse-document/route';

/** Legacy path — use /api/faculty/exams/parse-document for PDF, DOCX, CSV, TXT. */
export const POST = parseDocumentPost;
