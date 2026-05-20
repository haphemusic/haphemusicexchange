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
        .eq('composer_id', currentUser.id)
        .eq('status', 'validated');

    const { count: pendingCount } = await supabase
        .from('works')
        .select('*', { count: 'exact', head: true })
        .eq('composer_id', currentUser.id)
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
        .eq('composer_id', currentUser.id)
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
        .select('*')
        .eq('composer_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (!works || works.length === 0) {
        container.innerHTML = '<p class="text-[10px] text-slate-500 uppercase font-bold text-center py-4">No works registered</p>';
        return;
    }

    container.innerHTML = works.map(w => `
        <div class="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group">
            <div>
                <p class="text-xs font-bold text-white group-hover:text-salmon transition-colors">${w.title}</p>
                <p class="text-[9px] text-slate-500 uppercase tracking-widest">${w.year} • ${w.status}</p>
            </div>
            ${w.status === 'validated' ? '<span class="material-symbols-outlined text-emerald-400 text-sm">verified</span>' : '<span class="material-symbols-outlined text-amber-400 text-sm">pending</span>'}
        </div>
    `).join('');
}

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

// UI Functions
window.showSection = showSection;

window.openWorkModal = () => {
    document.getElementById('work-modal').classList.remove('hidden');
    document.getElementById('work-modal').classList.add('flex');
};

window.closeWorkModal = () => {
    document.getElementById('work-modal').classList.add('hidden');
    document.getElementById('work-modal').classList.remove('flex');
};

window.saveWork = async () => {
    const title = document.getElementById('work-title').value;
    const year = document.getElementById('work-year').value;
    const link = document.getElementById('work-link').value;

    if (!title) return alert("Title is required");

    const { error } = await supabase
        .from('works')
        .insert({
            title,
            year: parseInt(year),
            composer_id: currentUser.id,
            submitted_by: currentUser.id,
            status: 'validated' // Since the composer is uploading it, it's auto-validated
        });

    if (error) {
        alert("Error saving work: " + error.message);
    } else {
        closeWorkModal();
        await loadStats();
        await loadMyWorks();
        // Reset form
        document.getElementById('work-title').value = '';
        document.getElementById('work-link').value = '';
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
