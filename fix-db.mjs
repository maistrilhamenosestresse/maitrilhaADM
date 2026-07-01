import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].trim();
  return acc;
}, {});

const supabase = createClient(envConfig['NEXT_PUBLIC_SUPABASE_URL'], envConfig['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function run() {
  const { data: existing, error: selError } = await supabase.from('settings').select('*');
  console.log('Existing:', existing);
  
  if (existing && existing.length === 0) {
    console.log('Inserting row 1...');
    const { data, error } = await supabase.from('settings').insert([{ id: 1, maintenance_mode: false }]);
    console.log('Insert Data:', data, 'Error:', error);
  } else {
    console.log('Row already exists or error:', selError);
  }
}
run();
