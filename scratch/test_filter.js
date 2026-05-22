const url = 'https://xidiihjezddpbgiexbph.supabase.co/rest/v1/works?select=*,composer:composer_id(*),submitter:submitted_by(*),work_instruments(*,instrument_id(*))';
const apiKey = 'sb_publishable_U73JrtadWLF2DsT3ZDjv6w_SnKggOJ-';

async function test() {
    console.log("Fetching works from Supabase...");
    const response = await fetch(url, {
        headers: {
            'apikey': apiKey,
            'Authorization': `Bearer ${apiKey}`
        }
    });
    const works = await response.json();
    console.log(`Fetched ${works.length} works.\n`);

    // Let's print out "prueba 1 22" and "prueba 2 22" info
    const testWorks = works.filter(w => w.title.includes("prueba"));
    console.log("=== Works with 'prueba' in title ===");
    testWorks.forEach(w => {
        console.log(JSON.stringify(w, null, 2));
        console.log("------------------------");
    });

    // Simulating index.html filter logic
    function runFilter({ activeTags = [], searchTerm = '' }) {
        const yf = 0;
        const yt = 9999;
        const co = '';
        const ge = '';

        const filtered = works.filter(w => {
            // Year filter
            const year = w.year ? parseInt(w.year) : null;
            if (year !== null && (year < yf || year > yt)) return false;

            // Instrument tag filter (match any of the selected instruments)
            if (activeTags.length > 0) {
                const hasInstrument = w.work_instruments?.some(wi => {
                    const instName = wi.instrument_id?.name?.toLowerCase();
                    const instVariant = wi.instrument_id?.variant?.toLowerCase();
                    const instFamily = wi.instrument_id?.family?.toLowerCase();
                    return activeTags.some(tag => 
                        (instName && instName.includes(tag)) || 
                        (instVariant && instVariant.includes(tag)) ||
                        (instFamily && instFamily.includes(tag)) ||
                        tag.includes(instName || '')
                    );
                });
                if (!hasInstrument) return false;
            }

            if (searchTerm) {
                const title = w.title?.toLowerCase() || '';
                const subtitle = w.subtitle?.toLowerCase() || '';
                const composerName = w.composer?.name?.toLowerCase() || '';
                const submitterName = `${w.submitter?.first_name || ''} ${w.submitter?.last_name || ''}`.trim().toLowerCase();
                const performerCombination = w.performer_combination?.toLowerCase() || '';
                const instrumentText = (w.work_instruments || [])
                    .map(wi => [wi.instrument_id?.name, wi.instrument_id?.variant, wi.instrument_id?.family]
                        .filter(Boolean)
                        .join(' ')
                    ).join(' ').toLowerCase();

                const searchable = `${title} ${subtitle} ${composerName} ${submitterName} ${performerCombination} ${instrumentText}`;
                if (!searchable.includes(searchTerm)) return false;
            }

            return true;
        });

        console.log(`\nFilter results for tags: [${activeTags.join(', ')}], search: "${searchTerm}"`);
        filtered.forEach(w => console.log(` - ID ${w.id}: ${w.title} (${w.work_instruments.map(wi => wi.instrument_id?.name).join(', ') || 'No instruments'})`));
    }

    // Run simulations
    runFilter({ searchTerm: 'prueba' });
    runFilter({ activeTags: ['flute'] });
    runFilter({ activeTags: ['horn'] });
    runFilter({ activeTags: ['flute'], searchTerm: 'prueba' });
}

test().catch(err => console.error(err));
