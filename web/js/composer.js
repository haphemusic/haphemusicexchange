import supabase from './supabase.js';

let currentUser = null;

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = session.user;
    
    await loadUserProfile();
    await loadStats();
    await loadValidations();
    await loadMyWorks();

    // Show default section
    const hash = window.location.hash.substring(1) || 'overview';
    showSection(hash);
}

async function loadUserProfile() {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (profile) {
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Composer';
        document.getElementById('user-name').textContent = name;
        
        if (profile.avatar_url) {
            document.getElementById('user-avatar').src = profile.avatar_url;
        } else {
            document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E57373&color=fff`;
        }
    }
}

async function loadStats() {
    const { count: worksCount } = await supabase
        .from('works')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', currentUser.id)
        .eq('status', 'validated');

    const { count: pendingCount } = await supabase
        .from('works')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', currentUser.id)
        .eq('status', 'pending');

    document.getElementById('stat-works').textContent = worksCount || 0;
    document.getElementById('stat-pending').textContent = pendingCount || 0;
    
    const countBadge = document.getElementById('validation-count');
    if (pendingCount > 0) {
        countBadge.textContent = pendingCount;
        countBadge.classList.remove('hidden');
    } else {
        countBadge.classList.add('hidden');
    }
}

async function loadValidations() {
    const container = document.getElementById('validations-list');
    const { data: validations, error } = await supabase
        .from('works')
        .select(`
            *,
            profiles:submitted_by (first_name, last_name, role)
        `)
        .eq('submitted_by', currentUser.id)
        .eq('status', 'pending');

    if (error || !validations || validations.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 py-10 text-center">No pending validation requests.</p>';
        return;
    }

    container.innerHTML = validations.map(v => `
        <div class="glass-panel p-6 rounded-3xl flex items-center gap-6 group hover:border-salmon/30 transition-all">
            <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                <span class="material-symbols-outlined text-slate-500">groups</span>
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-white">${v.title}</h4>
                <p class="text-xs text-slate-400">Performed by: ${v.profiles.first_name} ${v.profiles.last_name} (${v.profiles.role})</p>
            </div>
            <div class="flex gap-2">
                <button onclick="handleValidation(${v.id}, 'rejected')" class="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-all">
                    <span class="material-symbols-outlined text-[20px]">close</span>
                </button>
                <button onclick="handleValidation(${v.id}, 'validated')" class="w-10 h-10 rounded-full bg-salmon/20 text-salmon flex items-center justify-center hover:bg-salmon hover:text-white transition-all">
                    <span class="material-symbols-outlined text-[20px]">check</span>
                </button>
            </div>
        </div>
    `).join('');
}

async function handleValidation(workId, newStatus) {
    const { error } = await supabase
        .from('works')
        .update({ status: newStatus })
        .eq('id', workId);

    if (error) {
        alert("Error updating status: " + error.message);
    } else {
        await loadStats();
        await loadValidations();
        await loadMyWorks();
    }
}

async function loadMyWorks() {
    const container = document.getElementById('my-works-list');
    const { data: works } = await supabase
        .from('works')
        .select(`
            *,
            work_instruments (
                instrument_id (name, family, variant)
            )
        `)
        .eq('submitted_by', currentUser.id)
        .order('created_at', { ascending: false });

    if (!works || works.length === 0) {
        container.innerHTML = '<p class="text-[10px] text-slate-500 uppercase font-bold text-center py-4">No works registered</p>';
        return;
    }

    container.innerHTML = works.map(w => `
        <div class="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group
                    hover:border-white/10 transition-all">
            <div style="flex:1;min-width:0;cursor:pointer" onclick="window.showWorkDetail('${encodeURIComponent(JSON.stringify(w))}')">
                <p class="text-xs font-bold text-white group-hover:text-salmon transition-colors truncate">${w.title}</p>
                <p class="text-[9px] text-slate-500 uppercase tracking-widest">${w.year || '—'} &bull; ${w.status}</p>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:8px">
                ${w.status === 'validated'
                    ? '<span class="material-symbols-outlined text-emerald-400" style="font-size:16px">verified</span>'
                    : '<span class="material-symbols-outlined text-amber-400" style="font-size:16px">pending</span>'
                }
                <button onclick="window.confirmDelete(${w.id}, '${w.title.replace(/'/g, "\\'")}')"
                    style="background:rgba(229,115,115,0.12);border:1px solid rgba(229,115,115,0.2);color:#E57373;
                           width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;
                           justify-content:center;transition:all 0.2s"
                    onmouseover="this.style.background='rgba(229,115,115,0.3)'"
                    onmouseout="this.style.background='rgba(229,115,115,0.12)'">
                    <span class="material-symbols-outlined" style="font-size:15px">delete</span>
                </button>
            </div>
        </div>
    `).join('');
}

// ── Work detail panel (inside composer dashboard) ─────────────────
window.showWorkDetail = (wEncoded) => {
    const w = JSON.parse(decodeURIComponent(wEncoded));
    const detail = document.getElementById('work-detail-modal');

    const composerName = document.getElementById('user-name').textContent || 'Unknown Composer';
    const instList = (w.work_instruments || []).map(wi => wi.instrument_id?.name).filter(Boolean);
    const instruments = instList.join(', ') || w.performer_combination || '—';

    const row = (label, value) => value
        ? `<div class="modal-row"><span class="modal-label">${label}</span><span class="modal-value">${value}</span></div>`
        : '';

    const scoringBadge = (cat) => {
        if (!cat) return '';
        const cls = `badge-${cat}`;
        const icons = { solo:'person', duo:'group', trio:'groups', chamber:'piano', ensemble:'queue_music', orchestra:'library_music', other:'music_note' };
        const icon = icons[cat] || 'music_note';
        return `<span class="work-badge ${cls}"><span class="material-symbols-outlined" style="font-size:11px">${icon}</span>${cat}</span>`;
    };

    const diffBadge = (d) => {
        if (!d) return '';
        return `<span class="work-badge badge-diff-${d}">${d}</span>`;
    };

    const stylePills = (w.style_tags || []).map(t =>
        `<span class="work-badge" style="background:rgba(229,115,115,0.12);color:#E57373;border:1px solid rgba(229,115,115,0.2)">${t}</span>`
    ).join('');

    document.getElementById('work-detail-content').innerHTML = `
        <!-- Close -->
        <button onclick="window.closeWorkDetail()" style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.06);border:none;color:#d4e4fa;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined">close</span>
        </button>

        <!-- Header -->
        <div style="margin-bottom:4px;display:flex;flex-wrap:wrap;gap:6px">
            ${scoringBadge(w.scoring_category)} ${diffBadge(w.technical_difficulty)}
            ${w.has_electronics ? '<span class="work-badge badge-electronics"><span class="material-symbols-outlined" style="font-size:11px">bolt</span>Electronics</span>' : ''}
        </div>
        <h2 style="color:#fff;font-size:24px;font-weight:700;margin:12px 0 4px;line-height:1.2">${w.title}</h2>
        ${w.subtitle ? `<p style="color:#8b96ac;font-size:14px;margin-bottom:4px">${w.subtitle}</p>` : ''}
        <p style="color:#E57373;font-size:13px;font-weight:600">${composerName} · ${w.year || '—'}</p>

        ${stylePills ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:14px">${stylePills}</div>` : ''}

        <!-- General -->
        <p class="modal-section-title">General Information</p>
        ${row('Duration', w.duration_minutes ? `${w.duration_minutes} min` : null)}
        ${row('Catalogue number', w.catalogue_number)}
        ${row('Score status', w.score_status)}
        ${row('Availability', w.score_availability?.replace('_',' '))}
        ${row('Publisher', w.publisher)}
        ${row('Commissioned by', w.commissioned_by)}

        <!-- Instrumentation -->
        <p class="modal-section-title">Scoring & Instrumentation</p>
        ${row('Instruments', instruments)}
        ${row('Combination', w.performer_combination)}
        ${row('Number of performers', w.num_performers)}
        ${row('Soloist', w.soloist_instrument)}
        ${row('Unusual preparations', w.unusual_preparations)}
        ${row('Space requirements', w.space_requirements)}

        <!-- Electronics -->
        ${w.has_electronics ? `
        <p class="modal-section-title">Electronics</p>
        ${row('Type', w.electronics_type)}
        ${row('Software / Tech', w.electronics_software)}
        ` : ''}

        <!-- Premiere -->
        ${w.premiere_date || w.premiere_venue ? `
        <p class="modal-section-title">Premiere</p>
        ${row('Date', w.premiere_date)}
        ${row('Venue', w.premiere_venue)}
        ${row('City', w.premiere_city)}
        ${row('Performers', w.premiere_performers)}
        ` : ''}

        <!-- Multimedia -->
        ${w.media_url || w.score_sample_url ? `
        <p class="modal-section-title">Multimedia</p>
        ${w.score_sample_url ? `${row('Score sample', `<a href="${w.score_sample_url}" target="_blank" style="color:#63b3ed;text-decoration:underline;font-weight:600">View score ↗</a>`)}`  : ''}
        ${w.media_url       ? `${row('Recording', `<a href="${w.media_url}" target="_blank" style="color:#63b3ed;text-decoration:underline;font-weight:600">Listen / Watch ↗</a>`)}` : ''}
        ${row('Recording type', w.recording_type)}
        ` : ''}

        <!-- Context -->
        ${w.program_notes ? `
        <p class="modal-section-title">Program Notes</p>
        <p style="color:#d4e4fa;font-size:13px;line-height:1.7;opacity:0.85">${w.program_notes}</p>
        ` : ''}

        ${w.language_librettist ? `
        <p class="modal-section-title">Language / Librettist</p>
        <p style="color:#d4e4fa;font-size:13px">${w.language_librettist}</p>
        ` : ''}

        ${w.additional_info ? `
        <p class="modal-section-title">Additional Info</p>
        <p style="color:#d4e4fa;font-size:13px">${w.additional_info}</p>
        ` : ''}
    `;

    detail.classList.add('open');
};

window.closeWorkDetail = () => {
    document.getElementById('work-detail-modal').classList.remove('open');
};

// ── Delete confirmation ───────────────────────────────────────────
window.confirmDelete = (workId, title) => {
    document.getElementById('confirm-delete-title').textContent = `"${title}"`;
    document.getElementById('confirm-delete-modal').classList.add('open');
    document.getElementById('confirm-delete-btn').onclick = () => window.deleteWork(workId);
};

window.closeConfirmDelete = () => {
    document.getElementById('confirm-delete-modal').classList.remove('open');
};

window.deleteWork = async (workId) => {
    const { error } = await supabase.from('works').delete().eq('id', workId);
    window.closeConfirmDelete();
    if (error) {
        alert('Error deleting work: ' + error.message);
    } else {
        await loadStats();
        await loadMyWorks();
    }
};

function showSection(sectionId) {
    // Hide all
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('sidebar-item-active', 'text-white'));
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.add('text-slate-400'));

    // Show selected
    const section = document.getElementById('section-' + sectionId);
    if (section) {
        section.classList.remove('hidden');
        const nav = document.getElementById('nav-' + sectionId);
        if (nav) {
            nav.classList.add('sidebar-item-active', 'text-white');
            nav.classList.remove('text-slate-400');
        }
    }
}

// ── Wizard state ──────────────────────────────────────────────────
let currentWizStep = 0;
const TOTAL_STEPS = 6;
const STEP_LABELS = [
    'Step 1 of 6 — General Information',
    'Step 2 of 6 — Scoring & Instrumentation',
    'Step 3 of 6 — Electronics',
    'Step 4 of 6 — Premiere',
    'Step 5 of 6 — Production & Rights',
    'Step 6 of 6 — Context & Search',
];

window.showSection = showSection;

window.openWorkModal = () => {
    currentWizStep = 0;
    updateWizUI();
    document.getElementById('work-modal').classList.remove('hidden');
    document.getElementById('work-modal').classList.add('flex');

    // Electronics toggle
    document.querySelectorAll('input[name="w-electronics"]').forEach(r => {
        r.addEventListener('change', () => {
            document.getElementById('electronics-fields').style.display =
                document.getElementById('w-elec-yes').checked ? 'block' : 'none';
        });
    });
};

window.closeWorkModal = () => {
    document.getElementById('work-modal').classList.add('hidden');
    document.getElementById('work-modal').classList.remove('flex');
};

window.wizStep = (dir) => {
    // Validate required fields on step 0
    if (dir === 1 && currentWizStep === 0) {
        const title = document.getElementById('w-title').value.trim();
        const year  = document.getElementById('w-year').value.trim();
        if (!title) { document.getElementById('w-title').focus(); return alert('Title is required.'); }
        if (!year)  { document.getElementById('w-year').focus();  return alert('Year is required.'); }
    }
    // Validate step 1
    if (dir === 1 && currentWizStep === 1) {
        const scoring = document.getElementById('w-scoring').value;
        if (!scoring) { document.getElementById('w-scoring').focus(); return alert('Please select a scoring category.'); }
    }

    const next = currentWizStep + dir;
    if (next < 0 || next >= TOTAL_STEPS) return;
    currentWizStep = next;
    updateWizUI();
};

function updateWizUI() {
    // Steps
    document.querySelectorAll('.wizard-step').forEach((el, i) => {
        el.classList.toggle('active', i === currentWizStep);
    });
    // Dots
    for (let i = 0; i < TOTAL_STEPS; i++) {
        const dot = document.getElementById('dot-' + i);
        dot.className = 'step-dot' + (i < currentWizStep ? ' done' : i === currentWizStep ? ' active' : '');
    }
    // Label
    document.getElementById('wiz-step-label').textContent = STEP_LABELS[currentWizStep];
    // Buttons
    document.getElementById('wiz-back').style.display   = currentWizStep > 0 ? 'block' : 'none';
    document.getElementById('wiz-next').style.display   = currentWizStep < TOTAL_STEPS - 1 ? 'block' : 'none';
    document.getElementById('wiz-submit').style.display = currentWizStep === TOTAL_STEPS - 1 ? 'block' : 'none';
    // Scroll body to top
    document.getElementById('wiz-body').scrollTop = 0;
}

window.saveWork = async () => {
    const title = document.getElementById('w-title').value.trim();
    const year  = parseInt(document.getElementById('w-year').value) || null;
    if (!title || !year) return alert('Title and Year are required.');

    const tagsRaw = document.getElementById('w-tags').value;
    const styleTags = tagsRaw
        ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : null;

    const payload = {
        title,
        subtitle:              document.getElementById('w-subtitle').value.trim()      || null,
        year,
        duration_minutes:      parseFloat(document.getElementById('w-duration').value) || null,
        catalogue_number:      document.getElementById('w-catalogue').value.trim()     || null,

        scoring_category:      document.getElementById('w-scoring').value              || null,
        num_performers:        parseInt(document.getElementById('w-numperf').value)    || null,
        performer_combination: document.getElementById('w-combination').value.trim()   || null,
        soloist_instrument:    document.getElementById('w-soloist').value.trim()       || null,
        unusual_preparations:  document.getElementById('w-preparations').value.trim()  || null,
        space_requirements:    document.getElementById('w-space').value.trim()         || null,

        has_electronics:       document.getElementById('w-elec-yes').checked,
        electronics_type:      document.getElementById('w-elec-type').value            || null,
        electronics_software:  document.getElementById('w-elec-software').value.trim() || null,

        premiere_date:         document.getElementById('w-prem-date').value            || null,
        premiere_city:         document.getElementById('w-prem-city').value.trim()     || null,
        premiere_venue:        document.getElementById('w-prem-venue').value.trim()    || null,
        premiere_performers:   document.getElementById('w-prem-performers').value.trim() || null,

        commissioned_by:       document.getElementById('w-commissioned').value.trim()  || null,
        publisher:             document.getElementById('w-publisher').value.trim()     || null,
        score_status:          document.getElementById('w-score-status').value         || 'finished',
        score_availability:    document.getElementById('w-availability').value         || null,
        score_sample_url:      document.getElementById('w-score-url').value.trim()     || null,
        media_url:             document.getElementById('w-media-url').value.trim()     || null,
        recording_type:        document.getElementById('w-recording-type').value       || 'none',

        program_notes:         document.getElementById('w-notes').value.trim()         || null,
        style_tags:            styleTags,
        technical_difficulty:  document.getElementById('w-difficulty').value           || null,
        language_librettist:   document.getElementById('w-language').value.trim()      || null,
        additional_info:       document.getElementById('w-additional').value.trim()    || null,

        composer_id:   null,         // Only set for catalog works via composers table
        submitted_by:  currentUser.id,
        status:        'validated',
    };

    const btn = document.getElementById('wiz-submit');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const { error } = await supabase.from('works').insert(payload);

    btn.textContent = 'Submit to Archive';
    btn.disabled = false;

    if (error) {
        alert('Error saving work: ' + error.message);
    } else {
        closeWorkModal();
        await loadStats();
        await loadMyWorks();
    }
};

document.addEventListener('DOMContentLoaded', init);

// ── Excel/CSV Form Auto-Fill Importer ──────────────────────────
window.toggleExcelImportPanel = () => {
    const panel = document.getElementById('excel-import-panel');
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
};

window.handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('excel-import-status');
    statusEl.style.display = 'none';

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert sheet to JSON array of objects (keys are headers, values are cell values)
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            if (!jsonData || jsonData.length === 0) {
                alert("The spreadsheet seems to be empty.");
                return;
            }

            // We take the first row of data
            const row = jsonData[0];
            let fieldsFilledCount = 0;

            // Normalize key for loose matching
            const normalize = (str) => {
                if (!str) return '';
                return str.toString()
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // Remove accents
                    .trim();
            };

            // Mapping dictionary: normalized Excel header key -> form element ID or custom handler
            const mappings = {
                'titulo': 'w-title',
                'title': 'w-title',
                'subtitulo': 'w-subtitle',
                'subtitle': 'w-subtitle',
                'version': 'w-subtitle',
                'ano': 'w-year',
                'year': 'w-year',
                'anio': 'w-year',
                'duracion': 'w-duration',
                'duration': 'w-duration',
                'catalogo': 'w-catalogue',
                'catalogue': 'w-catalogue',
                
                'scoring': 'w-scoring',
                'categoria': 'w-scoring',
                'category': 'w-scoring',
                'num performers': 'w-numperf',
                'performers': 'w-numperf',
                'combinacion': 'w-combination',
                'combination': 'w-combination',
                'instrumentacion': 'w-combination',
                'instrumentation': 'w-combination',
                'solista': 'w-soloist',
                'soloist': 'w-soloist',
                'preparaciones': 'w-preparations',
                'preparations': 'w-preparations',
                'espacio': 'w-space',
                'space': 'w-space',

                'electronica': 'electronics', // Custom handler
                'electronics': 'electronics', // Custom handler
                'tipo electronica': 'w-elec-type',
                'electronics type': 'w-elec-type',
                'software': 'w-elec-software',
                'tecnologia': 'w-elec-software',
                
                'fecha estreno': 'w-prem-date',
                'premiere date': 'w-prem-date',
                'ciudad estreno': 'w-prem-city',
                'premiere city': 'w-prem-city',
                'lugar estreno': 'w-prem-venue',
                'premiere venue': 'w-prem-venue',
                'interpretes estreno': 'w-prem-performers',
                'premiere performers': 'w-prem-performers',

                'encargo': 'w-commissioned',
                'commissioned': 'w-commissioned',
                'editorial': 'w-publisher',
                'publisher': 'w-publisher',
                'estado partitura': 'w-score-status',
                'score status': 'w-score-status',
                'disponibilidad': 'w-availability',
                'availability': 'w-availability',

                'muestra partitura': 'w-score-url',
                'partitura url': 'w-score-url',
                'score url': 'w-score-url',
                'grabacion': 'w-media-url',
                'recording': 'w-media-url',
                'media url': 'w-media-url',
                'tipo grabacion': 'w-recording-type',
                'recording type': 'w-recording-type',

                'notas programa': 'w-notes',
                'program notes': 'w-notes',
                'notas': 'w-notes',
                'tags': 'w-tags',
                'etiquetas': 'w-tags',
                'estilo': 'w-tags',
                'dificultad': 'w-difficulty',
                'difficulty': 'w-difficulty',
                'idioma': 'w-language',
                'language': 'w-language',
                'info adicional': 'w-additional',
                'additional info': 'w-additional',
            };

            // Loop through all keys in the row
            for (const key in row) {
                const normKey = normalize(key);
                const target = mappings[normKey];
                if (!target) continue;

                const val = row[key];
                if (val === undefined || val === null || val === '') continue;

                if (target === 'electronics') {
                    const normVal = normalize(val);
                    const isYes = normVal === 'si' || normVal === 'yes' || normVal === 'true' || normVal === '1';
                    document.getElementById('w-elec-yes').checked = isYes;
                    document.getElementById('w-elec-no').checked = !isYes;
                    // Trigger the toggle fields event manually
                    document.getElementById('electronics-fields').style.display = isYes ? 'block' : 'none';
                    fieldsFilledCount++;
                } else {
                    const el = document.getElementById(target);
                    if (el) {
                        el.value = val;
                        fieldsFilledCount++;
                    }
                }
            }

            if (fieldsFilledCount > 0) {
                statusEl.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span> <span>Spreadsheet parsed! ${fieldsFilledCount} fields auto-filled successfully!</span>`;
                statusEl.style.color = '#9ACD90';
                statusEl.style.display = 'flex';
                // Automatically close the panel after a small delay
                setTimeout(() => {
                    document.getElementById('excel-import-panel').style.display = 'none';
                }, 3000);
            } else {
                statusEl.innerHTML = `<span class="material-symbols-outlined text-[16px]">warning</span> <span>No matching columns found. Please verify column headers.</span>`;
                statusEl.style.color = '#E57373';
                statusEl.style.display = 'flex';
            }

        } catch (err) {
            console.error("Error reading spreadsheet: ", err);
            alert("Error parsing the file. Please make sure it is a valid Excel or CSV sheet.");
        }
    };
    reader.readAsArrayBuffer(file);
};
