const SUPABASE_URL = 'https://xidiihjezddpbgiexbph.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-';

async function check() {
    const res = await fetch(SUPABASE_URL + '/rest/v1/composers?select=*', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    const data = await res.json();
    console.log('Composers in DB:', data);
}

check().catch(console.error);
