import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function resolvePostgresUrl() {
  const direct = process.env.POSTGRES_URL?.trim();
  if (direct && !direct.includes('YOUR_')) return direct;

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!password || !supabaseUrl || supabaseUrl.includes('YOUR_')) return null;

  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1];
  if (!ref) return null;

  const host = process.env.SUPABASE_DB_HOST?.trim() || `db.${ref}.supabase.co`;
  const port = process.env.SUPABASE_DB_PORT?.trim() || '5432';
  const user = process.env.SUPABASE_DB_USER?.trim() || 'postgres';
  const database = process.env.SUPABASE_DB_NAME?.trim() || 'postgres';

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

loadEnvLocal();

const url = resolvePostgresUrl();
if (!url) {
  console.error('❌ Set POSTGRES_URL or SUPABASE_DB_PASSWORD in apps/prepindia-web/.env.local');
  console.error('   Supabase → Project Settings → Database → Connection string / password');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = [
  '017_department_groups.sql',
  '020_ensure_questions_table.sql',
  '021_questions_test_id_nullable.sql',
  '022_exam_builder_draws_bigint_question_ids.sql',
  '023_faculty_department_group_id.sql',
  '027_ensure_rmset_papers.sql',
  '028_ensure_exam_schedules.sql',
];

const client = postgres(url, { max: 1, onnotice: () => {} });

try {
  for (const file of files) {
    const sqlPath = path.join(migrationsDir, file);
    console.log(`▶ Applying ${file}…`);
    await client.unsafe(fs.readFileSync(sqlPath, 'utf8'));
    console.log(`✅ ${file}`);
  }
  try {
    await client`NOTIFY pgrst, 'reload schema'`;
  } catch {
    /* optional */
  }
  const rows = await client`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'questions'
    ORDER BY ordinal_position
  `;
  console.log('✅ public.questions columns:', rows.map((r) => r.column_name).join(', '));
} catch (e) {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
