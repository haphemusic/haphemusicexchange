import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xidiihjezddpbgiexbph.supabase.co',
  'sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-'
);

async function check() {
  const { data: works, error: wErr } = await supabase.from('works').select('*');
  console.log('--- WORKS ---');
  console.log(works);

  const { data: perfs, error: pErr } = await supabase.from('performances').select('*');
  console.log('--- PERFORMANCES ---');
  console.log(perfs);
  
  const { data: profiles, error: prErr } = await supabase.from('profiles').select('*');
  console.log('--- PROFILES ---');
  console.log(profiles);
}

check();
