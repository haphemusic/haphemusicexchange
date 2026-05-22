import supabase from './supabase.js';

let currentUser = null;
let allInstruments = [];
let instrumentData = {};
let instrumentIdMap = new Map();
let selectedWizInstruments = new Set();

const SpanishToEnglishInstruments = {
    'violin': 'Violin',
    'viola': 'Viola',
    'violonchelo': 'Cello',
    'violoncelo': 'Cello',
    'cello': 'Cello',
    'contrabajo': 'Double Bass',
    'arpa': 'Harp',
    'guitarra': 'Classical Guitar',
    'guitarra clasica': 'Classical Guitar',
    'guitarra electrica': 'Electric Guitar',
    'bajo electrico': 'Electric Bass',
    'flauta': 'Flute',
    'flautin': 'Piccolo',
    'oboe': 'Oboe',
    'corno ingles': 'English Horn',
    'clarinete': 'Clarinet',
    'clarinete bajo': 'Bass Clarinet',
    'fagot': 'Bassoon',
    'contrafagot': 'Contrabassoon',
    'saxofon': 'Saxophone',
    'saxo': 'Saxophone',
    'trompa': 'Horn',
    'trompeta': 'Trumpet',
    'trombon': 'Trombone',
    'tuba': 'Tuba/Euphonium',
    'tuba/euphonium': 'Tuba/Euphonium',
    'bombardino': 'Euphonium Horn',
    'timbal': 'Timpani',
    'timbales': 'Timpani',
    'marimba': 'Marimba',
    'vibracono': 'Vibraphone',
    'vibrafono': 'Vibraphone',
    'xilofono': 'Xylophone',
    'glockenspiel': 'Glockenspiel',
    'campanas tubulares': 'Tubular Bells',
    'caja': 'Snare',
    'bombo': 'Bass Drum',
    'piano': 'Piano',
    'piano preparado': 'Prepared Piano',
    'celesta': 'Celesta',
    'clave': 'Harpsichord',
    'organo': 'Organ',
    'acordeon': 'Accordion',
    'voz': 'Solo',
    'soprano': 'Soprano',
    'mezzosoprano': 'Mezzo',
    'mezzo': 'Mezzo',
    'contralto': 'Contralto',
    'tenor': 'Tenor',
    'baritono': 'Baritone',
    'bajo': 'Bass',
    'coro': 'Choir',
    'electronica': 'Live Electronics'
};

function findInstrumentMatch(inputStr) {
    const cleanStr = inputStr.trim().toLowerCase();
    if (!cleanStr) return null;

    const translatedName = SpanishToEnglishInstruments[cleanStr] || cleanStr;
    const target = translatedName.toLowerCase();

    // 1. Exact match on variant (case-insensitive)
    let match = allInstruments.find(item => item.variant && item.variant.toLowerCase() === target);
    if (match) return match;

    // 2. Exact match on name (case-insensitive)
    match = allInstruments.find(item => item.name && item.name.toLowerCase() === target);
    if (match) return match;

    // 3. Substring match on variant (case-insensitive)
    match = allInstruments.find(item => item.variant && item.variant.toLowerCase().includes(target));
    if (match) return match;

    // 4. Substring match on name (case-insensitive)
    match = allInstruments.find(item => item.name && item.name.toLowerCase().includes(target));
    if (match) return match;

    return null;
}

async function loadInstruments() {
    try {
        const { data, error } = await supabase.from('instruments').select('*');
        if (error) throw error;
        if (data) {
            allInstruments = data;
            instrumentData = {};
            instrumentIdMap.clear();

            data.forEach(item => {
                instrumentIdMap.set(item.id, item);

                if (!instrumentData[item.family]) {
                    instrumentData[item.family] = {};
                }
                if (!instrumentData[item.family][item.name]) {
                    instrumentData[item.family][item.name] = [];
                }
                if (item.variant) {
                    instrumentData[item.family][item.name].push(item);
                }
            });
            renderWizInstrumentMenu();
        }
    } catch (err) {
        console.error("Error loading instruments:", err);
    }
}

