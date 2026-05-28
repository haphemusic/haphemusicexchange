// =============================================================
// IMPORTACIÓN MASIVA: César Camarero
// Uso: node scripts/importar_camarero.js
// =============================================================

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://olmjsegaabvgsnhplumx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yYmGRKmtifKvHNgZ86cmgQ_Eo--U___';

// UUID del usuario que figura como "submitted_by" en las obras de catálogo
// (el administrador que gestiona el catálogo)
const ADMIN_UUID = 'ca6be5bd-8281-46a3-9fbe-d9e60510edc1';

// ── Mapeo de categorías CSV → valores BD ──────────────────────
const CATEGORY_MAP = {
    'solo':      'solo',
    'dúo':       'duo',
    'duo':       'duo',
    'trío':      'trio',
    'trio':      'trio',
    'cuarteto':  'chamber',
    'ensemble':  'ensemble',
    'coral':     'ensemble',
    'orquesta':  'orchestra',
    'vocal':     'other',
    'escénica':  'other',
    'escenica':  'other',
};

// ── Mapeo de abreviaturas de instrumentos (CSV → nombre en inglés) ──
const INSTR_MAP = {
    'vla':       'Viola',
    'fl':        'Flute',
    'flauta':    'Flute',
    'fl en sol': 'Flute',
    'fl/baja':   'Flute',
    'flbaja':    'Flute',
    'flautin':   'Piccolo',
    'cl':        'Clarinet',
    'clarinete': 'Clarinet',
    'cl b':      'Bass Clarinet',
    'cl bajo':   'Bass Clarinet',
    'ob':        'Oboe',
    'oboe':      'Oboe',
    'fg':        'Bassoon',
    'fagot':     'Bassoon',
    'vln':       'Violin',
    'violin':    'Violin',
    'violín':    'Violin',
    'vcl':       'Cello',
    'vcl solo':  'Cello',
    'violonchelo': 'Cello',
    'viola':     'Viola',
    'vla sola':  'Viola',
    'contrabajo': 'Double Bass',
    'pno':       'Piano',
    'piano':     'Piano',
    'pno solo':  'Piano',
    'arp':       'Harp',
    'arpa':      'Harp',
    'guit':      'Classical Guitar',
    'guitarra':  'Classical Guitar',
    'aco':       'Accordion',
    'acordeon':  'Accordion',
    'sax':       'Saxophone',
    'sax alto':  'Saxophone',
    'sax ten':   'Saxophone',
    'sax sop':   'Saxophone',
    'sax bar':   'Saxophone',
    'tpa':       'Horn',
    'trompa':    'Horn',
    'tpt':       'Trumpet',
    'trompeta':  'Trumpet',
    'tbn':       'Trombone',
    'trombon':   'Trombone',
    'tuba':      'Tuba/Euphonium',
    'bombardino':'Tuba/Euphonium',
    'fiscorno':  'Trumpet',
    'txistu':    'Flute',
    'perc':      'Percussion',
    'perc sola': 'Percussion',
    'marimba':   'Marimba',
    'marimba sola': 'Marimba',
    'vibr':      'Vibraphone',
    'vibrafono': 'Vibraphone',
    'vibr sola': 'Vibraphone',
    'sop':       'Soprano',
    'soprano':   'Soprano',
    'msop':      'Mezzo',
    'mezzosoprano': 'Mezzo',
    'cto':       'Contralto',
    'contralto': 'Contralto',
    'tenor':     'Tenor',
    'baritono':  'Baritone',
    'bajo':      'Bass',
    'voz':       'Soprano',
    'voz femenina': 'Soprano',
    'coro':      'Choir',
    'cuarteto de cuerda': 'String Quartet',
    'cuarteto de sax': 'Saxophone',
    'cuarteto sax': 'Saxophone',
};

// ── Helpers ──────────────────────────────────────────────────

