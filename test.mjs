import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabase.from('notificacoes')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10)
  .then(res => console.log(JSON.stringify(res.data, null, 2)))
  .catch(err => console.error(err));
