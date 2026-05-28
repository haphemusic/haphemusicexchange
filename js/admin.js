import supabase from './supabase.js';

let currentUser = null;
let allPieces = [];
let allInstruments = [];
let allUsers = [];

async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    currentUser = session.user;
    
    // Auth check
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
    if (profile?.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    await loadUserProfile();
    await loadStats();
    await loadUsers();
    await loadInstruments();
    await loadPieces();
    
    const hash = window.location.hash.substring(1) || 'analytics';
    showSection(hash);
}

async function loadUserProfile() {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (profile) {
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin';
        document.getElementById('user-display-name').textContent = name;
        
        if (profile.avatar_url) {
            document.getElementById('user-avatar').src = profile.avatar_url;
        } else {
            document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E57373&color=fff`;
        }
    }
}

async function loadStats() {
    const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: works } = await supabase.from('works').select('*', { count: 'exact', head: true });
    
    // Calcular usuarios activos reales (perfiles actualizados en las últimas 24h)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const { count: active } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('updated_at', oneDayAgo.toISOString());
    
    document.getElementById('admin-stat-users').textContent = users || 0;
    document.getElementById('admin-stat-active').textContent = Math.max(active || 0, 1);
    document.getElementById('admin-stat-works').textContent = works || 0;

    await drawRegistrationChart();
}

async function drawRegistrationChart() {
    const { data: users } = await supabase
        .from('profiles')
        .select('updated_at')
        .order('updated_at', { ascending: true });
        
    const chartContainer = document.getElementById('registration-velocity-chart');
    if (!chartContainer) return;
    
    if (!users || !users.length) {
        chartContainer.innerHTML = `<p class="text-xs text-slate-500 w-full text-center py-10">No registration data available yet</p>`;
        return;
    }
    
    const registrationsByDay = {};
    const today = new Date();
    
    // Inicializar los últimos 7 días
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        registrationsByDay[dateStr] = { count: 0, label: d.toLocaleDateString(undefined, { weekday: 'short' }) };
    }
    
    // Contar registros por día
    users.forEach(u => {
        if (!u.updated_at) return;
        const dateStr = u.updated_at.split('T')[0];
        if (registrationsByDay[dateStr]) {
            registrationsByDay[dateStr].count++;
        }
    });
    
    const daysData = Object.values(registrationsByDay);
    const maxCount = Math.max(...daysData.map(d => d.count), 1);
    
    chartContainer.innerHTML = daysData.map(d => {
        const pct = (d.count / maxCount) * 100;
        const heightVal = d.count > 0 ? Math.max(pct, 10) : 0;
        return `
            <div class="flex flex-col items-center gap-2 group flex-1">
                <div class="relative w-8 bg-salmon/20 group-hover:bg-salmon/40 rounded-t-lg transition-all duration-300 flex items-end justify-center" style="height: ${heightVal}%">
                    <span class="absolute -top-6 text-[10px] text-salmon font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">${d.count} u.</span>
                </div>
                <span class="text-[10px] text-slate-500 uppercase font-semibold">${d.label}</span>
            </div>
        `;
    }).join('');
}

async function loadUsers() {
    const { data: users } = await supabase.from('profiles').select('*').order('updated_at', { ascending: false });
    allUsers = users || [];
    renderUsers(allUsers);
}

function renderUsers(usersToRender) {
    const container = document.getElementById('admin-user-table');
    if (!container) return;

    if (!usersToRender || usersToRender.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="px-8 py-8 text-center text-slate-500 text-sm">
                    No users found
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = usersToRender.map(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.name || 'Anonymous User';
        const avatar = u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=E57373&color=fff`;
        
        // Determinar si está en línea (actividad en los últimos 5 minutos)
        const lastActive = u.updated_at ? new Date(u.updated_at) : null;
        const isOnline = lastActive && (new Date() - lastActive) < 5 * 60 * 1000;
        
        const statusBadge = isOnline 
            ? `<div class="relative w-8 h-8">
                 <img src="${avatar}" class="w-8 h-8 rounded-full object-cover">
                 <span class="absolute bottom-0 right-0 flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900">
                   <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 </span>
               </div>`
            : `<div class="relative w-8 h-8">
                 <img src="${avatar}" class="w-8 h-8 rounded-full object-cover opacity-60">
                 <span class="absolute bottom-0 right-0 flex h-2.5 w-2.5 rounded-full bg-slate-500 ring-2 ring-slate-900"></span>
               </div>`;
               
        return `
            <tr class="hover:bg-white/2 transition-colors">
                <td class="px-8 py-4">
                    <div class="flex items-center gap-3">
                        ${statusBadge}
                        <div>
                            <p class="text-sm font-bold text-white flex items-center gap-2">
                                ${fullName}
                                ${isOnline ? '<span class="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider scale-90">Online</span>' : ''}
                            </p>
                            <p class="text-[10px] text-slate-500">${u.id.substring(0,8)}</p>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-4 text-xs text-slate-300">
                    ${u.email || 'N/A'}
                </td>
                <td class="px-8 py-4">
                    <span class="badge bg-slate-800 text-slate-400">${u.role === 'musician' ? 'performer' : u.role}</span>
                </td>
                <td class="px-8 py-4 text-xs text-slate-400">${u.updated_at ? new Date(u.updated_at).toLocaleDateString() : 'N/A'}</td>
                <td class="px-8 py-4">
                    <span class="badge status-${u.status || 'active'}">${u.status || 'active'}</span>
                </td>
                <td class="px-8 py-4 text-right">
                    <div class="flex justify-end gap-2">
                        <button onclick="moderateUser('${u.id}', 'active')" title="Activate" class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all">
                            <span class="material-symbols-outlined text-[18px]">check_circle</span>
                        </button>
                        <button onclick="moderateUser('${u.id}', 'suspended')" title="Suspend" class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all">
                            <span class="material-symbols-outlined text-[18px]">pause_circle</span>
                        </button>
                        <button onclick="moderateUser('${u.id}', 'banned')" title="Ban" class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                            <span class="material-symbols-outlined text-[18px]">block</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.filterUsers = (query) => {
    const q = query.toLowerCase().trim();
    if (!q) {
        renderUsers(allUsers);
        return;
    }
    const filtered = allUsers.filter(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.name || 'Anonymous User';
        const nameMatch = fullName.toLowerCase().includes(q);
        const emailMatch = u.email && u.email.toLowerCase().includes(q);
        return nameMatch || emailMatch;
    });
    renderUsers(filtered);
};

window.moderateUser = async (userId, newStatus) => {
    if (!confirm(`Are you sure you want to change user status to ${newStatus}?`)) return;
    
    const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

    if (error) {
        if (error.message.includes('column "status" does not exist') || error.code === '42703') {
            alert("⚠️ La columna 'status' no existe en tu tabla 'profiles' en Supabase.\n\nPor favor, ejecuta la siguiente consulta SQL en tu consola de Supabase (SQL Editor) para habilitar la moderación:\n\nALTER TABLE profiles ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned'));");
        } else {
            alert("Error: " + error.message);
        }
    } else {
        await loadUsers();
    }
};

// Keeps the per-family display order (array of IDs) so up/down buttons can re-sort
let familyOrder = {};

async function loadInstruments() {
    let res = await supabase.from('instruments').select('*')
        .order('family', { ascending: true })
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
    
    if (res.error && (res.error.message.includes('sort_order') || res.error.code === '42703')) {
        res = await supabase.from('instruments').select('*')
            .order('family', { ascending: true })
            .order('name', { ascending: true });
    }

    const { data: instruments } = res;
    if (!instruments) return;
    
    allInstruments = instruments;

    // Build familyOrder from the DB order
    familyOrder = {};
    const families = [...new Set(instruments.map(i => i.family))];
    families.forEach(f => {
        familyOrder[f] = instruments.filter(i => i.family === f).map(i => i.id);
    });

    renderInstrumentBoard();
}

function renderInstrumentBoard() {
    const container = document.getElementById('instrument-board');
    if (!container) return;

    // Group instruments by family, respecting familyOrder
    const grouped = {};
    const families = [...new Set(allInstruments.map(i => i.family))].sort();

    families.forEach(f => { grouped[f] = []; });
    allInstruments.forEach(i => {
        if (grouped[i.family]) grouped[i.family].push(i);
    });

    // Sort each family's list according to familyOrder
    families.forEach(f => {
        if (familyOrder[f]) {
            const orderMap = {};
            familyOrder[f].forEach((id, idx) => { orderMap[id] = idx; });
            grouped[f].sort((a, b) => {
                const ai = orderMap[a.id] !== undefined ? orderMap[a.id] : 9999;
                const bi = orderMap[b.id] !== undefined ? orderMap[b.id] : 9999;
                return ai - bi;
            });
        }
    });

    container.innerHTML = families.map(family => {
        const list = grouped[family] || [];
        return `
            <div class="flex-shrink-0 w-80 bg-slate-950/40 rounded-3xl border border-white/5 p-6 flex flex-col max-h-[70vh] transition-all duration-300"
                 data-family="${family}"
                 ondragover="window.handleDragOver(event)"
                 ondragenter="window.handleDragEnter(event)"
                 ondragleave="window.handleDragLeave(event)"
                 ondrop="window.handleColumnDrop(event, '${family}')">

                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-salmon"></span>
                        <h3 class="font-bold text-white uppercase tracking-wider text-xs">${family}</h3>
                    </div>
                    <span class="bg-white/5 border border-white/10 text-[10px] text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                        ${list.length}
                    </span>
                </div>

                <div class="flex-1 overflow-y-auto space-y-3 pr-2" style="max-height: calc(70vh - 100px); min-height: 200px;">
                    ${list.length === 0 ? `
                        <div class="border border-dashed border-white/5 rounded-2xl p-6 text-center text-xs text-slate-500">
                            Drag instruments here
                        </div>
                    ` : list.map(i => `
                        <div draggable="true"
                             data-id="${i.id}"
                             data-family="${family}"
                             ondragstart="window.handleDragStart(event, '${i.id}', '${family}')"
                             ondragover="window.handleCardDragOver(event)"
                             ondragleave="window.handleCardDragLeave(event)"
                             ondrop="window.handleCardDrop(event, '${i.id}', '${family}')"
                             class="instrument-card glass-panel p-4 rounded-2xl border-white/5 hover:border-salmon/30 transition-colors duration-200 group relative cursor-grab active:cursor-grabbing"
                             style="border-top:2px solid transparent;border-bottom:2px solid transparent;">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[18px] text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 select-none">drag_indicator</span>
                                <div class="flex-1 min-w-0">
                                    <div class="flex justify-between items-start gap-2">
                                        <p class="font-bold text-sm text-white leading-tight truncate">${i.variant || i.name}</p>
                                        <button onclick="window.deleteInstrument('${i.id}')" class="w-6 h-6 shrink-0 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <span class="material-symbols-outlined text-[14px]">delete</span>
                                        </button>
                                    </div>
                                    <div class="flex justify-between items-center text-[8px] font-black tracking-widest uppercase mt-2">
                                        <p class="text-salmon">${i.family}</p>
                                        <p class="text-slate-500">${i.name}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}


const STANDARD_FAMILIES = ['Strings', 'Woodwinds', 'Brass', 'Percussion', 'Keyboards', 'Voice', 'Rock/Pop/Jazz', 'Electronic', 'Electroacoustic'];

const STANDARD_CATEGORIES = {
    'Strings': ['Bowed', 'Plucked'],
    'Woodwinds': ['Flute', 'Oboe', 'Clarinet', 'Bassoon', 'Saxophone'],
    'Brass': ['Horn', 'Trumpet', 'Trombone', 'Tuba/Euphonium'],
    'Percussion': ['Timpani', 'Mallets', 'Membranes', 'Metal', 'Wood', 'Effects', 'World'],
    'Keyboards': ['Acoustic'],
    'Voice': ['Solo', 'Choir'],
    'Rock/Pop/Jazz': ['Electric Guitar', 'Electric Bass', 'Drum Set', 'Keyboards'],
    'Electronic': ['Hardware', 'Live Electronics'],
    'Electroacoustic': ['Fixed Media', 'Mixed', 'Acousmatic']
};

window.toggleNewFamilyInput = (val) => {
    const input = document.getElementById('new-inst-family-input');
    input.classList.toggle('hidden', val !== 'NEW');
};

window.toggleNewCategoryInput = (val) => {
    const input = document.getElementById('new-inst-category-input');
    input.classList.toggle('hidden', val !== 'NEW');
};

window.updateCategorySelect = () => {
    const familySelect = document.getElementById('new-inst-family-select');
    const categorySelect = document.getElementById('new-inst-category-select');
    const selectedFamily = familySelect.value;

    categorySelect.innerHTML = '';

    if (selectedFamily === 'NEW') {
        const opt = document.createElement('option');
        opt.value = 'NEW';
        opt.textContent = '-- Create New Category --';
        categorySelect.appendChild(opt);
        categorySelect.value = 'NEW';
    } else {
        const dbCategories = allInstruments
            .filter(i => i.family === selectedFamily)
            .map(i => i.name);
        const standardCats = STANDARD_CATEGORIES[selectedFamily] || [];
        const categories = [...new Set([...standardCats, ...dbCategories])].filter(Boolean).sort();

        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categorySelect.appendChild(opt);
        });

        const optNew = document.createElement('option');
        optNew.value = 'NEW';
        optNew.textContent = '-- Create New Category --';
        categorySelect.appendChild(optNew);

        if (categories.length > 0) {
            categorySelect.value = categories[0];
        } else {
            categorySelect.value = 'NEW';
        }
    }

    window.toggleNewFamilyInput(selectedFamily);
    window.toggleNewCategoryInput(categorySelect.value);
};

window.saveInstrument = async () => {
    const name = document.getElementById('new-inst-name').value.trim();

    if (!name) {
        alert('Please enter the instrument name.');
        return;
    }

    const { error } = await supabase.from('instruments').insert({
        name,
        family: 'Custom'
    });

    if (error) {
        alert(error.message);
        return;
    }

    closeInstrumentModal();
    document.getElementById('new-inst-name').value = '';
    await loadInstruments();
    await loadStats();
};

function showSection(sectionId) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('sidebar-item-active', 'text-white'));
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.add('text-slate-400'));

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

async function loadPieces() {
    const { data: pieces, error } = await supabase
        .from('works')
        .select(`
            id, title, subtitle, year, duration_minutes,
            scoring_category, technical_difficulty,
            composer_name,
            composer_profile_id,
            composer:composer_id(name),
            composer_profile:composer_profile_id(first_name, last_name, name),
            submitter:submitted_by(first_name, last_name, performer_name, name)
        `)
        .order('title', { ascending: true });

    if (error) {
        console.error('Failed to load pieces:', error);
        return;
    }

    allPieces = pieces || [];
    renderPieces(allPieces);
}

function renderPieces(piecesToRender) {
    const container = document.getElementById('admin-pieces-table');
    if (!container) return;

    if (!piecesToRender || piecesToRender.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" class="px-8 py-8 text-center text-slate-500 text-sm">
                    No pieces found
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = piecesToRender.map(p => {
        const composerName = p.composer_name
            || (p.composer_profile ? (p.composer_profile.name || `${p.composer_profile.first_name || ''} ${p.composer_profile.last_name || ''}`.trim()) : '')
            || p.composer?.name
            || 'Unknown Composer';
        const submitterProfile = p.submitter;
        let submitterName = 'System / Admin';
        if (submitterProfile) {
            submitterName = `${submitterProfile.first_name || ''} ${submitterProfile.last_name || ''}`.trim() 
                || submitterProfile.performer_name 
                || submitterProfile.name 
                || 'Anonymous User';
        }
        const yearVal = p.year || 'N/A';
        const durationVal = p.duration_minutes ? `${p.duration_minutes} min` : 'N/A';
        const categoryVal = p.scoring_category || 'N/A';
        const difficultyVal = p.technical_difficulty || 'N/A';

        // Difficulty badge color class
        let diffColor = 'bg-slate-800 text-slate-400';
        if (difficultyVal.toLowerCase() === 'student') diffColor = 'bg-emerald-500/10 text-emerald-400';
        else if (difficultyVal.toLowerCase() === 'advanced') diffColor = 'bg-amber-500/10 text-amber-400';
        else if (difficultyVal.toLowerCase() === 'professional') diffColor = 'bg-rose-500/10 text-rose-400';

        return `
            <tr class="hover:bg-white/2 transition-colors">
                <td class="px-8 py-4">
                    <div>
                        <p class="text-sm font-bold text-white">${p.title}</p>
                        ${p.subtitle ? `<p class="text-[10px] text-slate-500">${p.subtitle}</p>` : ''}
                    </div>
                </td>
                <td class="px-8 py-4 text-sm text-slate-300">
                    ${composerName}
                </td>
                <td class="px-8 py-4 text-sm text-slate-400">
                    ${submitterName}
                </td>
                <td class="px-8 py-4 text-xs text-slate-400">
                    ${yearVal} / ${durationVal}
                </td>
                <td class="px-8 py-4">
                    <div class="flex flex-wrap gap-1.5 font-sans">
                        <span class="badge ${diffColor}">${difficultyVal}</span>
                        <span class="badge bg-slate-800 text-slate-400">${categoryVal}</span>
                    </div>
                </td>
                <td class="px-8 py-4 text-right">
                    <button onclick="window.deletePiece('${p.id}')" title="Delete Piece" class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.filterPieces = (query) => {
    const q = query.toLowerCase().trim();
    if (!q) {
        renderPieces(allPieces);
        return;
    }
    const filtered = allPieces.filter(p => {
        const titleMatch = p.title?.toLowerCase().includes(q);
        const subtitleMatch = p.subtitle?.toLowerCase().includes(q);
        const composerMatch = p.composer?.name?.toLowerCase().includes(q);
        
        let submitterName = '';
        if (p.submitter) {
            submitterName = `${p.submitter.first_name || ''} ${p.submitter.last_name || ''}`.trim()
                || p.submitter.performer_name
                || p.submitter.name
                || '';
        }
        const submitterMatch = submitterName.toLowerCase().includes(q);

        return titleMatch || subtitleMatch || composerMatch || submitterMatch;
    });
    renderPieces(filtered);
};

window.deletePiece = async (pieceId) => {
    if (!confirm('Are you sure you want to permanently delete this piece from the catalog? This action cannot be undone.')) {
        return;
    }

    const { error } = await supabase
        .from('works')
        .delete()
        .eq('id', pieceId);

    if (error) {
        alert('Error deleting piece: ' + error.message);
    } else {
        await loadPieces();
        await loadStats(); // Reload stats as works count has changed
    }
};

let draggedInstrumentId = null;
let draggedInstrumentFamily = null;

window.handleDragStart = (event, instrumentId, family) => {
    draggedInstrumentId = String(instrumentId);
    draggedInstrumentFamily = family;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', instrumentId);
    const el = event.currentTarget;
    setTimeout(() => { el.style.opacity = '0.4'; }, 0);
    document.addEventListener('dragend', () => { el.style.opacity = ''; }, { once: true });
};

// ── Column-level events (highlight whole column when hovering) ──
window.handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
};

window.handleDragEnter = (event) => {
    if (!event.target.closest('.instrument-card')) {
        event.currentTarget.classList.add('bg-salmon/5', 'border-salmon/30');
    }
};

window.handleDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
        event.currentTarget.classList.remove('bg-salmon/5', 'border-salmon/30');
    }
};

window.saveFamilyOrder = async (family) => {
    const order = familyOrder[family];
    if (!order) return;
    
    for (let i = 0; i < order.length; i++) {
        const { error } = await supabase.from('instruments').update({ sort_order: i }).eq('id', order[i]);
        if (error && (error.message.includes('sort_order') || error.code === '42703')) {
            console.warn("The 'sort_order' column does not exist in Supabase yet. Run the SQL script to enable persistence.");
            break;
        }
    }
};

/** Drop on column background (empty space) — move to end of that family */
window.handleColumnDrop = async (event, targetFamily) => {
    if (event.target.closest('.instrument-card')) return;
    event.preventDefault();
    const col = event.currentTarget;
    col.classList.remove('bg-salmon/5', 'border-salmon/30');

    const srcId = parseInt(draggedInstrumentId, 10);
    const inst = allInstruments.find(i => i.id === srcId);
    if (!inst) return;

    const oldFamily = inst.family;
    if (oldFamily === targetFamily) return;

    if (familyOrder[oldFamily]) {
        familyOrder[oldFamily] = familyOrder[oldFamily].filter(id => id !== srcId);
    }
    inst.family = targetFamily;
    if (!familyOrder[targetFamily]) {
        familyOrder[targetFamily] = allInstruments.filter(i => i.family === targetFamily).map(i => i.id);
    } else {
        familyOrder[targetFamily].push(srcId);
    }
    renderInstrumentBoard();

    const { error } = await supabase.from('instruments').update({ family: targetFamily }).eq('id', srcId);
    if (error) { 
        alert('Error: ' + error.message); 
        await loadInstruments(); 
    } else {
        await saveFamilyOrder(oldFamily);
        await saveFamilyOrder(targetFamily);
    }
};

// ── Card-level drag events (within-column vertical reordering) ──
window.handleCardDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const isAbove = event.clientY < rect.top + rect.height / 2;
    card.style.borderTop    = isAbove  ? '2px solid #E57373' : '2px solid transparent';
    card.style.borderBottom = !isAbove ? '2px solid #E57373' : '2px solid transparent';
};

window.handleCardDragLeave = (event) => {
    event.currentTarget.style.borderTop    = '2px solid transparent';
    event.currentTarget.style.borderBottom = '2px solid transparent';
};

window.handleCardDrop = async (event, targetId, targetFamily) => {
    event.preventDefault();
    event.stopPropagation();
    const card = event.currentTarget;
    card.style.borderTop    = '2px solid transparent';
    card.style.borderBottom = '2px solid transparent';

    const srcId = parseInt(draggedInstrumentId, 10);
    const tgtId = parseInt(targetId, 10);
    if (srcId === tgtId) return;

    const rect = card.getBoundingClientRect();
    const insertAfter = event.clientY >= rect.top + rect.height / 2;
    const srcInst = allInstruments.find(i => i.id === srcId);
    if (!srcInst) return;

    const oldFamily = srcInst.family;

    if (oldFamily === targetFamily) {
        // Reorder within same column
        if (!familyOrder[targetFamily]) {
            familyOrder[targetFamily] = allInstruments.filter(i => i.family === targetFamily).map(i => i.id);
        }
        const order = familyOrder[targetFamily];
        const fromIdx = order.indexOf(srcId);
        order.splice(fromIdx, 1);
        let toIdx = order.indexOf(tgtId);
        if (insertAfter) toIdx++;
        order.splice(toIdx, 0, srcId);
        familyOrder[targetFamily] = order;
        renderInstrumentBoard();
        
        await saveFamilyOrder(targetFamily);
    } else {
        // Move to different column at the target card's position
        if (familyOrder[oldFamily]) {
            familyOrder[oldFamily] = familyOrder[oldFamily].filter(id => id !== srcId);
        }
        srcInst.family = targetFamily;
        if (!familyOrder[targetFamily]) {
            familyOrder[targetFamily] = allInstruments.filter(i => i.family === targetFamily).map(i => i.id);
        }
        const order = familyOrder[targetFamily];
        let toIdx = order.indexOf(tgtId);
        if (toIdx === -1) { order.push(srcId); }
        else { if (insertAfter) toIdx++; order.splice(toIdx, 0, srcId); }
        familyOrder[targetFamily] = order;
        renderInstrumentBoard();

        const { error } = await supabase.from('instruments').update({ family: targetFamily }).eq('id', srcId);
        if (error) { 
            alert('Error: ' + error.message); 
            await loadInstruments(); 
        } else {
            await saveFamilyOrder(oldFamily);
            await saveFamilyOrder(targetFamily);
        }
    }
};


window.deleteInstrument = async (instrumentId) => {
    if (!confirm('Are you sure you want to permanently delete this instrument from the catalog? This action cannot be undone.')) {
        return;
    }

    // Optimistic delete
    allInstruments = allInstruments.filter(i => i.id != instrumentId);
    renderInstrumentBoard();

    const { error } = await supabase
        .from('instruments')
        .delete()
        .eq('id', instrumentId);

    if (error) {
        alert('Error deleting instrument: ' + error.message);
        await loadInstruments(); // Reload if failed
    }
};

window.showSection = showSection;
window.openInstrumentModal = () => {
    const modal = document.getElementById('instrument-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const familySelect = document.getElementById('new-inst-family-select');
    familySelect.innerHTML = '';

    const uniqueFamilies = [...new Set(allInstruments.map(i => i.family))].filter(Boolean);
    const combinedFamilies = [...new Set([...STANDARD_FAMILIES, ...uniqueFamilies])].sort();

    combinedFamilies.forEach(fam => {
        const opt = document.createElement('option');
        opt.value = fam;
        opt.textContent = fam;
        familySelect.appendChild(opt);
    });

    const optNew = document.createElement('option');
    optNew.value = 'NEW';
    optNew.textContent = '-- Create New Family --';
    familySelect.appendChild(optNew);

    if (combinedFamilies.includes('Strings')) {
        familySelect.value = 'Strings';
    } else if (combinedFamilies.length > 0) {
        familySelect.value = combinedFamilies[0];
    } else {
        familySelect.value = 'NEW';
    }

    document.getElementById('new-inst-family-input').value = '';
    document.getElementById('new-inst-category-input').value = '';
    document.getElementById('new-inst-name').value = '';

    window.updateCategorySelect();
};
window.closeInstrumentModal = () => document.getElementById('instrument-modal').classList.add('hidden') || document.getElementById('instrument-modal').classList.remove('flex');

document.addEventListener('DOMContentLoaded', init);