function norm(str) {
    if (!str) return '';
    return str.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function parseDuration(raw) {
    if (!raw || raw === 'N/D' || raw.trim() === '') return null;
    // Tomar primer valor si hay rango "6'-9'"
    const first = raw.split('-')[0];
    // Formato "7'40''" o "7'"
    const m = first.match(/(\d+)'(?:(\d+)'')?/);
    if (!m) return null;
    const mins = parseInt(m[1]);
    const secs = m[2] ? parseInt(m[2]) : 0;
    return Math.round((mins + secs / 60) * 100) / 100;
}

function parseYear(raw) {
    if (!raw || raw === 'N/D') return null;
    // "1989*" → 1989, "1990-92" → 1990
    const m = raw.match(/(\d{4})/);
    return m ? parseInt(m[1]) : null;
}

function parseDate(raw) {
    if (!raw || raw === 'N/D' || raw.toLowerCase().includes('n/d')) return null;
    // "20-05-2022" → "2022-05-20"
    const m = raw.trim().match(/^(\d{1,2})-(\d{2})-(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    // "12-2012" → null (solo mes y año, no es fecha válida de tipo date)
    return null;
}

function clean(val) {
    if (!val || val.trim() === 'N/D' || val.trim() === '-' || val.trim() === '') return null;
    return val.trim();
}

// ── Parser de CSV simple (maneja comillas y comas internas) ──

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const headers = splitCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = splitCSVLine(lines[i]);
        if (cols.length < 2) continue;
        const row = {};
        headers.forEach((h, idx) => {
            row[h.trim()] = (cols[idx] || '').trim();
        });
        rows.push(row);
    }
    return rows;
}

function splitCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    result.push(cur);
    return result;
}

// ── Fetch helpers ────────────────────────────────────────────

async function supaGet(table, query = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`GET ${table}: ${JSON.stringify(data)}`);
    return data;
}

async function supaInsert(table, payload) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
            apikey:          SUPABASE_KEY,
            Authorization:   `Bearer ${SUPABASE_KEY}`,
            'Content-Type':  'application/json',
            Prefer:          'return=representation',
        },
        body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`INSERT ${table}: ${JSON.stringify(data)}`);
    return data;
}

// ── Función de match de instrumento ─────────────────────────

function findInstrumentId(raw, allInstruments) {
    const cleanRaw = norm(raw);
    if (!cleanRaw) return null;

    // Quitar números delante ("2 vln" → "vln", "3 perc" → "perc")
    const withoutNum = cleanRaw.replace(/^\d+\s+/, '').trim();

    // Buscar en mapa de abreviaturas
    const candidates = [withoutNum, cleanRaw];
    let englishName = null;
    for (const c of candidates) {
        if (INSTR_MAP[c]) { englishName = INSTR_MAP[c]; break; }
        // Coincidencia parcial en el mapa
        const key = Object.keys(INSTR_MAP).find(k => c.includes(k) || k.includes(c));
        if (key) { englishName = INSTR_MAP[key]; break; }
    }
    if (!englishName) englishName = withoutNum;

    const target = englishName.toLowerCase();

    let match = allInstruments.find(i => i.variant && i.variant.toLowerCase() === target);
    if (match) return match.id;
    match = allInstruments.find(i => i.name && i.name.toLowerCase() === target);
    if (match) return match.id;
    match = allInstruments.find(i => i.variant && i.variant.toLowerCase().includes(target));
    if (match) return match.id;
    match = allInstruments.find(i => i.name && i.name.toLowerCase().includes(target));
    if (match) return match.id;
    // Búsqueda inversa: el target contiene el nombre de BD
    match = allInstruments.find(i => i.name && target.includes(i.name.toLowerCase()));
    if (match) return match.id;
    return null;
}

function parseInstruments(rawField, allInstruments) {
    if (!rawField || rawField === 'N/D' || rawField === '-') return [];
    // Dividir por coma, luego limpiar paréntesis y palabras extra
    const parts = rawField.split(',').map(p => p.trim()).filter(Boolean);
    const ids = new Set();
    const unmatched = [];
    for (const part of parts) {
        // Ignorar frases descriptivas largas
        if (part.split(' ').length > 5) continue;
        // Ignorar: actor, 1 pianista, grupos, etc.
        if (/actor|pianista|grupo|grupos|músicos|voces|intérprete|solista\s|banda\s|orquesta\s|cuerda\s|dispositivo/i.test(part)) continue;
        const id = findInstrumentId(part, allInstruments);
        if (id) {
            ids.add(id);
        } else {
            unmatched.push(part);
        }
    }
    return { ids: [...ids], unmatched };
}

// ── MAIN ─────────────────────────────────────────────────────

