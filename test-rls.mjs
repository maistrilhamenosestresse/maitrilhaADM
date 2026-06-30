import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabase.from('reservas').update({ status_pagamento: 'pago' }).eq('id', '6b1c676d-8a2f-410a-810a-2895a63cde68').then(res => {
  console.log('ANON UPDATE RES:', res.error ? res.error.message : 'Sucesso', res.data);
}).catch(err => console.error(err));
