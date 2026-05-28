import supabase from './supabase.js';

let currentUser = null;
let allPieces = [];
let allInstruments = [];

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
    const container = document.getElementById('admin-user-table');
    
    if (!users) return;

    container.innerHTML = users.map(u => {
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

async function loadInstruments() {
    const { data: instruments } = await supabase.from('instruments').select('*').order('family', { ascending: true });
    if (!instruments) return;
    allInstruments = instruments;
    renderInstrumentBoard();
}

function renderInstrumentBoard() {
    const container = document.getElementById('instrument-board');
    if (!container) return;

    // Group instruments by family
    const grouped = {};
    const families = [...new Set(allInstruments.map(i => i.family))].sort();
    
    families.forEach(f => {
        grouped[f] = [];
    });
    
    allInstruments.forEach(i => {
        if (grouped[i.family]) {
            grouped[i.family].push(i);
        }
    });

    container.innerHTML = families.map(family => {
        const list = grouped[family] || [];
        return `
            <div class="flex-shrink-0 w-80 bg-slate-950/40 rounded-3xl border border-white/5 p-6 flex flex-col max-h-[70vh] transition-all duration-300" 
                 ondragover="window.handleDragOver(event)"
                 ondragenter="window.handleDragEnter(event)"
                 ondragleave="window.handleDragLeave(event)"
                 ondrop="window.handleDrop(event, '${family}')">
                
                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-salmon"></span>
                        <h3 class="font-bold text-white uppercase tracking-wider text-xs">${family}</h3>
                    </div>
                    <span class="bg-white/5 border border-white/10 text-[10px] text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                        ${list.length}
                    </span>
                </div>

                <div class="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent" style="max-height: calc(70vh - 100px); min-height: 200px;">
                    ${list.length === 0 ? `
                        <div class="border border-dashed border-white/5 rounded-2xl p-6 text-center text-xs text-slate-500">
                            Drag instruments here
                        </div>
                    ` : list.map(i => `
                        <div draggable="true" 
                             ondragstart="window.handleDragStart(event, '${i.id}')"
                             class="glass-panel p-5 rounded-2xl space-y-2 border-white/5 hover:border-salmon/30 cursor-grab active:cursor-grabbing transition-all duration-200 group relative">
                            
                            <div class="flex justify-between items-start gap-3">
                                <p class="font-bold text-sm text-white leading-tight">${i.variant || i.name}</p>
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onclick="window.deleteInstrument('${i.id}')" class="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center">
                                        <span class="material-symbols-outlined text-[14px]">delete</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="flex justify-between items-center text-[8px] font-black tracking-widest uppercase mt-2">
                                <p class="text-salmon font-bold">${i.family}</p>
                                <p class="text-slate-500">${i.name}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

window.toggleNewFamilyInput = (val) => {
    const input = document.getElementById('new-inst-family-input');
    input.classList.toggle('hidden', val !== 'NEW');
};

window.toggleNewCategoryInput = (val) => {
    const input = document.getElementById('new-inst-category-input');
    input.classList.toggle('hidden', val !== 'NEW');
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
            composer:composer_id(name),
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
        const composerName = p.composer?.name || 'Unknown Composer';
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

window.handleDragStart = (event, instrumentId) => {
    draggedInstrumentId = instrumentId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', instrumentId);
    
    // Add visual effect to the dragged element
    const element = event.currentTarget;
    element.classList.add('opacity-40');
    setTimeout(() => element.classList.remove('opacity-40'), 0);
};

window.handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
};

window.handleDragEnter = (event) => {
    const col = event.currentTarget;
    col.classList.add('bg-salmon/5', 'border-salmon/30');
};

window.handleDragLeave = (event) => {
    const col = event.currentTarget;
    col.classList.remove('bg-salmon/5', 'border-salmon/30');
};

window.handleDrop = async (event, targetFamily) => {
    event.preventDefault();
    const col = event.currentTarget;
    col.classList.remove('bg-salmon/5', 'border-salmon/30');
    
    const instrumentId = draggedInstrumentId || event.dataTransfer.getData('text/plain');
    if (!instrumentId) return;

    // Find the instrument in allInstruments
    const inst = allInstruments.find(i => i.id == instrumentId);
    if (!inst) return;
    
    if (inst.family === targetFamily) return; // Same family, no change needed

    // Update family in local memory first for instant UI response
    inst.family = targetFamily;
    renderInstrumentBoard();

    // Update in Supabase
    const { error } = await supabase
        .from('instruments')
        .update({ family: targetFamily })
        .eq('id', instrumentId);

    if (error) {
        alert('Error updating instrument family: ' + error.message);
        await loadInstruments(); // Reload to revert UI if failed
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
window.openInstrumentModal = () => document.getElementById('instrument-modal').classList.remove('hidden', 'flex') || document.getElementById('instrument-modal').classList.add('flex');
window.closeInstrumentModal = () => document.getElementById('instrument-modal').classList.add('hidden') || document.getElementById('instrument-modal').classList.remove('flex');

document.addEventListener('DOMContentLoaded', init);
