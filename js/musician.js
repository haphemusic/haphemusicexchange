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
    await loadSubmissions();

    const hash = window.location.hash.substring(1) || 'overview';
    showSection(hash);

    document.getElementById('top-search-input')?.addEventListener('input', (e) => {
        filterSubmissions(e.target.value.toLowerCase().trim());
    });
}

async function loadUserProfile() {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (profile) {
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Performer/Ensemble';
        document.getElementById('user-name').textContent = name;
        document.getElementById('welcome-name').textContent = name;

        if (profile.avatar_url) {
            document.getElementById('user-avatar').src = profile.avatar_url;
        } else {
            document.getElementById('user-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E57373&color=fff`;
        }
    }
}

async function loadStats() {
    const { data: submissions } = await supabase
        .from('performances')
        .select('status')
        .eq('performer_id', currentUser.id);

    const total = submissions?.length || 0;
    const accepted = submissions?.filter(s => s.status === 'validated').length || 0;
    const rate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-accepted').textContent = accepted;
    document.getElementById('stat-rate').textContent = rate + '%';
}

let allSubmissions = [];

const getComposerName = (work) => {
    if (!work) return 'Unknown';
    if (work.composer_name) return work.composer_name;
    if (work.composer_profile) {
        return work.composer_profile.name || `${work.composer_profile.first_name || ''} ${work.composer_profile.last_name || ''}`.trim() || 'Unknown';
    }
    if (work.composer?.name) return work.composer.name;
    if (work.profiles) {
        return `${work.profiles.first_name || ''} ${work.profiles.last_name || ''}`.trim() || 'Unknown';
    }
    return 'Unknown';
};

const getVisibilityIcon = (isHidden) => {
    return isHidden
        ? `<span class="material-symbols-outlined text-slate-500" style="font-size:18px; line-height:1;" title="Hidden from public">visibility_off</span>`
        : `<span class="material-symbols-outlined text-emerald-400" style="font-size:18px; line-height:1;" title="Visible to public">visibility</span>`;
};

function renderSubmissions(submissions) {
    const tableBody = document.getElementById('recent-table-body');
    const fullList = document.getElementById('full-submissions-list');

    if (!submissions || submissions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-10 text-center text-slate-500">No submissions found.</td></tr>';
        fullList.innerHTML = '<p class="text-slate-500">No interpretations match your search.</p>';
        return;
    }

    // Render table (Top 5)
    tableBody.innerHTML = submissions.slice(0, 5).map(s => {
        const isHidden = s.hide_public === true;
        return `
        <tr class="hover:bg-white/2 transition-colors">
            <td class="px-6 py-4 font-bold text-white text-sm">
                <div class="inline-flex items-center gap-2">
                    ${getVisibilityIcon(isHidden)}
                    <span>${s.work?.title || 'Unknown Work'}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-slate-400 text-sm">${getComposerName(s.work)}</td>
            <td class="px-6 py-4">
                <span class="status-badge ${getStatusClass(s.status)}">${s.status}</span>
            </td>
            <td class="px-6 py-4 text-right flex items-center justify-end gap-2">
                <button onclick="openEditSubmission(${s.id})" class="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 p-2 rounded-xl transition-all flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm">edit</span>
                </button>
                <button onclick="deletePerformance(${s.id})" class="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-2 rounded-xl transition-all flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </td>
        </tr>
        `;
    }).join('');

    // Render full cards
    fullList.innerHTML = submissions.map(s => {
        const isHidden = s.hide_public === true;
        return `
        <div class="glass-panel p-6 rounded-3xl space-y-3 relative group">
            <div class="flex justify-between items-start">
                <div>
                    <div class="inline-flex items-center gap-2">
                        ${getVisibilityIcon(isHidden)}
                        <h4 class="font-bold text-white">${s.work?.title || 'Unknown Work'}</h4>
                    </div>
                    <p class="text-xs text-slate-500 mt-2">Composer: ${getComposerName(s.work)}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="status-badge ${getStatusClass(s.status)}">${s.status}</span>
                    <button onclick="openEditSubmission(${s.id})" class="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 p-1.5 rounded-lg transition-all">
                        <span class="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onclick="deletePerformance(${s.id})" class="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1.5 rounded-lg transition-all">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            </div>
            <div class="pt-2 flex justify-between">
                <div>
                    <p class="text-[10px] text-slate-500 uppercase font-bold">Performance Date</p>
                    <p class="text-xs text-white">${s.performance_date ? s.performance_date.split('-').reverse().join('/') : 'N/A'}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] text-slate-500 uppercase font-bold">Location</p>
                    <p class="text-xs text-white">${s.city || 'N/A'}</p>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

async function loadSubmissions() {
    const { data: submissions, error } = await supabase
        .from('performances')
        .select(`
            *,
            work:work_id (
                title,
                composer_name,
                composer_profile_id,
                composer:composer_id (name),
                composer_profile:composer_profile_id(first_name, last_name, name),
                profiles:submitted_by (first_name, last_name)
            )
        `)
        .eq('performer_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading submissions:", error);
        return;
    }

    allSubmissions = submissions || [];

    const searchVal = document.getElementById('top-search-input')?.value.toLowerCase().trim() || '';
    if (searchVal) {
        filterSubmissions(searchVal);
    } else {
        renderSubmissions(allSubmissions);
    }
}

function filterSubmissions(query) {
    if (!query) {
        renderSubmissions(allSubmissions);
        return;
    }
    const filtered = allSubmissions.filter(s => {
        const title = (s.work?.title || '').toLowerCase();
        const composer = getComposerName(s.work).toLowerCase();
        const event = (s.event_name || '').toLowerCase();
        const city = (s.city || '').toLowerCase();
        const venue = (s.venue || '').toLowerCase();
        return title.includes(query) || composer.includes(query) || event.includes(query) || city.includes(query) || venue.includes(query);
    });
    renderSubmissions(filtered);
}

let editingPerformanceId = null;

function resetSubmissionForm() {
    editingPerformanceId = null;
    document.getElementById('submission-modal-title').textContent = 'Register Interpretation';
    document.getElementById('submission-submit-btn').textContent = 'Submit for Validation';
    document.getElementById('search-work-input').value = '';
    document.getElementById('selected-work-id').value = '';
    document.getElementById('selected-title').textContent = '---';
    document.getElementById('selected-composer').textContent = '---';
    document.getElementById('selected-work-info').classList.add('hidden');
    document.getElementById('perf-date').value = '';
    document.getElementById('perf-event').value = '';
    document.getElementById('perf-premiere').value = 'Standard Performance';
    document.getElementById('perf-ensemble').value = '';
    document.getElementById('perf-conductor').value = '';
    document.getElementById('perf-venue').value = '';
    document.getElementById('perf-city').value = '';
    document.getElementById('perf-country').value = '';
    document.getElementById('perf-link').value = '';
    document.getElementById('perf-photo').value = '';
    document.getElementById('perf-notes').value = '';
    document.getElementById('perf-feedback').value = '';
    document.getElementById('perf-hide-public').checked = false;
    
    document.getElementById('search-work-composer').value = '';
    const manualComposerField = document.getElementById('manual-composer-field');
    if (manualComposerField) manualComposerField.classList.remove('hidden');
}

function getStatusClass(status) {
    switch (status) {
        case 'validated': return 'bg-emerald-500/20 text-emerald-400';
        case 'pending': return 'bg-amber-500/20 text-amber-400';
        case 'rejected': return 'bg-rose-500/20 text-rose-400';
        default: return 'bg-slate-500/20 text-slate-400';
    }
}

// Global search in modal
let searchTimeout;
window.searchWorks = async (query) => {
    const resultsDiv = document.getElementById('search-results');
    if (query.length < 2) {
        resultsDiv.classList.add('hidden');
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const { data: works } = await supabase
            .from('works')
            .select(`
                *,
                composer_name,
                composer_profile_id,
                composer:composer_id (name),
                composer_profile:composer_profile_id(first_name, last_name, name)
            `)
            .ilike('title', `%${query}%`)
            .eq('status', 'validated') // Only search for works already validated by composers
            .limit(5);

        if (works && works.length > 0) {
            resultsDiv.innerHTML = works.map(w => {
                const composerName = w.composer_name
                    || (w.composer_profile ? (w.composer_profile.name || `${w.composer_profile.first_name || ''} ${w.composer_profile.last_name || ''}`.trim()) : '')
                    || w.composer?.name
                    || 'Unknown';
                return `
                <div onclick="selectWork(${w.id}, '${w.title.replace(/'/g, "\\'")}', '${composerName.replace(/'/g, "\\'")}')" class="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0">
                    <p class="text-sm font-bold text-white">${w.title}</p>
                    <p class="text-[10px] text-slate-500 uppercase">${composerName}</p>
                </div>
            `}).join('');
            resultsDiv.classList.remove('hidden');
        } else {
            resultsDiv.innerHTML = '<p class="p-3 text-xs text-slate-500">No results found</p>';
            resultsDiv.classList.remove('hidden');
        }
    }, 300);
};

window.selectWork = (id, title, composer) => {
    document.getElementById('selected-work-id').value = id;
    document.getElementById('selected-title').textContent = title;
    document.getElementById('selected-composer').textContent = composer;
    document.getElementById('selected-work-info').classList.remove('hidden');
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('search-work-input').value = '';
    
    const manualComposerField = document.getElementById('manual-composer-field');
    if (manualComposerField) manualComposerField.classList.add('hidden');
};

window.submitInterpretation = async () => {
    if (window.currentUserStatus === 'suspended') {
        alert("Tu cuenta está suspendida. No puedes registrar o modificar interpretaciones.");
        return;
    }
    let workId = document.getElementById('selected-work-id').value;
    const searchInput = document.getElementById('search-work-input').value.trim();

    if (!workId && !searchInput) {
        alert("Please select a work from the archive or type a new work title.");
        return;
    }

    if (!workId && searchInput) {
        // Try to find if it exists first
        const { data: existingWorks } = await supabase
            .from('works')
            .select('id')
            .ilike('title', searchInput)
            .limit(1);

        if (existingWorks && existingWorks.length > 0) {
            workId = existingWorks[0].id;
        } else {
            // Create a new work
            const composerNameVal = document.getElementById('search-work-composer').value.trim() || null;
            const { data: newWork, error: newWorkError } = await supabase
                .from('works')
                .insert({ 
                    title: searchInput, 
                    composer_name: composerNameVal,
                    status: 'pending', 
                    submitted_by: currentUser.id 
                })
                .select('id')
                .single();

            if (newWorkError) {
                alert("Error creating new work. You might not have permission, or check database settings: " + newWorkError.message);
                return;
            }
            workId = newWork.id;
        }
    }
    const date = document.getElementById('perf-date').value;
    const event = document.getElementById('perf-event').value;
    const premiere = document.getElementById('perf-premiere').value;
    const ensemble = document.getElementById('perf-ensemble').value;
    const conductor = document.getElementById('perf-conductor').value;
    const venue = document.getElementById('perf-venue').value;
    const city = document.getElementById('perf-city').value;
    const country = document.getElementById('perf-country').value;
    const link = document.getElementById('perf-link').value;
    const photo = document.getElementById('perf-photo').value;
    const notes = document.getElementById('perf-notes').value;
    const feedback = document.getElementById('perf-feedback').value;
    const hidePublic = document.getElementById('perf-hide-public').checked;

    if (!workId) return alert("Please select a work from the archive.");
    if (!date) return alert("Please select a performance date.");

    const performanceData = {
        work_id: workId,
        performance_date: date,
        event_name: event,
        venue: venue,
        city: city,
        country: country,
        premiere_status: premiere,
        ensemble_name: ensemble,
        conductor: conductor,
        recording_link: link,
        photo_link: photo,
        program_notes: notes,
        performance_note: feedback,
        hide_public: hidePublic
    };

    let error;
    if (editingPerformanceId) {
        const response = await supabase
            .from('performances')
            .update(performanceData)
            .eq('id', editingPerformanceId);
        error = response.error;
    } else {
        const response = await supabase
            .from('performances')
            .insert({
                ...performanceData,
                performer_id: currentUser.id,
                status: 'pending'
            });
        error = response.error;
    }

    if (error) {
        alert("Error submitting: " + error.message);
    } else {
        const successMessage = editingPerformanceId ? "Interpretation updated successfully." : "Interpretation submitted! The composer will be notified.";
        alert(successMessage);
        closeSubmissionModal();
        resetSubmissionForm();

        await loadStats();
        await loadSubmissions();
    }
};
window.toggleExcelImportPanel = () => {
    const panel = document.getElementById('excel-import-panel');
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
};

window.processCSV = (event) => {
    if (window.currentUserStatus === 'suspended') {
        alert("Tu cuenta está suspendida. No puedes importar interpretaciones.");
        event.target.value = '';
        return;
    }
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('csv-import-status');
    statusEl.style.display = 'flex';
    statusEl.innerHTML = `<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> <span>Processing spreadsheet...</span>`;
    statusEl.style.color = '#d4e4fa';

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
            
            // Convert sheet to JSON array of objects
            const rows = XLSX.utils.sheet_to_json(worksheet);
            if (!rows || rows.length === 0) {
                statusEl.innerHTML = `<span class="material-symbols-outlined text-[16px] text-rose-400">error</span> <span>The file seems to be empty.</span>`;
                statusEl.style.color = '#E57373';
                return;
            }

            let successCount = 0;
            let failCount = 0;

            for (const row of rows) {
                // Find work_id by title
                const title = row['Work Title'] || row['Title'] || row['work_title'] || row['Work'];
                if (!title) { failCount++; continue; }

                let workId;
                const { data: works } = await supabase
                    .from('works')
                    .select('id')
                    .ilike('title', '%' + title + '%')
                    .limit(1);

                const composerNameVal = row['Composer Name'] || row['Composer'] || row['composer'] || row['composer_name'] || row['Nombre Compositor'] || null;

                if (!works || works.length === 0) {
                    console.log(`Work not found, creating: ${title}`);
                    const { data: newWork, error: newWorkError } = await supabase
                        .from('works')
                        .insert({ 
                            title: title, 
                            composer_name: composerNameVal,
                            status: 'pending', 
                            submitted_by: currentUser.id 
                        })
                        .select('id')
                        .single();

                    if (newWorkError || !newWork) {
                        console.error(`Failed to create work ${title}:`, newWorkError);
                        failCount++;
                        continue;
                    }
                    workId = newWork.id;
                } else {
                    workId = works[0].id;
                }

                // Format date if needed, basic check
                let perfDate = row['Performance Date'] || row['Date'] || row['performance_date'];
                if (perfDate) {
                    perfDate = perfDate.toString().trim();
                    if (perfDate.includes('/')) {
                        // Try to convert DD/MM/YYYY to YYYY-MM-DD
                        const parts = perfDate.split('/');
                        if (parts.length === 3 && parts[2].length === 4) {
                            perfDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        }
                    }
                }

                const { error } = await supabase
                    .from('performances')
                    .insert({
                        work_id: workId,
                        performer_id: currentUser.id,
                        performance_date: perfDate || null,
                        event_name: row['Event / Festival Name'] || row['Event'] || row['event_name'] || null,
                        venue: row['Venue'] || row['venue'] || null,
                        city: row['City'] || row['city'] || null,
                        country: row['Country'] || row['country'] || null,
                        premiere_status: row['Premiere Status'] || row['premiere_status'] || 'Standard Performance',
                        ensemble_name: row['Ensemble / Soloist Name'] || row['Ensemble'] || row['ensemble_name'] || null,
                        conductor: row['Conductor'] || row['conductor'] || null,
                        recording_link: row['Live Recording Link'] || row['Link'] || row['recording_link'] || null,
                        photo_link: row['Photo / Poster'] || row['photo_link'] || null,
                        program_notes: row['Program Notes (Used)'] || row['Notes'] || row['program_notes'] || null,
                        performance_note: row['Performance Note'] || row['Feedback'] || row['performance_note'] || null,
                        status: 'pending'
                    });

                if (error) {
                    console.error("Error inserting:", error);
                    failCount++;
                } else {
                    successCount++;
                }
            }

            statusEl.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span> <span>Parsed successfully! Imported ${successCount}, ${failCount} failed.</span>`;
            statusEl.style.color = '#9ACD90';
            statusEl.style.display = 'flex';

            await loadStats();
            await loadSubmissions();

            // Reset input
            event.target.value = '';

            // Automatically close the panel and modal after a small delay
            setTimeout(() => {
                document.getElementById('excel-import-panel').style.display = 'none';
                statusEl.style.display = 'none';
                window.closeSubmissionModal();
            }, 3000);

        } catch (err) {
            console.error("Error reading file:", err);
            statusEl.innerHTML = `<span class="material-symbols-outlined text-[16px] text-rose-400">error</span> <span>Error parsing spreadsheet.</span>`;
            statusEl.style.color = '#E57373';
        }
    };
    reader.readAsArrayBuffer(file);
};


