import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://olmjsegaabvgsnhplumx.supabase.co',
  'sb_publishable_yYmGRKmtiFKvHNgZ86cmgQ_Eo--UGjR'
);

async function check() {
  try {
    const { data: works, error: wErr } = await supabase.from('works').select('*').limit(1);
    console.log('--- WORKS CONNECTION ---');
    if (wErr) console.error('Error fetching works:', wErr.message);
    else console.log('Works table check: SUCCESS, count in query:', works.length);

    const { data: profiles, error: prErr } = await supabase.from('profiles').select('*').limit(1);
    console.log('--- PROFILES CONNECTION ---');
    if (prErr) console.error('Error fetching profiles:', prErr.message);
    else console.log('Profiles table check: SUCCESS, count in query:', profiles.length);
  } catch (e) {
    console.error('Fatal error during check:', e);
  }
}

check();
