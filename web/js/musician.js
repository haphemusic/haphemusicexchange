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
}

async function loadUserProfile() {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (profile) {
        const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Performer';
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

async function loadSubmissions() {
    const { data: submissions, error } = await supabase
        .from('performances')
        .select(`
            *,
            work:work_id (
                title,
                composer:composer_id (name),
                profiles:submitted_by (first_name, last_name)
            )
        `)
        .eq('performer_id', currentUser.id)
        .order('created_at', { ascending: false });

    const tableBody = document.getElementById('recent-table-body');
    const fullList = document.getElementById('full-submissions-list');

    if (error || !submissions || submissions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-10 text-center text-slate-500">No submissions found.</td></tr>';
        fullList.innerHTML = '<p class="text-slate-500">You haven\'t submitted any interpretations yet.</p>';
        return;
    }

    const getComposerName = (work) => {
        if (!work) return 'Unknown';
        if (work.composer?.name) return work.composer.name;
        if (work.profiles) {
            return `${work.profiles.first_name || ''} ${work.profiles.last_name || ''}`.trim() || 'Unknown';
        }
        return 'Unknown';
    };

    // Render table (Top 5)
    tableBody.innerHTML = submissions.slice(0, 5).map(s => `
        <tr class="hover:bg-white/2 transition-colors">
            <td class="px-6 py-4 font-bold text-white text-sm">${s.work?.title || 'Unknown Work'}</td>
            <td class="px-6 py-4 text-slate-400 text-sm">${getComposerName(s.work)}</td>
            <td class="px-6 py-4">
                <span class="status-badge ${getStatusClass(s.status)}">${s.status}</span>
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="deletePerformance(${s.id})" class="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-2 rounded-xl transition-all flex items-center justify-center ml-auto">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </td>
        </tr>
    `).join('');

    // Render full cards
    fullList.innerHTML = submissions.map(s => `
        <div class="glass-panel p-6 rounded-3xl space-y-3 relative group">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-white">${s.work?.title || 'Unknown Work'}</h4>
                    <p class="text-xs text-slate-500">Composer: ${getComposerName(s.work)}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="status-badge ${getStatusClass(s.status)}">${s.status}</span>
                    <button onclick="deletePerformance(${s.id})" class="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 p-1.5 rounded-lg transition-all">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            </div>
            <div class="pt-2 flex justify-between">
                <div>
                    <p class="text-[10px] text-slate-500 uppercase font-bold">Performance Date</p>
                    <p class="text-xs text-white">${s.performance_date || 'N/A'}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] text-slate-500 uppercase font-bold">Location</p>
                    <p class="text-xs text-white">${s.city || 'N/A'}</p>
                </div>
            </div>
        </div>
    `).join('');
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
                composer:composer_id (name)
            `)
            .ilike('title', `%${query}%`)
            .eq('status', 'validated') // Only search for works already validated by composers
            .limit(5);

        if (works && works.length > 0) {
            resultsDiv.innerHTML = works.map(w => {
                const composerName = w.composer ? w.composer.name.replace(/'/g, "\\'") : 'Unknown';
                return `
                <div onclick="selectWork(${w.id}, '${w.title.replace(/'/g, "\\'")}', '${composerName}')" class="p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0">
                    <p class="text-sm font-bold text-white">${w.title}</p>
                    <p class="text-[10px] text-slate-500 uppercase">${w.composer?.name || 'Unknown'}</p>
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
};

window.submitInterpretation = async () => {
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
            const { data: newWork, error: newWorkError } = await supabase
                .from('works')
                .insert({ title: searchInput, status: 'pending' })
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

    if (!workId) return alert("Please select a work from the archive.");
    if (!date) return alert("Please select a performance date.");

    const { error } = await supabase
        .from('performances')
        .insert({
            work_id: workId,
            performer_id: currentUser.id,
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
            status: 'pending' // Pending validation by composer
        });

    if (error) {
        alert("Error submitting: " + error.message);
    } else {
        alert("Interpretation submitted! The composer will be notified.");
        closeSubmissionModal();

        // Reset form fields
        document.getElementById('selected-work-id').value = '';
        document.getElementById('selected-title').textContent = '---';
        document.getElementById('selected-composer').textContent = '---';
        document.getElementById('selected-work-info').classList.add('hidden');
        document.getElementById('search-work-input').value = '';
        document.getElementById('perf-date').value = '';
        document.getElementById('perf-event').value = '';
        document.getElementById('perf-ensemble').value = '';
        document.getElementById('perf-conductor').value = '';
        document.getElementById('perf-venue').value = '';
        document.getElementById('perf-city').value = '';
        document.getElementById('perf-country').value = '';
        document.getElementById('perf-link').value = '';
        document.getElementById('perf-photo').value = '';
        document.getElementById('perf-notes').value = '';
        document.getElementById('perf-feedback').value = '';

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
            const workbook = XLSX.read(data, { type: 'array' });
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

                if (!works || works.length === 0) {
                    console.log(`Work not found, creating: ${title}`);
                    const { data: newWork, error: newWorkError } = await supabase
                        .from('works')
                        .insert({ title: title, status: 'pending' })
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

window.processCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async function (results) {
            const rows = results.data;
            let successCount = 0;
            let failCount = 0;

            alert(`Processing ${rows.length} rows. Please wait...`);

            for (const row of rows) {
                // Find work_id by title
                const title = row['Work Title'] || row['Title'] || row['work_title'];
                if (!title) { failCount++; continue; }

                let workId;
                const { data: works } = await supabase
                    .from('works')
                    .select('id')
                    .ilike('title', '%' + title + '%')
                    .limit(1);

                if (!works || works.length === 0) {
                    console.log(`Work not found, creating: ${title}`);
                    const { data: newWork, error: newWorkError } = await supabase
                        .from('works')
                        .insert({ title: title, status: 'pending' })
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
                if (perfDate && perfDate.includes('/')) {
                    // Try to convert DD/MM/YYYY to YYYY-MM-DD
                    const parts = perfDate.split('/');
                    if (parts.length === 3 && parts[2].length === 4) {
                        perfDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                }

                const { error } = await supabase
                    .from('performances')
                    .insert({
                        work_id: workId,
                        performer_id: currentUser.id,
                        performance_date: perfDate || null,
                        event_name: row['Event / Festival Name'] || row['Event'] || null,
                        venue: row['Venue'] || null,
                        city: row['City'] || null,
                        country: row['Country'] || null,
                        premiere_status: row['Premiere Status'] || 'Standard Performance',
                        ensemble_name: row['Ensemble / Soloist Name'] || row['Ensemble'] || null,
                        conductor: row['Conductor'] || null,
                        recording_link: row['Live Recording Link'] || row['Link'] || null,
                        photo_link: row['Photo / Poster'] || null,
                        program_notes: row['Program Notes (Used)'] || row['Notes'] || null,
                        performance_note: row['Performance Note'] || row['Feedback'] || null,
                        status: 'pending'
                    });

                if (error) {
                    console.error("Error inserting:", error);
                    failCount++;
                } else {
                    successCount++;
                }
            }

            alert(`CSV Import Complete!\nSuccessfully imported: ${successCount}\nFailed: ${failCount} (Usually because the Work Title was not found in the archive).`);
            await loadStats();
            await loadSubmissions();

            // Reset input
            event.target.value = '';
        }
    });
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
window.openSubmissionModal = () => document.getElementById('submission-modal').classList.remove('hidden', 'flex') || document.getElementById('submission-modal').classList.add('flex');
window.closeSubmissionModal = () => document.getElementById('submission-modal').classList.add('hidden') || document.getElementById('submission-modal').classList.remove('flex');
window.deletePerformance = async (id) => {
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
            const dateStr = new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

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
window.loadInteractions = loadInteractions;
document.addEventListener('DOMContentLoaded', init);