function showSection(sectionId) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('sidebar-item-active', 'text-white'));
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.add('text-slate-400'));

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

window.showSection = showSection;
window.openSubmissionModal = () => {
    if (window.currentUserStatus === 'suspended') {
        alert("Tu cuenta está suspendida. No puedes registrar interpretaciones.");
        return;
    }
    resetSubmissionForm();
    document.getElementById('submission-modal').classList.remove('hidden');
    document.getElementById('submission-modal').classList.add('flex');
};
window.closeSubmissionModal = () => {
    document.getElementById('submission-modal').classList.add('hidden');
    document.getElementById('submission-modal').classList.remove('flex');
};
window.openEditSubmission = async (id) => {
    if (window.currentUserStatus === 'suspended') {
        alert("Tu cuenta está suspendida. No puedes editar interpretaciones.");
        return;
    }
    const { data: submission, error } = await supabase
        .from('performances')
        .select(`*, work:work_id (
            title,
            composer_name,
            composer_profile_id,
            composer:composer_id(name),
            composer_profile:composer_profile_id(first_name, last_name, name)
        )`)
        .eq('id', id)
        .single();

    if (error || !submission) {
        alert('Error loading submission for edit.');
        return;
    }
    if (submission.performer_id !== currentUser.id) {
        alert('You may only edit your own submissions.');
        return;
    }

    editingPerformanceId = id;
    const titleEl = document.getElementById('submission-modal-title');
    const submitBtn = document.getElementById('submission-submit-btn');
    if (titleEl) titleEl.textContent = 'Edit Interpretation';
    if (submitBtn) submitBtn.textContent = 'Save Changes';

    document.getElementById('search-work-input').value = ''; 
    document.getElementById('selected-work-id').value = submission.work_id;
    document.getElementById('selected-title').textContent = submission.work?.title || 'Unknown Work';
    
    const workComposer = submission.work?.composer_name
        || (submission.work?.composer_profile ? (submission.work.composer_profile.name || `${submission.work.composer_profile.first_name || ''} ${submission.work.composer_profile.last_name || ''}`.trim()) : '')
        || submission.work?.composer?.name
        || 'Unknown Composer';
    document.getElementById('selected-composer').textContent = workComposer;
    document.getElementById('selected-work-info').classList.remove('hidden');
    
    const manualComposerField = document.getElementById('manual-composer-field');
    if (manualComposerField) manualComposerField.classList.add('hidden');

    document.getElementById('perf-date').value = submission.performance_date || '';
    document.getElementById('perf-event').value = submission.event_name || '';
    document.getElementById('perf-premiere').value = submission.premiere_status || 'Standard Performance';
    document.getElementById('perf-ensemble').value = submission.ensemble_name || '';
    document.getElementById('perf-conductor').value = submission.conductor || '';
    document.getElementById('perf-venue').value = submission.venue || '';
    document.getElementById('perf-city').value = submission.city || '';
    document.getElementById('perf-country').value = submission.country || '';
    document.getElementById('perf-link').value = submission.recording_link || '';
    document.getElementById('perf-photo').value = submission.photo_link || '';
    document.getElementById('perf-notes').value = submission.program_notes || '';
    document.getElementById('perf-feedback').value = submission.performance_note || '';
    document.getElementById('perf-hide-public').checked = submission.hide_public === true;

    document.getElementById('submission-modal').classList.remove('hidden');
    document.getElementById('submission-modal').classList.add('flex');
};
window.deletePerformance = async (id) => {
    if (window.currentUserStatus === 'suspended') {
        alert("Tu cuenta está suspendida. No puedes eliminar interpretaciones.");
        return;
    }
    if (!confirm("Are you sure you want to delete this interpretation?")) return;

    const { error } = await supabase
        .from('performances')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error deleting interpretation: " + error.message);
    } else {
        alert("Interpretation deleted successfully.");
        await loadStats();
        await loadSubmissions();
    }
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
            const dateStr = new Date(p.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

            return `
                <a href="index.html?post=${p.id}&from=musician" class="block feed-card p-5 rounded-2xl transition-all duration-300 relative group border border-white/5 hover:border-salmon/30 bg-white/5">
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
// ── Bulk Import Interpretations (Up to 100 Rows) ──────────────────────────
let parsedPerformances = [];

function normString(str) {
    if (!str) return '';
    return str.toString().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function cleanFieldBulk(val) {
    if (!val || val.toString().trim() === 'N/D' || val.toString().trim() === '-' || val.toString().trim() === '') return null;
    return val.toString().trim();
}

function parseDateBulk(raw) {
    if (!raw || raw === 'N/D' || raw.toString().toLowerCase().includes('n/d')) return null;
    // Check if it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw.toString().trim())) return raw.toString().trim();
    // Try to convert DD/MM/YYYY to YYYY-MM-DD
    const m = raw.toString().trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
    // If it's serial date from Excel (XLSX parsing might return it as a string or number)
    const parsedNum = parseFloat(raw);
    if (!isNaN(parsedNum) && parsedNum > 30000 && parsedNum < 60000) {
        // Excel base date is 30 Dec 1899 due to leap year bug
        const dateObj = new Date((parsedNum - 25569) * 86400 * 1000);
        return dateObj.toISOString().split('T')[0];
    }
    return null;
}

window.handleBulkUpload = async (event) => {
    if (window.currentUserStatus === 'suspended') {
        alert("Tu cuenta está suspendida. No puedes realizar cargas masivas.");
        event.target.value = '';
        return;
    }
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
            
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (!rows || rows.length < 2) {
                alert("The spreadsheet seems to be empty.");
                return;
            }

            let headerRowIndex = 0;
            let dataStartRowIndex = 1;
            
            const row0Str = rows[0].map(c => normString(c)).join(',');
            
            if (row0Str.includes('coreinformation') || row0Str.includes('performancedetails')) {
                headerRowIndex = 1;
                dataStartRowIndex = 2;
                if (rows[2] && rows[2].some(c => c && c.toString().includes('linked to the database'))) {
                    dataStartRowIndex = 3;
                }
            } else if (row0Str.includes('worktitle') || row0Str.includes('tituloobra') || row0Str.includes('title')) {
                headerRowIndex = 0;
                dataStartRowIndex = 1;
                if (rows[1] && rows[1].some(c => c && c.toString().includes('linked to the database'))) {
                    dataStartRowIndex = 2;
                }
            }

            const headers = rows[headerRowIndex].map(h => h ? h.toString().trim() : '');
            
            const mappings = {
                work_title: ['work title', 'titulo obra', 'obra', 'titulo', 'title'],
                composer_name: ['composer name', 'nombre compositor', 'compositor', 'composer'],
                performance_date: ['performance date', 'fecha', 'fecha interpretacion', 'date'],
                event_name: ['event / festival name', 'evento', 'festival', 'event'],
                venue: ['venue', 'lugar', 'sala'],
                city: ['city', 'ciudad'],
                country: ['country', 'pais'],
                premiere_status: ['premiere status', 'estreno', 'estado estreno'],
                ensemble_name: ['ensemble / soloist name', 'interprete', 'ensemble', 'solista'],
                conductor: ['conductor', 'director'],
                recording_link: ['live recording link', 'grabacion', 'audio', 'video', 'link'],
                photo_link: ['photo / poster', 'foto', 'poster', 'imagen'],
                program_notes: ['program notes (used)', 'notas programa', 'notas'],
                performance_note: ['performance note', 'nota interpretacion', 'comentarios', 'feedback']
            };

            const columnMapping = {};
            const matchedHeadersInfo = {};

            for (const fieldKey in mappings) {
                const searchKeys = mappings[fieldKey];
                const headerIndex = headers.findIndex(h => {
                    const normH = normString(h);
                    return searchKeys.some(sk => normH === sk || normH.includes(sk));
                });
                if (headerIndex !== -1) {
                    columnMapping[fieldKey] = headerIndex;
                    matchedHeadersInfo[fieldKey] = headers[headerIndex];
                }
            }

            const dataRows = rows.slice(dataStartRowIndex);
            const rowsToProcess = dataRows.slice(0, 100);

            parsedPerformances = rowsToProcess.map((rowArr, idx) => {
                const rawTitle = columnMapping.work_title !== undefined ? rowArr[columnMapping.work_title] : '';
                const rawComposer = columnMapping.composer_name !== undefined ? rowArr[columnMapping.composer_name] : '';
                const rawDate = columnMapping.performance_date !== undefined ? rowArr[columnMapping.performance_date] : '';
                const rawEvent = columnMapping.event_name !== undefined ? rowArr[columnMapping.event_name] : '';
                const rawVenue = columnMapping.venue !== undefined ? rowArr[columnMapping.venue] : '';
                const rawCity = columnMapping.city !== undefined ? rowArr[columnMapping.city] : '';
                const rawCountry = columnMapping.country !== undefined ? rowArr[columnMapping.country] : '';
                const rawPremiere = columnMapping.premiere_status !== undefined ? rowArr[columnMapping.premiere_status] : '';
                const rawEnsemble = columnMapping.ensemble_name !== undefined ? rowArr[columnMapping.ensemble_name] : '';
                const rawConductor = columnMapping.conductor !== undefined ? rowArr[columnMapping.conductor] : '';
                const rawLink = columnMapping.recording_link !== undefined ? rowArr[columnMapping.recording_link] : '';
                const rawPhoto = columnMapping.photo_link !== undefined ? rowArr[columnMapping.photo_link] : '';
                const rawNotes = columnMapping.program_notes !== undefined ? rowArr[columnMapping.program_notes] : '';
                const rawFeedback = columnMapping.performance_note !== undefined ? rowArr[columnMapping.performance_note] : '';

                const work_title = cleanFieldBulk(rawTitle);
                const composer_name = cleanFieldBulk(rawComposer);
                const performance_date = parseDateBulk(rawDate);
                const event_name = cleanFieldBulk(rawEvent);
                const venue = cleanFieldBulk(rawVenue);
                const city = cleanFieldBulk(rawCity);
                const country = cleanFieldBulk(rawCountry);
                const premiere_status = cleanFieldBulk(rawPremiere) || 'Standard Performance';
                const ensemble_name = cleanFieldBulk(rawEnsemble);
                const conductor = cleanFieldBulk(rawConductor);
                const recording_link = cleanFieldBulk(rawLink);
                const photo_link = cleanFieldBulk(rawPhoto);
                const program_notes = cleanFieldBulk(rawNotes);
                const performance_note = cleanFieldBulk(rawFeedback);

                const errors = [];
                if (!work_title) errors.push("Missing Work Title");
                if (!performance_date) errors.push("Missing or invalid Performance Date");

                return {
                    id: idx,
                    work_title,
                    composer_name,
                    performance_date,
                    event_name,
                    venue,
                    city,
                    country,
                    premiere_status,
                    ensemble_name,
                    conductor,
                    recording_link,
                    photo_link,
                    program_notes,
                    performance_note,
                    errors
                };
            }).filter(p => p.work_title || p.performance_date || p.event_name);

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

    if (uploadZone) uploadZone.classList.add('hidden');
    if (container) container.classList.remove('hidden');

    if (mappingGrid) {
        mappingGrid.innerHTML = '';
        const fieldsToDisplay = [
            { label: 'Work Title', key: 'work_title' },
            { label: 'Composer Name', key: 'composer_name' },
            { label: 'Performance Date', key: 'performance_date' },
            { label: 'Event Name', key: 'event_name' },
            { label: 'Venue', key: 'venue' },
            { label: 'Ensemble Name', key: 'ensemble_name' }
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
    }

    updateBulkSummaryCounts();

    if (tbody) {
        tbody.innerHTML = '';
        if (parsedPerformances.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-12 text-slate-500 font-sans">
                        All rows removed. Drag and drop another file to start over.
                    </td>
                </tr>
            `;
            return;
        }

        parsedPerformances.forEach((p, index) => {
            let statusHtml = '';
            if (p.errors.length > 0) {
                statusHtml = `
                    <div class="flex flex-col items-center gap-0.5 text-rose-400" title="${p.errors.join(', ')}">
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

            const dateStr = p.performance_date ? p.performance_date.split('-').reverse().join('/') : '<span class="text-rose-400">—</span>';
            const venueCity = [p.venue, p.city].filter(Boolean).join(', ') || '—';
            const ensembleCond = [p.ensemble_name, p.conductor ? `Cond. ${p.conductor}` : null].filter(Boolean).join(' / ') || '—';

            tbody.innerHTML += `
                <tr class="hover:bg-white/[0.01] transition-all">
                    <td class="py-4 px-6 text-center text-slate-500 font-mono">${index + 1}</td>
                    <td class="py-4 px-4">
                        <div class="font-bold text-white max-w-[220px] truncate" title="${p.work_title || 'Untitled'}">${p.work_title || '<span class="text-rose-400 italic">Untitled</span>'}</div>
                        <div class="text-[10px] text-slate-500 truncate max-w-[220px]" title="${p.composer_name || ''}">${p.composer_name || '—'}</div>
                    </td>
                    <td class="py-4 px-4 text-center font-mono font-semibold">${dateStr}</td>
                    <td class="py-4 px-4 text-slate-400 truncate max-w-[150px]" title="${p.event_name || ''}">${p.event_name || '—'}</td>
                    <td class="py-4 px-4 text-slate-400 truncate max-w-[150px]" title="${venueCity}">${venueCity}</td>
                    <td class="py-4 px-4 text-slate-400 truncate max-w-[150px]" title="${ensembleCond}">${ensembleCond}</td>
                    <td class="py-4 px-4 text-center">${statusHtml}</td>
                    <td class="py-4 px-6 text-center">
                        <button onclick="window.removeBulkRow(${p.id})" class="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Delete Row">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
}

function updateBulkSummaryCounts() {
    const totalCount = parsedPerformances.length;
    const readyCount = parsedPerformances.filter(p => p.errors.length === 0).length;
    const errorCount = parsedPerformances.filter(p => p.errors.length > 0).length;

    const previewLabel = document.getElementById('bulk-preview-count-label');
    if (previewLabel) previewLabel.textContent = `${totalCount} interpretations loaded`;
    
    const actionTotal = document.getElementById('bulk-action-total');
    if (actionTotal) actionTotal.textContent = totalCount;
    
    const actionReady = document.getElementById('bulk-action-ready');
    if (actionReady) actionReady.textContent = readyCount;
    
    const actionErrors = document.getElementById('bulk-action-errors');
    if (actionErrors) actionErrors.textContent = errorCount;

    const submitBtn = document.getElementById('bulk-import-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = readyCount === 0;
    }
}

window.removeBulkRow = (id) => {
    parsedPerformances = parsedPerformances.filter(p => p.id !== id);
    renderBulkPreview();
};

window.clearBulkImport = () => {
    parsedPerformances = [];
    const bulkInput = document.getElementById('bulk-file-input');
    if (bulkInput) bulkInput.value = '';
    const container = document.getElementById('bulk-preview-container');
    if (container) container.classList.add('hidden');
    const uploadZone = document.getElementById('bulk-upload-zone');
    if (uploadZone) uploadZone.classList.remove('hidden');
};

window.submitBulkImport = async () => {
    const validPerformances = parsedPerformances.filter(p => p.errors.length === 0);
    if (validPerformances.length === 0) return;

    const btn = document.getElementById('bulk-import-submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-[16px]">sync</span> Saving...`;
    btn.disabled = true;

    try {
        let successCount = 0;
        let failCount = 0;
        const createdWorksList = [];

        for (const p of validPerformances) {
            let workId;
            const { data: works } = await supabase
                .from('works')
                .select('id')
                .ilike('title', '%' + p.work_title + '%')
                .limit(1);

            if (!works || works.length === 0) {
                console.log(`Work not found, creating: ${p.work_title}`);
                let composerId = null;
                if (p.composer_name) {
                    const { data: composers } = await supabase
                        .from('composers')
                        .select('id')
                        .ilike('name', '%' + p.composer_name + '%')
                        .limit(1);
                    if (composers && composers.length > 0) {
                        composerId = composers[0].id;
                    }
                }

                const { data: newWork, error: newWorkError } = await supabase
                    .from('works')
                    .insert({ 
                        title: p.work_title, 
                        composer_id: composerId,
                        composer_name: p.composer_name,
                        status: 'pending',
                        submitted_by: currentUser.id
                    })
                    .select('id')
                    .single();

                if (newWorkError || !newWork) {
                    console.error(`Failed to create work ${p.work_title}:`, newWorkError);
                    failCount++;
                    continue;
                }
                workId = newWork.id;
                createdWorksList.push(p.work_title);
            } else {
                workId = works[0].id;
            }

            const { error } = await supabase
                .from('performances')
                .insert({
                    work_id: workId,
                    performer_id: currentUser.id,
                    performance_date: p.performance_date,
                    event_name: p.event_name,
                    venue: p.venue,
                    city: p.city,
                    country: p.country,
                    premiere_status: p.premiere_status,
                    ensemble_name: p.ensemble_name,
                    conductor: p.conductor,
                    recording_link: p.recording_link,
                    photo_link: p.photo_link,
                    program_notes: p.program_notes,
                    performance_note: p.performance_note,
                    status: 'pending'
                });

            if (error) {
                console.error("Error inserting performance:", error);
                failCount++;
            } else {
                successCount++;
            }
        }

        document.getElementById('bulk-report-success-count').textContent = successCount;
        const worksCreatedListEl = document.getElementById('bulk-report-works-created-list');
        const worksCreatedWrapper = document.getElementById('bulk-report-works-created-wrapper');

        if (createdWorksList.length > 0) {
            worksCreatedListEl.innerHTML = [...new Set(createdWorksList)].map(w => {
                return `<span class="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-md text-[10px] font-medium">${w}</span>`;
            }).join(' ');
            worksCreatedWrapper.classList.remove('hidden');
        } else {
            worksCreatedWrapper.classList.add('hidden');
        }

        document.getElementById('bulk-report-modal').classList.remove('hidden');
        document.getElementById('bulk-report-modal').classList.add('flex');

    } catch (err) {
        console.error("Error saving bulk import:", err);
        alert("Error saving interpretations: " + err.message);
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
    loadSubmissions();
    
    showSection('submissions');
    window.location.hash = 'submissions';
};

window.loadInteractions = loadInteractions;
document.addEventListener('DOMContentLoaded', init);
