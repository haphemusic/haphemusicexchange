const SUPABASE_URL = 'https://xidiihjezddpbgiexbph.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-';

async function check() {
    console.log('=== Checking composers table ===');
    const resComp = await fetch(SUPABASE_URL + '/rest/v1/composers?limit=1&select=*', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    const composers = await resComp.json();
    console.log('Composer columns & data:', composers);

    console.log('\n=== Checking works table ===');
    const resWorks = await fetch(SUPABASE_URL + '/rest/v1/works?limit=1&select=*', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    const works = await resWorks.json();
    console.log('Works columns & data:', works);
}

check().catch(console.error);
