const SUPABASE_URL = 'https://xidiihjezddpbgiexbph.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-';

// Same translation dict as in composer.js
const SpanishToEnglishInstruments = {
    'violin': 'Violin', 'viola': 'Viola', 'violonchelo': 'Cello',
    'violoncelo': 'Cello', 'cello': 'Cello', 'contrabajo': 'Double Bass',
    'arpa': 'Harp', 'guitarra': 'Classical Guitar', 'guitarra clasica': 'Classical Guitar',
    'guitarra electrica': 'Electric Guitar', 'bajo electrico': 'Electric Bass',
    'flauta': 'Flute', 'flautin': 'Piccolo', 'oboe': 'Oboe',
    'corno ingles': 'English Horn', 'clarinete': 'Clarinet',
    'clarinete bajo': 'Bass Clarinet', 'fagot': 'Bassoon',
    'contrafagot': 'Contrabassoon', 'saxofon': 'Saxophone', 'saxo': 'Saxophone',
    'trompa': 'Horn', 'trompeta': 'Trumpet', 'trombon': 'Trombone',
    'tuba': 'Tuba/Euphonium', 'timbal': 'Timpani', 'timbales': 'Timpani',
    'marimba': 'Marimba', 'vibrafono': 'Vibraphone', 'xilofono': 'Xylophone',
    'piano': 'Piano', 'piano preparado': 'Prepared Piano', 'organo': 'Organ',
    'acordeon': 'Accordion', 'voz': 'Solo', 'soprano': 'Soprano',
    'mezzo': 'Mezzo', 'contralto': 'Contralto', 'tenor': 'Tenor',
    'baritono': 'Baritone', 'bajo': 'Bass', 'coro': 'Choir',
    'electronica': 'Live Electronics'
};

function normalize(str) {
    if (!str) return '';
    return str.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function findInstrumentMatch(inputStr, allInstruments) {
    const cleanStr = inputStr.trim().toLowerCase();
    if (!cleanStr) return null;
    const normalizedClean = normalize(cleanStr);
    const translatedName = SpanishToEnglishInstruments[normalizedClean] || cleanStr;
    const target = translatedName.toLowerCase();

    let match = allInstruments.find(item => item.variant && item.variant.toLowerCase() === target);
    if (match) return { ...match, matchType: 'exact variant' };
    match = allInstruments.find(item => item.name && item.name.toLowerCase() === target);
    if (match) return { ...match, matchType: 'exact name' };
    match = allInstruments.find(item => item.variant && item.variant.toLowerCase().includes(target));
    if (match) return { ...match, matchType: 'partial variant' };
    match = allInstruments.find(item => item.name && item.name.toLowerCase().includes(target));
    if (match) return { ...match, matchType: 'partial name' };
    return null;
}

async function test() {
    const res = await fetch(SUPABASE_URL + '/rest/v1/instruments?select=*', {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    const allInstruments = await res.json();
    console.log('Total instrumentos en BD:', allInstruments.length);
    console.log('');

    // These are the instruments from the CSV column "instrumentos"
    const csvInstrumentField = 'clarinete, violonchelo';
    const parts = csvInstrumentField.split(',').map(p => p.trim()).filter(Boolean);

    console.log('=== Simulando match de instrumentos del CSV ===');
    console.log('Campo CSV "instrumentos":', csvInstrumentField);
    console.log('');

    let allMatched = true;
    parts.forEach(part => {
        const match = findInstrumentMatch(part, allInstruments);
        if (match) {
            console.log('  ✅ "' + part + '" → ID ' + match.id + ' | ' + match.name + ' (' + match.variant + ') [' + match.matchType + ']');
        } else {
            console.log('  ❌ "' + part + '" → NO se encontró ningún instrumento');
            allMatched = false;
        }
    });

    console.log('');
    if (allMatched) {
        console.log('✅ RESULTADO: Todos los instrumentos del CSV serán reconocidos y guardados correctamente.');
    } else {
        console.log('❌ RESULTADO: Algunos instrumentos no se reconocieron. Hay que ajustar los nombres en el CSV.');
    }
}

test().catch(console.error);
