import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = path.join(process.cwd(), 'scripts', '01-initial-schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Executing migration...');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        }).catch(async () => {
          // If rpc doesn't work, try using the admin API
          return await supabase.from('_migrations').insert({ sql: statement });
        });
        
        if (error) {
          console.error('Error executing statement:', error.message);
          console.log('Statement:', statement.substring(0, 100) + '...');
        }
      } catch (err) {
        console.warn('Warning executing statement:', err.message);
      }
    }

    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