function renderWizInstrumentMenu() {
    const list = document.getElementById('wiz-instrument-list');
    if (!list) return;
    list.innerHTML = Object.keys(instrumentData).map(f => {
        const names = Object.keys(instrumentData[f]);
        return `
            <div class="cascade-item">${f}
                <div class="cascade-submenu">
                    ${names.map(n => {
                        const variants = instrumentData[f][n];
                        if (variants.length > 0) {
                            return `
                                <div class="cascade-item">${n}
                                    <div class="cascade-submenu">
                                        ${variants.map(vObj => {
                                            const v = vObj.variant;
                                            const displayName = v.toLowerCase().includes(n.toLowerCase()) ? v : `${n} (${v})`;
                                            return `
                                                <div class="cascade-item" onclick='window.addWizInstrumentTag(${vObj.id}, ${JSON.stringify(displayName)})'>${v}</div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            `;
                        } else {
                            const instObj = allInstruments.find(item => item.family === f && item.name === n && !item.variant);
                            const instId = instObj ? instObj.id : null;
                            if (instId) {
                                return `<div class="cascade-item" onclick='window.addWizInstrumentTag(${instId}, ${JSON.stringify(n)})'>${n}</div>`;
                            }
                            return '';
                        }
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

window.toggleWizInstrumentList = () => {
    const m = document.getElementById('wiz-instrument-list');
    if (!m) return;
    const isOpen = m.style.display === 'block';
    m.style.display = isOpen ? 'none' : 'block';
    const btn = document.getElementById('wiz-instrument-btn');
    if (btn) {
        btn.style.borderColor = isOpen ? '' : 'rgba(229,115,115,0.7)';
    }
};

window.addWizInstrumentTag = (instId, displayName) => {
    if (selectedWizInstruments.has(instId)) return;
    selectedWizInstruments.add(instId);

    const container = document.getElementById('wiz-tags-container');
    if (!container) return;

    const tagHtml = `
        <div class="tag-item bg-salmon/20 text-salmon px-3 py-1.5 rounded-full text-[11px] flex items-center gap-2" data-inst-id="${instId}">
            <span>${displayName}</span>
            <span class="cursor-pointer font-bold text-xs hover:text-white" onclick="window.removeWizInstrumentTag(${instId})">×</span>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', tagHtml);

    // Hide dropdown list
    const m = document.getElementById('wiz-instrument-list');
    if (m) m.style.display = 'none';
    const btn = document.getElementById('wiz-instrument-btn');
    if (btn) btn.style.borderColor = '';

    updateWizInstrumentButtonLabel();
};

window.removeWizInstrumentTag = (instId) => {
    selectedWizInstruments.delete(instId);
    const container = document.getElementById('wiz-tags-container');
    if (container) {
        const tagEl = container.querySelector(`[data-inst-id="${instId}"]`);
        if (tagEl) tagEl.remove();
    }
    updateWizInstrumentButtonLabel();
};

function updateWizInstrumentButtonLabel() {
    const selText = document.getElementById('wiz-selected-instrument-text');
    if (!selText) return;

    if (selectedWizInstruments.size === 0) {
        selText.textContent = "Browse Instruments...";
    } else if (selectedWizInstruments.size === 1) {
        const firstId = [...selectedWizInstruments][0];
        const inst = instrumentIdMap.get(firstId);
        if (inst) {
            const v = inst.variant;
            const n = inst.name;
            const displayName = v ? (v.toLowerCase().includes(n.toLowerCase()) ? v : `${n} (${v})`) : n;
            selText.textContent = displayName;
        } else {
            selText.textContent = "1 Instrument Selected";
        }
    } else {
        selText.textContent = `${selectedWizInstruments.size} Instruments Selected`;
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('wiz-cascade-wrapper');
    const m = document.getElementById('wiz-instrument-list');
    if (wrapper && !wrapper.contains(e.target) && m && m.style.display === 'block') {
        m.style.display = 'none';
        const btn = document.getElementById('wiz-instrument-btn');
        if (btn) btn.style.borderColor = '';
    }
});

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
    await loadInstruments();

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
        .from('performances')
        .select('*, work:work_id!inner(submitted_by)', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('work.submitted_by', currentUser.id);

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

function formatWorkStatus(status) {
    if (!status) return 'Unknown';
    if (status === 'validated') return 'Public Work';
    if (status === 'pending') return 'Not Public Work';
    if (status === 'rejected') return 'Rejected';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function loadValidations() {
    const container = document.getElementById('validations-list');
    const { data: validations, error } = await supabase
        .from('performances')
        .select(`
            *,
            performer:performer_id (first_name, last_name, role),
            work:work_id!inner (title, submitted_by)
        `)
        .eq('status', 'pending')
        .eq('work.submitted_by', currentUser.id);

    if (error || !validations || validations.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 py-10 text-center">No pending validation requests.</p>';
        return;
    }

    container.innerHTML = validations.map(v => {
        const performerName = v.performer 
            ? `${v.performer.first_name || ''} ${v.performer.last_name || ''}`.trim() || 'Performer'
            : 'Unknown Performer';
        const performerRole = v.performer?.role || 'musician';
        return `
        <div class="glass-panel p-6 rounded-3xl flex items-center gap-6 group hover:border-salmon/30 transition-all">
            <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                <span class="material-symbols-outlined text-slate-500">groups</span>
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-white">${v.work?.title || 'Unknown Work'}</h4>
                <p class="text-xs text-slate-400">Performed by: ${performerName} (${performerRole})</p>
                <p class="text-[10px] text-slate-500 mt-1">Date: ${v.performance_date || 'N/A'} • Venue: ${v.venue || 'N/A'}, ${v.city || 'N/A'}</p>
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
        `;
    }).join('');
}

async function handleValidation(performanceId, newStatus) {
    const { error } = await supabase
        .from('performances')
        .update({ status: newStatus })
        .eq('id', performanceId);

    if (error) {
        alert("Error updating status: " + error.message);
    } else {
        await loadStats();
        await loadValidations();
        await loadMyWorks();
    }
}
window.handleValidation = handleValidation;

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
                <p class="text-[9px] text-slate-500 uppercase tracking-widest">${w.year || '—'} &bull; ${formatWorkStatus(w.status)}</p>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:8px">
                ${w.status === 'validated'
                    ? '<span class="material-symbols-outlined text-emerald-400" style="font-size:16px" title="Public Work">verified</span>'
                    : w.status === 'pending'
                    ? '<span class="material-symbols-outlined text-slate-400" style="font-size:16px" title="Not Public Work">visibility_off</span>'
                    : '<span class="material-symbols-outlined text-amber-400" style="font-size:16px" title="Pending Validation">pending</span>'
                }
                <button onclick="window.editWork('${encodeURIComponent(JSON.stringify(w))}')"
                    style="background:rgba(212,228,250,0.08);border:1px solid rgba(255,255,255,0.1);color:#d4e4fa;
                           width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;
                           justify-content:center;transition:all 0.2s"
                    onmouseover="this.style.background='rgba(255,255,255,0.15)'"
                    onmouseout="this.style.background='rgba(212,228,250,0.08)'"
                    title="Edit">
                    <span class="material-symbols-outlined" style="font-size:15px">edit</span>
                </button>
                <button onclick="window.confirmDelete(${w.id}, '${w.title.replace(/'/g, "\\'")}')"
                    style="background:rgba(229,115,115,0.12);border:1px solid rgba(229,115,115,0.2);color:#E57373;
                           width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;
                           justify-content:center;transition:all 0.2s"
                    onmouseover="this.style.background='rgba(229,115,115,0.3)'"
                    onmouseout="this.style.background='rgba(229,115,115,0.12)'"
                    title="Delete">
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
        ${row('Status', formatWorkStatus(w.status))}
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
        if (sectionId === 'interactions') {
            window.changeInteractionTab('saved');
        }
        const nav = document.getElementById('nav-' + sectionId);
        if (nav) {
            nav.classList.add('sidebar-item-active', 'text-white');
            nav.classList.remove('text-slate-400');
        }
    }
}

// ── Wizard state ──────────────────────────────────────────────────
let currentWizStep = 0;
let editingWorkId = null;
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

function resetWorkForm() {
    editingWorkId = null;
    
    // Reset title
    const modalTitle = document.getElementById('work-modal-title');
    if (modalTitle) modalTitle.textContent = 'Register New Composition';

    // Reset submit button text
    const submitBtn = document.getElementById('wiz-submit');
    if (submitBtn) {
        submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">upload</span> Submit to Archive';
    }

    document.getElementById('w-title').value = '';
    document.getElementById('w-subtitle').value = '';
    document.getElementById('w-year').value = new Date().getFullYear();
    document.getElementById('w-duration').value = '';
    document.getElementById('w-catalogue').value = '';

    document.getElementById('w-scoring').value = '';
    document.getElementById('w-numperf').value = '';
    document.getElementById('w-combination').value = '';
    document.getElementById('w-soloist').value = '';
    document.getElementById('w-preparations').value = '';
    document.getElementById('w-space').value = '';

    document.getElementById('w-elec-no').checked = true;
    document.getElementById('electronics-fields').style.display = 'none';
    document.getElementById('w-elec-type').value = '';
    document.getElementById('w-elec-software').value = '';

    document.getElementById('w-prem-date').value = '';
    document.getElementById('w-prem-city').value = '';
    document.getElementById('w-prem-venue').value = '';
    document.getElementById('w-prem-performers').value = '';

    document.getElementById('w-commissioned').value = '';
    document.getElementById('w-publisher').value = '';
    document.getElementById('w-score-status').value = 'finished';
    document.getElementById('w-availability').value = '';
    document.getElementById('w-score-url').value = '';
    document.getElementById('w-media-url').value = '';
    document.getElementById('w-recording-type').value = 'none';

    document.getElementById('w-notes').value = '';
    document.getElementById('w-tags').value = '';
    document.getElementById('w-difficulty').value = '';
    document.getElementById('w-language').value = '';
    document.getElementById('w-additional').value = '';

    const visibleCheckbox = document.getElementById('w-visible');
    if (visibleCheckbox) visibleCheckbox.checked = false;

    selectedWizInstruments.clear();
    const tagsContainer = document.getElementById('wiz-tags-container');
    if (tagsContainer) tagsContainer.innerHTML = '';
    updateWizInstrumentButtonLabel();

    // Show Excel trigger
    const excelWrapper = document.getElementById('excel-import-trigger-wrapper');
    if (excelWrapper) excelWrapper.style.display = 'flex';
}

window.openWorkModal = () => {
    resetWorkForm();
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

window.editWork = (wEncoded) => {
    const w = JSON.parse(decodeURIComponent(wEncoded));
    
    // Reset form to base state
    resetWorkForm();
    
    editingWorkId = w.id;

    // Change title and button
    const modalTitle = document.getElementById('work-modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Composition';

    const submitBtn = document.getElementById('wiz-submit');
    if (submitBtn) {
        submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">save</span> Save Changes';
    }

    // Hide Excel importer trigger
    const excelWrapper = document.getElementById('excel-import-trigger-wrapper');
    if (excelWrapper) excelWrapper.style.display = 'none';
    const excelPanel = document.getElementById('excel-import-panel');
    if (excelPanel) excelPanel.style.display = 'none';

    // Populate general fields
    document.getElementById('w-title').value = w.title || '';
    document.getElementById('w-subtitle').value = w.subtitle || '';
    document.getElementById('w-year').value = w.year || '';
    document.getElementById('w-duration').value = w.duration_minutes || '';
    document.getElementById('w-catalogue').value = w.catalogue_number || '';

    // Populate scoring
    document.getElementById('w-scoring').value = w.scoring_category || '';
    document.getElementById('w-numperf').value = w.num_performers || '';
    document.getElementById('w-combination').value = w.performer_combination || '';
    document.getElementById('w-soloist').value = w.soloist_instrument || '';
    document.getElementById('w-preparations').value = w.unusual_preparations || '';
    document.getElementById('w-space').value = w.space_requirements || '';

    // Populate electronics
    if (w.has_electronics) {
        document.getElementById('w-elec-yes').checked = true;
        document.getElementById('electronics-fields').style.display = 'block';
    } else {
        document.getElementById('w-elec-no').checked = true;
        document.getElementById('electronics-fields').style.display = 'none';
    }
    document.getElementById('w-elec-type').value = w.electronics_type || '';
    document.getElementById('w-elec-software').value = w.electronics_software || '';

    // Populate premiere
    document.getElementById('w-prem-date').value = w.premiere_date || '';
    document.getElementById('w-prem-city').value = w.premiere_city || '';
    document.getElementById('w-prem-venue').value = w.premiere_venue || '';
    document.getElementById('w-prem-performers').value = w.premiere_performers || '';

    // Populate production & rights
    document.getElementById('w-commissioned').value = w.commissioned_by || '';
    document.getElementById('w-publisher').value = w.publisher || '';
    document.getElementById('w-score-status').value = w.score_status || 'finished';
    document.getElementById('w-availability').value = w.score_availability || '';
    document.getElementById('w-score-url').value = w.score_sample_url || '';
    document.getElementById('w-media-url').value = w.media_url || '';
    document.getElementById('w-recording-type').value = w.recording_type || 'none';

    // Populate context & search
    document.getElementById('w-notes').value = w.program_notes || '';
    document.getElementById('w-tags').value = (w.style_tags || []).join(', ');
    document.getElementById('w-difficulty').value = w.technical_difficulty || '';
    document.getElementById('w-language').value = w.language_librettist || '';
    document.getElementById('w-additional').value = w.additional_info || '';

    // Populate visibility
    const visibleCheckbox = document.getElementById('w-visible');
    if (visibleCheckbox) {
        visibleCheckbox.checked = (w.status !== 'validated');
    }

    // Populate instruments
    selectedWizInstruments.clear();
    const tagsContainer = document.getElementById('wiz-tags-container');
    if (tagsContainer) tagsContainer.innerHTML = '';

    if (w.work_instruments) {
        w.work_instruments.forEach(wi => {
            if (wi.instrument_id) {
                const instId = wi.instrument_id.id;
                const v = wi.instrument_id.variant;
                const n = wi.instrument_id.name;
                const displayName = v ? (v.toLowerCase().includes(n.toLowerCase()) ? v : `${n} (${v})`) : n;
                selectedWizInstruments.add(instId);
                if (tagsContainer) {
                    const tagHtml = `
                        <div class="tag-item bg-salmon/20 text-salmon px-3 py-1.5 rounded-full text-[11px] flex items-center gap-2" data-inst-id="${instId}">
                            <span>${displayName}</span>
                            <span class="cursor-pointer font-bold text-xs hover:text-white" onclick="window.removeWizInstrumentTag(${instId})">×</span>
                        </div>
                    `;
                    tagsContainer.insertAdjacentHTML('beforeend', tagHtml);
                }
            }
        });
        updateWizInstrumentButtonLabel();
    }

    currentWizStep = 0;
    updateWizUI();
    document.getElementById('work-modal').classList.remove('hidden');
    document.getElementById('work-modal').classList.add('flex');
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
        if (selectedWizInstruments.size === 0) {
            const instBtn = document.getElementById('wiz-instrument-btn');
            if (instBtn) instBtn.focus();
            return alert('Please select at least one instrument.');
        }
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
    if (selectedWizInstruments.size === 0) {
        const instBtn = document.getElementById('wiz-instrument-btn');
        if (instBtn) instBtn.focus();
        return alert('Please select at least one instrument before saving.');
    }

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
        status:        document.getElementById('w-visible').checked ? 'pending' : 'validated',
    };

    const btn = document.getElementById('wiz-submit');
    const originalBtnHtml = btn.innerHTML;
    btn.innerHTML = 'Saving...';
    btn.disabled = true;

    let savedWork = null;
    let saveError = null;

    if (editingWorkId) {
        const { data, error } = await supabase
            .from('works')
            .update(payload)
            .eq('id', editingWorkId)
            .select()
            .single();
        savedWork = data;
        saveError = error;
    } else {
        const { data, error } = await supabase
            .from('works')
            .insert(payload)
            .select()
            .single();
        savedWork = data;
        saveError = error;
    }

    if (saveError) {
        btn.innerHTML = originalBtnHtml;
        btn.disabled = false;
        alert('Error saving work: ' + saveError.message);
        return;
    }

    const workIdToLink = editingWorkId || savedWork.id;

    if (editingWorkId) {
        // Delete existing relations first
        await supabase
            .from('work_instruments')
            .delete()
            .eq('work_id', editingWorkId);
    }

    if (workIdToLink && selectedWizInstruments.size > 0) {
        const relationPayloads = [...selectedWizInstruments].map(instId => ({
            work_id: workIdToLink,
            instrument_id: instId,
            quantity: 1
        }));

        const { error: relError } = await supabase
            .from('work_instruments')
            .insert(relationPayloads);

        if (relError) {
            console.error("Error saving work instruments relations:", relError);
            alert("Work was saved, but there was an error linking the instruments: " + relError.message);
        }
    }

    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">upload</span> Submit to Archive';
    btn.disabled = false;
    closeWorkModal();
    await loadStats();
    await loadMyWorks();
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
            let workbook;
            
            const isCSV = file.name.toLowerCase().endsWith('.csv');
            if (isCSV) {
                let decodedText;
                try {
                    decodedText = new TextDecoder('utf-8', { fatal: true }).decode(data);
                } catch (err) {
                    decodedText = new TextDecoder('windows-1252').decode(data);
                }
                workbook = XLSX.read(decodedText, { type: 'string' });
            } else {
                workbook = XLSX.read(data, { type: 'array' });
            }
            
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
                'instrumentacion': 'instrumentos',
                'instrumentation': 'instrumentos',
                'instrumentos': 'instrumentos',
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

            const tagsContainer = document.getElementById('wiz-tags-container');
            // Clear previous instruments
            selectedWizInstruments.clear();
            if (tagsContainer) tagsContainer.innerHTML = '';
            updateWizInstrumentButtonLabel();

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
                } else if (target === 'instrumentos') {
                    // Custom handler for instruments list
                    const combinationEl = document.getElementById('w-combination');
                    if (combinationEl) {
                        combinationEl.value = val;
                    }
                    
                    const parts = val.toString().split(',').map(p => p.trim()).filter(Boolean);
                    parts.forEach(part => {
                        const matchedInst = findInstrumentMatch(part);
                        if (matchedInst) {
                            const v = matchedInst.variant;
                            const n = matchedInst.name;
                            const displayName = v ? (v.toLowerCase().includes(n.toLowerCase()) ? v : `${n} (${v})`) : n;
                            window.addWizInstrumentTag(matchedInst.id, displayName);
                        }
                    });
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

// ── Bulk Import Works (Up to 100 Rows) ──────────────────────────────
let parsedWorks = [];

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

function normString(str) {
    if (!str) return '';
    return str.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function parseDurationBulk(raw) {
    if (!raw || raw === 'N/D' || raw.toString().trim() === '') return null;
    const first = raw.toString().split('-')[0];
    const m = first.match(/(\d+)'(?:(\d+)'')?/);
    if (!m) {
        const parsedFloat = parseFloat(first);
        return isNaN(parsedFloat) ? null : parsedFloat;
    }
    const mins = parseInt(m[1]);
    const secs = m[2] ? parseInt(m[2]) : 0;
    return Math.round((mins + secs / 60) * 100) / 100;
}

function parseYearBulk(raw) {
    if (!raw || raw === 'N/D') return null;
    const m = raw.toString().match(/(\d{4})/);
    return m ? parseInt(m[1]) : null;
}

function parseDateBulk(raw) {
    if (!raw || raw === 'N/D' || raw.toString().toLowerCase().includes('n/d')) return null;
    const m = raw.toString().trim().match(/^(\d{1,2})-(\d{2})-(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    return null;
}

function cleanFieldBulk(val) {
    if (!val || val.toString().trim() === 'N/D' || val.toString().trim() === '-' || val.toString().trim() === '') return null;
    return val.toString().trim();
}

function findInstrumentIdBulk(raw, instrumentsList) {
    const cleanRaw = normString(raw);
    if (!cleanRaw) return null;

    const withoutNum = cleanRaw.replace(/^\d+\s+/, '').trim();

    const candidates = [withoutNum, cleanRaw];
    let englishName = null;
    for (const c of candidates) {
        if (INSTR_MAP[c]) { englishName = INSTR_MAP[c]; break; }
        const key = Object.keys(INSTR_MAP).find(k => c.includes(k) || k.includes(c));
        if (key) { englishName = INSTR_MAP[key]; break; }
    }
    if (!englishName) englishName = withoutNum;

    const target = englishName.toLowerCase();

    let match = instrumentsList.find(i => i.variant && i.variant.toLowerCase() === target);
    if (match) return match;
    match = instrumentsList.find(i => i.name && i.name.toLowerCase() === target);
    if (match) return match;
    match = instrumentsList.find(i => i.variant && i.variant.toLowerCase().includes(target));
    if (match) return match;
    match = instrumentsList.find(i => i.name && i.name.toLowerCase().includes(target));
    if (match) return match;
    match = instrumentsList.find(i => i.name && target.includes(i.name.toLowerCase()));
    if (match) return match;

    return null;
}

function parseInstrumentsFieldBulk(rawField, instrumentsList) {
    if (!rawField || rawField === 'N/D' || rawField === '-') return { instruments: [], unmatched: [] };
    
    const parts = rawField.toString().split(',').map(p => p.trim()).filter(Boolean);
    const matched = [];
    const unmatched = [];
    
    for (const part of parts) {
        if (part.split(' ').length > 5) continue;
        if (/actor|pianista|grupo|grupos|músicos|voces|intérprete|solista\s|banda\s|orquesta\s|cuerda\s|dispositivo/i.test(part)) continue;
        
        const inst = findInstrumentIdBulk(part, instrumentsList);
        if (inst) {
            matched.push(inst);
        } else {
            unmatched.push(part);
        }
    }
    return { instruments: matched, unmatched };
}

window.handleBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            let workbook;
            const isCSV = file.name.toLowerCase().endsWith('.csv');
            if (isCSV) {
                let decodedText;
                try {
                    decodedText = new TextDecoder('utf-8', { fatal: true }).decode(data);
                } catch (err) {
                    decodedText = new TextDecoder('windows-1252').decode(data);
                }
                workbook = XLSX.read(decodedText, { type: 'string' });
            } else {
                workbook = XLSX.read(data, { type: 'array' });
            }

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

            if (!jsonData || jsonData.length === 0) {
                alert("The spreadsheet seems to be empty.");
                return;
            }

            const rowsToProcess = jsonData.slice(0, 100);
            const firstRow = rowsToProcess[0];
            const columnMapping = {};
            const availableHeaders = Object.keys(firstRow);

            const mappings = {
                title: ['titulo original', 'titulo', 'title', 'nombre obra'],
                subtitle: ['version/subtitulo', 'subtítulo', 'subtitulo', 'version', 'subtitle', 'versión'],
                year: ['ano', 'año', 'anio', 'year', 'fecha creacion'],
                duration_minutes: ['duracion', 'duración', 'duration', 'tiempo'],
                scoring_category: ['categoria de scoring', 'categoría', 'categoria', 'scoring', 'category', 'tipo de obra'],
                instruments_field: ['instrumentacion detallada', 'instrumentación', 'instrumentacion', 'instrumentos', 'instrumentation', 'plantilla'],
                premiere_date: ['fecha de estreno', 'fecha estreno', 'estreno fecha', 'premiere date'],
                premiere_venue: ['lugar de estreno', 'lugar estreno', 'estreno lugar', 'premiere venue'],
                premiere_city: ['ciudad de estreno', 'ciudad estreno', 'estreno ciudad', 'premiere city'],
                premiere_performers: ['interpretes de estreno', 'interpretes del estreno', 'interpretes estreno', 'estreno interpretes', 'premiere performers', 'interpretes'],
                commissioned_by: ['encargo', 'commission', 'encargos / ayudas', 'encargos'],
                notes: ['notas', 'comentarios', 'notes', 'comments', 'notas adicionales']
            };

            const matchedHeadersInfo = {};
            for (const fieldKey in mappings) {
                const searchKeys = mappings[fieldKey];
                const matchedHeader = availableHeaders.find(h => {
                    const normH = normString(h);
                    return searchKeys.some(sk => normH === sk || normH.includes(sk));
                });
                if (matchedHeader) {
                    columnMapping[fieldKey] = matchedHeader;
                    matchedHeadersInfo[fieldKey] = matchedHeader;
                }
            }

            parsedWorks = rowsToProcess.map((row, idx) => {
                const rawTitle = row[columnMapping.title] || '';
                const rawSubtitle = row[columnMapping.subtitle] || '';
                const rawYear = row[columnMapping.year] || '';
                const rawDuration = row[columnMapping.duration_minutes] || '';
                const rawCategory = row[columnMapping.scoring_category] || '';
                const rawInstruments = row[columnMapping.instruments_field] || '';
                const rawPremDate = row[columnMapping.premiere_date] || '';
                const rawPremVenue = row[columnMapping.premiere_venue] || '';
                const rawPremCity = row[columnMapping.premiere_city] || '';
                const rawPremPerformers = row[columnMapping.premiere_performers] || '';
                const rawCommission = row[columnMapping.commissioned_by] || '';
                const rawNotes = row[columnMapping.notes] || '';

                const title = cleanFieldBulk(rawTitle);
                const subtitle = cleanFieldBulk(rawSubtitle);
                const year = parseYearBulk(rawYear);
                const duration = parseDurationBulk(rawDuration);
                const rawCatClean = cleanFieldBulk(rawCategory);
                const scoring_category = rawCatClean ? (CATEGORY_MAP[normString(rawCatClean)] || 'other') : 'other';
                
                const { instruments, unmatched } = parseInstrumentsFieldBulk(rawInstruments, allInstruments);

                const errors = [];
                if (!title) errors.push("Missing Title");
                if (!year) errors.push("Missing Year");

                return {
                    id: idx,
                    title,
                    subtitle,
                    year,
                    duration_minutes: duration,
                    scoring_category,
                    performer_combination: cleanFieldBulk(rawInstruments),
                    premiere_date: parseDateBulk(rawPremDate),
                    premiere_venue: cleanFieldBulk(rawPremVenue),
                    premiere_city: cleanFieldBulk(rawPremCity),
                    premiere_performers: cleanFieldBulk(rawPremPerformers),
                    commissioned_by: cleanFieldBulk(rawCommission),
                    program_notes: cleanFieldBulk(rawNotes),
                    instruments,
                    unmatched,
                    errors,
                    rawInstrumentsText: rawInstruments
                };
            });

            renderBulkPreview(matchedHeadersInfo);

        } catch (err) {
            console.error("Error loading bulk spreadsheet:", err);
            alert("Error parsing the file. Please verify it is a valid CSV/Excel file.");
        }
    };
    reader.readAsArrayBuffer(file);
};

function renderBulkPreview(matchedHeadersInfo = {}) {
    const uploadZone = document.getElementById('bulk-upload-zone');
    const container = document.getElementById('bulk-preview-container');
    const tbody = document.getElementById('bulk-preview-tbody');
    const mappingGrid = document.getElementById('bulk-column-mapping-grid');

    uploadZone.classList.add('hidden');
    container.classList.remove('hidden');

    mappingGrid.innerHTML = '';
    const fieldsToDisplay = [
        { label: 'Title', key: 'title' },
        { label: 'Subtitle', key: 'subtitle' },
        { label: 'Year', key: 'year' },
        { label: 'Duration', key: 'duration_minutes' },
        { label: 'Category', key: 'scoring_category' },
        { label: 'Instruments', key: 'instruments_field' }
    ];

    fieldsToDisplay.forEach(item => {
        const matchedColumn = matchedHeadersInfo[item.key];
        const displayVal = matchedColumn ? matchedColumn : 'Not mapped';
        const isMatched = !!matchedColumn;
        
        mappingGrid.innerHTML += `
            <div class="p-3 rounded-2xl bg-white/[0.02] border ${isMatched ? 'border-emerald-500/20 bg-emerald-500/[0.01]' : 'border-white/5'} flex flex-col gap-1">
                <span class="text-[10px] text-slate-500 uppercase tracking-wider font-bold">${item.label}</span>
                <span class="font-semibold ${isMatched ? 'text-emerald-400' : 'text-slate-400'} truncate" title="${displayVal}">${displayVal}</span>
            </div>
        `;
    });

    updateBulkSummaryCounts();

    tbody.innerHTML = '';
    if (parsedWorks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12 text-slate-500 font-sans">
                    All rows removed. Drag and drop another file to start over.
                </td>
            </tr>
        `;
        return;
    }

    parsedWorks.forEach((w, index) => {
        const matchedBadges = w.instruments.map(inst => {
            const label = inst.variant ? `${inst.name} (${inst.variant})` : inst.name;
            return `<span class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-md text-[10px] font-medium" title="Database match">${label}</span>`;
        }).join(' ');

        const unmatchedBadges = w.unmatched.map(u => {
            return `<span class="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-md text-[10px] font-medium" title="Unmatched acronym / term">${u}</span>`;
        }).join(' ');

        const allBadges = [matchedBadges, unmatchedBadges].filter(Boolean).join(' ');

        let statusHtml = '';
        if (w.errors.length > 0) {
            statusHtml = `
                <div class="flex flex-col items-center gap-0.5 text-rose-400" title="${w.errors.join(', ')}">
                    <span class="material-symbols-outlined text-[18px]">error</span>
                    <span class="text-[9px] font-semibold uppercase">Error</span>
                </div>
            `;
        } else {
            statusHtml = `
                <div class="flex flex-col items-center gap-0.5 text-emerald-400">
                    <span class="material-symbols-outlined text-[18px]">check_circle</span>
                    <span class="text-[9px] font-semibold uppercase">Ready</span>
                </div>
            `;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-white/[0.01] transition-all">
                <td class="py-4 px-6 text-center text-slate-500 font-mono">${index + 1}</td>
                <td class="py-4 px-4">
                    <div class="font-bold text-white max-w-[250px] truncate" title="${w.title || 'Untitled'}">${w.title || '<span class="text-rose-400 italic">Untitled</span>'}</div>
                    <div class="text-[10px] text-slate-500 truncate max-w-[250px]" title="${w.subtitle || ''}">${w.subtitle || '—'}</div>
                </td>
                <td class="py-4 px-4 text-center font-mono font-semibold">${w.year || '<span class="text-rose-400">—</span>'}</td>
                <td class="py-4 px-4 text-center font-mono text-slate-400">${w.duration_minutes ? w.duration_minutes + "'" : '—'}</td>
                <td class="py-4 px-4">
                    <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-300">${w.scoring_category}</span>
                </td>
                <td class="py-4 px-4">
                    <div class="flex flex-wrap gap-1.5 max-w-[320px]">
                        ${allBadges || `<span class="text-slate-500 italic text-[11px]">${w.rawInstrumentsText || '—'}</span>`}
                    </div>
                </td>
                <td class="py-4 px-4 text-center">${statusHtml}</td>
                <td class="py-4 px-6 text-center">
                    <button onclick="window.removeBulkRow(${w.id})" class="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Delete Row">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </td>
            </tr>
        `;
    });
}

function updateBulkSummaryCounts() {
    const totalCount = parsedWorks.length;
    const readyCount = parsedWorks.filter(w => w.errors.length === 0).length;
    const errorCount = parsedWorks.filter(w => w.errors.length > 0).length;

    document.getElementById('bulk-preview-count-label').textContent = `${totalCount} works loaded`;
    document.getElementById('bulk-action-total').textContent = totalCount;
    document.getElementById('bulk-action-ready').textContent = readyCount;
    document.getElementById('bulk-action-errors').textContent = errorCount;

    const submitBtn = document.getElementById('bulk-import-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = readyCount === 0;
    }
}

window.removeBulkRow = (id) => {
    parsedWorks = parsedWorks.filter(w => w.id !== id);
    renderBulkPreview();
};

window.clearBulkImport = () => {
    parsedWorks = [];
    document.getElementById('bulk-file-input').value = '';
    document.getElementById('bulk-preview-container').classList.add('hidden');
    document.getElementById('bulk-upload-zone').classList.remove('hidden');
};

window.submitBulkImport = async () => {
    const validWorks = parsedWorks.filter(w => w.errors.length === 0);
    if (validWorks.length === 0) return;

    const btn = document.getElementById('bulk-import-submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[16px]">sync</span> Saving...`;
    btn.disabled = true;

    try {
        const payloads = validWorks.map(w => ({
            title: w.title,
            subtitle: w.subtitle,
            year: w.year,
            duration_minutes: w.duration_minutes,
            scoring_category: w.scoring_category,
            performer_combination: w.performer_combination,
            premiere_date: w.premiere_date,
            premiere_venue: w.premiere_venue,
            premiere_city: w.premiere_city,
            premiere_performers: w.premiere_performers,
            commissioned_by: w.commissioned_by,
            program_notes: w.program_notes,
            composer_id: null,
            submitted_by: currentUser.id,
            status: 'validated'
        }));

        const { data: insertedWorks, error } = await supabase
            .from('works')
            .insert(payloads)
            .select();

        if (error) throw error;

        if (insertedWorks && insertedWorks.length > 0) {
            const relationPayloads = [];
            const unmatchedInstrumentsSet = new Set();

            insertedWorks.forEach((insertedWork, idx) => {
                const orig = validWorks.find(w => w.title === insertedWork.title && w.year === insertedWork.year) || validWorks[idx];
                if (orig) {
                    orig.instruments.forEach(inst => {
                        relationPayloads.push({
                            work_id: insertedWork.id,
                            instrument_id: inst.id,
                            quantity: 1
                        });
                    });
                    orig.unmatched.forEach(u => unmatchedInstrumentsSet.add(u));
                }
            });

            if (relationPayloads.length > 0) {
                const { error: relError } = await supabase
                    .from('work_instruments')
                    .insert(relationPayloads);
                if (relError) {
                    console.error("Error bulk-saving work instruments relations:", relError);
                }
            }

            document.getElementById('bulk-report-success-count').textContent = insertedWorks.length;
            const unmatchedListEl = document.getElementById('bulk-report-unmatched-list');
            const unmatchedWrapper = document.getElementById('bulk-report-unmatched-wrapper');

            if (unmatchedInstrumentsSet.size > 0) {
                unmatchedListEl.innerHTML = [...unmatchedInstrumentsSet].map(u => {
                    return `<span class="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded-md text-[10px] font-medium">${u}</span>`;
                }).join(' ');
                unmatchedWrapper.classList.remove('hidden');
            } else {
                unmatchedWrapper.classList.add('hidden');
            }

            document.getElementById('bulk-report-modal').classList.remove('hidden');
            document.getElementById('bulk-report-modal').classList.add('flex');
        }

    } catch (err) {
        console.error("Error saving bulk import:", err);
        alert("Error saving compositions: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

window.closeBulkReportModal = () => {
    document.getElementById('bulk-report-modal').classList.remove('flex');
    document.getElementById('bulk-report-modal').classList.add('hidden');
    window.clearBulkImport();
    
    loadStats();
    loadMyWorks();
    
    showSection('my-works');
    window.location.hash = 'my-works';
};

// ── Saved & Likes Dashboard Section ───────────────────────────────
let activeTab = 'saved';
window.activeInteractionTab = activeTab;

async function changeInteractionTab(tabType) {
    activeTab = tabType;
    window.activeInteractionTab = tabType;
    
    const tabs = ['saved', 'upvoted', 'downvoted'];
    tabs.forEach(t => {
        const btn = document.getElementById('tab-int-' + t);
        if (btn) {
            if (t === tabType) {
                btn.classList.add('border-salmon', 'text-salmon');
                btn.classList.remove('border-transparent', 'text-slate-400');
            } else {
                btn.classList.remove('border-salmon', 'text-salmon');
                btn.classList.add('border-transparent', 'text-slate-400');
            }
        }
    });
    await loadInteractions(tabType);
}
window.changeInteractionTab = changeInteractionTab;

async function loadInteractions(tabType = 'saved') {
    const listContainer = document.getElementById('interactions-list');
    if (!listContainer) return;

    listContainer.innerHTML = `
        <div class="col-span-full flex justify-center items-center py-12">
            <span class="material-symbols-outlined text-3xl animate-spin text-salmon">sync</span>
        </div>
    `;

    try {
        let postIds = [];
        if (tabType === 'saved') {
            const { data: savedData, error: sError } = await supabase
                .from('saved_posts')
                .select('post_id')
                .eq('user_id', currentUser.id);
            if (sError) throw sError;
            postIds = savedData.map(d => d.post_id);
        } else {
            const typeVal = tabType === 'upvoted' ? 1 : -1;
            const { data: voteData, error: vError } = await supabase
                .from('votes')
                .select('post_id')
                .eq('user_id', currentUser.id)
                .eq('vote_type', typeVal);
            if (vError) throw vError;
            postIds = voteData.map(d => d.post_id);
        }

        if (postIds.length === 0) {
            listContainer.innerHTML = `
                <div class="col-span-full text-center py-16 bg-white/5 rounded-2xl border border-white/5">
                    <span class="material-symbols-outlined text-4xl text-slate-600 mb-2">bookmark_border</span>
                    <p class="text-sm text-slate-400 font-sans">No posts found in this category.</p>
                </div>
            `;
            return;
        }

        // Fetch post details
        const { data: posts, error: pError } = await supabase
            .from('posts')
            .select('*')
            .in('id', postIds)
            .order('created_at', { ascending: false });

        if (pError) throw pError;

        if (!posts || posts.length === 0) {
            listContainer.innerHTML = `
                <div class="col-span-full text-center py-16 bg-white/5 rounded-2xl border border-white/5">
                    <span class="material-symbols-outlined text-4xl text-slate-600 mb-2">bookmark_border</span>
                    <p class="text-sm text-slate-400 font-sans">No posts found.</p>
                </div>
            `;
            return;
        }

        // Fetch author names to display in cards
        const authorIds = [...new Set(posts.map(p => p.author_id))];
        const { data: profiles, error: prError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', authorIds);

        listContainer.innerHTML = posts.map(p => {
            const author = profiles ? profiles.find(pr => pr.id === p.author_id) : null;
            const authorName = author ? `${author.first_name || ''} ${author.last_name || ''}`.trim() : 'Anonymous';
            const dateStr = new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

            return `
                <a href="index.html?post=${p.id}&from=composer" class="block feed-card p-5 rounded-2xl transition-all duration-300 relative group border border-white/5 hover:border-salmon/30 bg-white/5">
                    <div class="flex items-center gap-2 text-[10px] text-slate-400 mb-2 font-sans">
                        <span class="font-bold text-white hover:underline">${authorName}</span>
                        <span>•</span>
                        <span class="font-mono">${dateStr}</span>
                    </div>
                    <h3 class="text-sm font-bold text-white group-hover:text-salmon transition-colors mb-1.5 line-clamp-1 font-headline-md">${p.title}</h3>
                    <p class="text-xs text-slate-300 line-clamp-2 font-sans">${p.content}</p>
                    <div class="absolute right-4 bottom-4 text-salmon opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="material-symbols-outlined text-[18px]">open_in_new</span>
                    </div>
                </a>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading interactions:", err);
        listContainer.innerHTML = `<p class="col-span-full text-center text-rose-400 text-xs font-sans py-10">Error loading interaction list.</p>`;
    }
}
window.loadInteractions = loadInteractions;
