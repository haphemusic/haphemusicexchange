import supabase from './supabase.js';

let currentUser = null;

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
    document.getElementById('admin-stat-active').textContent = active || 0;
    document.getElementById('admin-stat-works').textContent = works || 0;

    await drawRegistrationChart();
}

async function drawRegistrationChart() {
    const { data: users } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true });
        
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
        if (!u.created_at) return;
        const dateStr = u.created_at.split('T')[0];
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
    const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('admin-user-table');
    
    if (!users) return;

    container.innerHTML = users.map(u => {
        const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.name || 'Anonymous User';
        const avatar = u.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=E57373&color=fff`;
        return `
            <tr class="hover:bg-white/2 transition-colors">
                <td class="px-8 py-4">
                    <div class="flex items-center gap-3">
                        <img src="${avatar}" class="w-8 h-8 rounded-full object-cover">
                        <div>
                            <p class="text-sm font-bold text-white">${fullName}</p>
                            <p class="text-[10px] text-slate-500">${u.id.substring(0,8)}</p>
                        </div>
                    </div>
                </td>
                <td class="px-8 py-4">
                    <span class="badge bg-slate-800 text-slate-400">${u.role}</span>
                </td>
                <td class="px-8 py-4 text-xs text-slate-400">${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
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
    const container = document.getElementById('instrument-grid');
    
    if (!instruments) return;

    container.innerHTML = instruments.map(i => `
        <div class="glass-panel p-6 rounded-3xl space-y-2 border-white/5 hover:border-salmon/30 transition-all">
            <div class="flex justify-between items-start gap-3">
                <p class="font-bold text-white leading-tight">${i.variant || i.name}</p>
                <span class="material-symbols-outlined text-slate-600 flex-shrink-0">music_note</span>
            </div>
            <div class="flex justify-between items-center text-[9px] font-black tracking-widest uppercase">
                <p class="text-salmon">${i.family}</p>
                <p class="text-slate-500">${i.name}</p>
            </div>
        </div>
    `).join('');
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
    const name = document.getElementById('new-inst-name').value;
    const familySelect = document.getElementById('new-inst-family-select').value;
    const familyNew = document.getElementById('new-inst-family-input').value;
    
    const categorySelect = document.getElementById('new-inst-category-select').value;
    const categoryNew = document.getElementById('new-inst-category-input').value;
    
    const family = familySelect === 'NEW' ? familyNew : familySelect;
    const category = categorySelect === 'NEW' ? categoryNew : categorySelect;

    if (!name || !family || !category) return alert("Instrument Name, Family and Category are required");

    const { error } = await supabase.from('instruments').insert({ 
        name: category, 
        family, 
        variant: name 
    });

    if (error) alert(error.message);
    else {
        closeInstrumentModal();
        await loadInstruments();
    }
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


window.showSection = showSection;
window.openInstrumentModal = () => document.getElementById('instrument-modal').classList.remove('hidden', 'flex') || document.getElementById('instrument-modal').classList.add('flex');
window.closeInstrumentModal = () => document.getElementById('instrument-modal').classList.add('hidden') || document.getElementById('instrument-modal').classList.remove('flex');

document.addEventListener('DOMContentLoaded', init);
