/** Parse CSV with RFC-style quoted fields into rows (including header row). */

export type CsvRow = Record<string, string>;

function parseCsvRecords(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const c = normalized[i]!;

    if (inQuotes) {
      if (c === '"' && normalized[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function normHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

const HEADER_ALIASES: Record<string, string> = {
  question: 'question_text',
  question_text: 'question_text',
  stem: 'question_text',
  mcq: 'question_text',
  prompt: 'question_text',
  text: 'question_text',

  option_a: 'option_a',
  optiona: 'option_a',
  a: 'option_a',
  opt_a: 'option_a',

  option_b: 'option_b',
  optionb: 'option_b',
  b: 'option_b',
  opt_b: 'option_b',

  option_c: 'option_c',
  optionc: 'option_c',
  c: 'option_c',
  opt_c: 'option_c',

  option_d: 'option_d',
  optiond: 'option_d',
  d: 'option_d',
  opt_d: 'option_d',

  options: 'options',
  answer: 'correct_answer',
  correct: 'correct_answer',
  correct_answer: 'correct_answer',
  key: 'correct_answer',
  ans: 'correct_answer',

  explanation: 'explanation',
  explain: 'explanation',
};

export function csvRowsToObjects(rows: string[][]): CsvRow[] {
  if (rows.length < 2) return [];
  const rawHeaders = rows[0]!.map(normHeader);
  const keys = rawHeaders.map((h) => HEADER_ALIASES[h] ?? h);
  const out: CsvRow[] = [];

  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r]!;
    const obj: CsvRow = {};
    for (let c = 0; c < keys.length; c += 1) {
      const key = keys[c];
      if (!key) continue;
      obj[key] = (cells[c] ?? '').trim();
    }
    out.push(obj);
  }

  return out;
}

export function parseCsvToObjects(text: string): CsvRow[] {
  return csvRowsToObjects(parseCsvRecords(text));
}