async function main() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Importación masiva: César Camarero          ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    // 1. Cargar CSV
    const csvPath = path.join(__dirname, '..', 'datos', 'Camarero catálogo - Hoja 1.csv');
    const csvText = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvText);
    console.log(`✅ CSV cargado: ${rows.length} obras encontradas.\n`);

    // 2. Cargar instrumentos de la BD
    console.log('⏳ Cargando instrumentos de la base de datos...');
    const allInstruments = await supaGet('instruments', 'select=*');
    console.log(`✅ ${allInstruments.length} instrumentos cargados.\n`);

    // 3. Comprobar si César Camarero ya existe
    console.log('⏳ Comprobando si César Camarero ya está en la BD...');
    const existing = await supaGet('composers', 'select=id,name&name=eq.César Camarero');
    let composerId;

    if (existing.length > 0) {
        composerId = existing[0].id;
        console.log(`✅ César Camarero ya existe (ID: ${composerId}). Saltando inserción.\n`);
    } else {
        console.log('⏳ Insertando César Camarero en la tabla composers...');
        const inserted = await supaInsert('composers', {
            name:        'César Camarero',
            period:      'Música Contemporánea',
            nationality: 'Español',
        });
        composerId = inserted[0].id;
        console.log(`✅ César Camarero insertado con ID: ${composerId}\n`);
    }

    // 4. Insertar obras
    let okCount = 0;
    let failCount = 0;
    const allUnmatched = new Set();

    console.log(`⏳ Procesando ${rows.length} obras...\n`);

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        const title    = clean(r['Título Original']) || '(Sin título)';
        const subtitle = clean(r['Versión/Subtítulo']);
        const year     = parseYear(r['Año']);
        const duration = parseDuration(r['Duración']);

        // Scoring category
        const rawCat  = norm(r['Categoría de Scoring'] || '');
        const scoring = CATEGORY_MAP[rawCat] || 'other';

        // Fechas de estreno
        const premDate      = parseDate(r['Fecha de Estreno']);
        const premVenue     = clean(r['Lugar de Estreno']);
        const premCity      = clean(r['Ciudad de Estreno']);
        const premPerformers = clean(r['Intérpretes del Estreno']);

        // Otros campos
        const commissioned  = clean(r['Encargos / Ayudas']);
        const additionalInfo = clean(r['Notas Adicionales']);
        const instrRaw      = r['Instrumentación Detallada'] || '';

        const payload = {
            title,
            subtitle,
            year,
            duration_minutes:     duration,
            scoring_category:     scoring,
            performer_combination: instrRaw === '-' || instrRaw === 'N/D' ? null : instrRaw.trim() || null,
            premiere_date:        premDate,
            premiere_venue:       premVenue,
            premiere_city:        premCity,
            premiere_performers:  premPerformers,
            commissioned_by:      commissioned,
            additional_info:      additionalInfo,
            has_electronics:      false,
            score_status:         'finished',
            status:               'validated',
            composer_id:          composerId,
            submitted_by:         ADMIN_UUID,
        };

        try {
            const inserted = await supaInsert('works', payload);
            const workId = inserted[0].id;

            // Instrumentos
            const { ids: instIds, unmatched } = parseInstruments(instrRaw, allInstruments);
            unmatched.forEach(u => allUnmatched.add(u));

            if (instIds.length > 0) {
                const relations = instIds.map(instId => ({
                    work_id:       workId,
                    instrument_id: instId,
                    quantity:      1,
                }));
                await supaInsert('work_instruments', relations);
            }

            console.log(`  [${i+1}/${rows.length}] ✅ "${title}" (${year || '?'}) — ${scoring} — ${instIds.length} inst.`);
            okCount++;
        } catch (err) {
            console.error(`  [${i+1}/${rows.length}] ❌ "${title}" — ERROR: ${err.message}`);
            failCount++;
        }
    }

    // 5. Resumen final
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║  RESUMEN DE IMPORTACIÓN                      ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`  Compositor:  César Camarero (ID: ${composerId})`);
    console.log(`  ✅ Obras insertadas correctamente: ${okCount}`);
    console.log(`  ❌ Obras con error:                ${failCount}`);

    if (allUnmatched.size > 0) {
        console.log(`\n⚠️  Instrumentos no reconocidos (${allUnmatched.size}):`);
        [...allUnmatched].sort().forEach(u => console.log(`    - "${u}"`));
        console.log('\n  → Puedes añadir estos instrumentos al INSTR_MAP del script para futuros imports.');
    } else {
        console.log('\n  ✅ Todos los instrumentos fueron reconocidos correctamente.');
    }
    console.log('');
}

main().catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
});
