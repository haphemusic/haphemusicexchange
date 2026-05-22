const SUPABASE_URL = 'https://xidiihjezddpbgiexbph.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-';

async function check() {
    // Check work_instruments for work ID 19 (prueba 1 22)
    const res = await fetch(SUPABASE_URL + '/rest/v1/work_instruments?work_id=eq.19&select=*', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    const data = await res.json();
    console.log('Instrumentos de prueba 1 22 (ID 19):', JSON.stringify(data, null, 2));

    // Also check work_instruments for work ID 20 (prueba 2 22)
    const res2 = await fetch(SUPABASE_URL + '/rest/v1/work_instruments?work_id=eq.20&select=*', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    const data2 = await res2.json();
    console.log('Instrumentos de prueba 2 22 (ID 20):', JSON.stringify(data2, null, 2));

    // Check instruments table for Horn (id=26) and Flute (id=1)
    const res3 = await fetch(SUPABASE_URL + '/rest/v1/instruments?id=in.(1,26)&select=*', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    const data3 = await res3.json();
    console.log('Datos de Horn y Flute:', JSON.stringify(data3, null, 2));
}

check().catch(console.error);
