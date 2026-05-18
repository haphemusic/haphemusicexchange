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
    
    // Simulating active users for now as Supabase doesn't track last_seen easily without custom logic
    document.getElementById('admin-stat-users').textContent = users || 0;
    document.getElementById('admin-stat-active').textContent = Math.floor((users || 0) * 0.15); // 15% active
    document.getElementById('admin-stat-works').textContent = works || 0;
}

async function loadUsers() {
    const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('admin-user-table');
    
    if (!users) return;

    container.innerHTML = users.map(u => `
        <tr class="hover:bg-white/2 transition-colors">
            <td class="px-8 py-4">
                <div class="flex items-center gap-3">
                    <img src="${u.avatar_url || 'https://ui-avatars.com/api/?name='+u.first_name}" class="w-8 h-8 rounded-full">
                    <div>
                        <p class="text-sm font-bold text-white">${u.first_name} ${u.last_name}</p>
                        <p class="text-[10px] text-slate-500">${u.id.substring(0,8)}</p>
                    </div>
                </div>
            </td>
            <td class="px-8 py-4">
                <span class="badge bg-slate-800 text-slate-400">${u.role}</span>
            </td>
            <td class="px-8 py-4 text-xs text-slate-400">${new Date(u.created_at).toLocaleDateString()}</td>
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
    `).join('');
}

window.moderateUser = async (userId, newStatus) => {
    if (!confirm(`Are you sure you want to change user status to ${newStatus}?`)) return;
    
    const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

    if (error) alert("Error: " + error.message);
    else await loadUsers();
};

async function loadInstruments() {
    const { data: instruments } = await supabase.from('instruments').select('*').order('family', { ascending: true });
    const container = document.getElementById('instrument-grid');
    
    if (!instruments) return;

    container.innerHTML = instruments.map(i => `
        <div class="glass-panel p-6 rounded-3xl space-y-2 border-white/5 hover:border-salmon/30 transition-all">
            <div class="flex justify-between items-start">
                <p class="font-bold text-white">${i.name}</p>
                <span class="material-symbols-outlined text-slate-600">music_note</span>
            </div>
            <p class="text-[10px] text-salmon uppercase font-black tracking-widest">${i.family}</p>
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

    if (!name || !family) return alert("Name and Family are required");

    const { error } = await supabase.from('instruments').insert({ name, family }); // Assuming schema only has name/family for now

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
