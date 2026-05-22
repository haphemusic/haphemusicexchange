const SUPABASE_URL = 'https://xidiihjezddpbgiexbph.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-';

async function run() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}

run();
