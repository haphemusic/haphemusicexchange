// HAPHEMUSIC - Dashboard Messaging & Notifications System (Modularized)
// Utilizes window.supabase initialized by auth.js

let userSearchTimeout = null;
let currentUserId = null;
let currentUserStatus = 'active';

// Format roles for display
function displayRoleLabel(role) {
    if (!role) return 'User';
    const normalized = role.toLowerCase();
    if (normalized === 'musician' || normalized === 'drums' || normalized === 'group') return 'Performer/Ensemble';
    if (normalized === 'composer') return 'Composer';
    return role.charAt(0).toUpperCase() + role.slice(1);
}

// ── Search Community ─────────────────────────────────────────────────
window.openUserSearchModal = () => {
    const backdrop = document.getElementById('user-search-backdrop');
    if (!backdrop) return;
    backdrop.style.display = 'flex';
    const input = document.getElementById('user-search-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    const results = document.getElementById('user-search-results');
    if (results) {
        results.innerHTML = `<p class="text-center text-slate-500 py-10 text-sm">Type something to search the community...</p>`;
    }
};

window.closeUserSearchModal = () => {
    const backdrop = document.getElementById('user-search-backdrop');
    if (backdrop) backdrop.style.display = 'none';
};

window.searchUsers = async (query) => {
    const resultsEl = document.getElementById('user-search-results');
    if (!resultsEl) return;

    const q = query.trim();
    if (!q) {
        resultsEl.innerHTML = `<p class="text-center text-slate-500 py-10 text-sm">Type something to search the community...</p>`;
        return;
    }

    resultsEl.innerHTML = `
        <div class="flex items-center justify-center py-10">
            <span class="material-symbols-outlined text-[24px] animate-spin text-salmon">sync</span>
        </div>
    `;

    clearTimeout(userSearchTimeout);
    userSearchTimeout = setTimeout(async () => {
        try {
            const lowerQ = q.toLowerCase();
            let orFilter = `username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,performer_name.ilike.%${q}%`;
            
            if (lowerQ === 'admin' || lowerQ === 'admins' || lowerQ === 'administrador' || lowerQ === 'administradores') {
                orFilter += `,role.eq.admin`;
            } else if (lowerQ === 'composer' || lowerQ === 'composers' || lowerQ === 'compositor' || lowerQ === 'compositores') {
                orFilter += `,role.eq.composer`;
            } else if (lowerQ === 'performer' || lowerQ === 'performers' || lowerQ === 'ensemble' || lowerQ === 'ensembles' || lowerQ === 'ensamble' || lowerQ === 'ensambles' || lowerQ === 'musician' || lowerQ === 'musicians' || lowerQ === 'musico' || lowerQ === 'musicos' || lowerQ === 'interprete' || lowerQ === 'interpretes') {
                orFilter += `,role.eq.musician`;
            }

            const { data: users, error } = await window.supabase
                .from('profiles')
                .select('id, username, first_name, last_name, performer_name, role, avatar_url, bio, nationality')
                .or(orFilter)
                .limit(50);

            if (error) {
                console.error("Error searching users:", error);
                resultsEl.innerHTML = `<p class="text-center text-rose-400 py-10 text-sm">Failed to search users. Please try again.</p>`;
                return;
            }

            if (!users || users.length === 0) {
                resultsEl.innerHTML = `<p class="text-center text-slate-500 py-10 text-sm">No community members found matching "${q}".</p>`;
                return;
            }

            resultsEl.innerHTML = users.map(user => {
                const fullName = user.performer_name
                    ? user.performer_name
                    : `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Anonymous User';
                const initials = user.performer_name
                    ? user.performer_name.split(' ').slice(0, 2).map(word => word[0]).join('')
                    : (user.first_name ? user.first_name[0] : '') + (user.last_name ? user.last_name[0] : '');
                const avatarHTML = user.avatar_url 
                    ? `<img src="${user.avatar_url}" class="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0">`
                    : `<div class="w-10 h-10 rounded-xl bg-salmon/10 border border-salmon/20 flex items-center justify-center text-salmon font-bold text-sm shrink-0">${initials || '?'}</div>`;

                return `
                    <div onclick="window.openUserProfile('${user.id}')" class="flex items-center gap-4 p-3 bg-white/2 hover:bg-white/5 border border-white/5 rounded-2xl cursor-pointer transition-all hover:border-salmon/20 group">
                        ${avatarHTML}
                        <div class="flex-1 min-w-0 text-left">
                            <div class="flex items-center gap-2">
                                <h4 class="font-bold text-sm text-white group-hover:text-salmon transition-colors truncate">${fullName}</h4>
                                <span class="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-salmon/10 text-salmon shrink-0">${displayRoleLabel(user.role)}</span>
                            </div>
                            <p class="text-[11px] text-slate-400 truncate">@${user.username || 'username'}</p>
                        </div>
                        <span class="material-symbols-outlined text-[16px] text-slate-600 group-hover:text-salmon transition-colors shrink-0">arrow_forward</span>
                    </div>
                `;
            }).join('');

        } catch (err) {
            console.error(err);
            resultsEl.innerHTML = `<p class="text-center text-rose-400 py-10 text-sm">An error occurred while searching.</p>`;
        }
    }, 300);
};

// ── Public Profiles View ─────────────────────────────────────────────
window.openUserProfile = async (userId) => {
    window.closeUserSearchModal();

    const backdrop = document.getElementById('user-profile-backdrop');
    const contentEl = document.getElementById('user-profile-content');
    if (!backdrop || !contentEl) return;
    
    backdrop.style.display = 'flex';
    contentEl.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20">
            <span class="material-symbols-outlined text-[36px] animate-spin text-salmon mb-2">sync</span>
            <p class="text-xs text-slate-400 uppercase tracking-widest">Loading Public Profile...</p>
        </div>
    `;

    try {
        const { data: profile, error } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            console.error("Error loading profile:", error);
            contentEl.innerHTML = `
                <div class="text-center py-10">
                    <span class="material-symbols-outlined text-4xl text-rose-400 mb-2">error</span>
                    <p class="text-sm text-slate-300">Could not retrieve profile info.</p>
                </div>
            `;
            return;
        }

        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Anonymous User';
        const initials = (profile.first_name ? profile.first_name[0] : '') + (profile.last_name ? profile.last_name[0] : '');
        const avatarHTML = profile.avatar_url
            ? `<img src="${profile.avatar_url}" class="w-24 h-24 rounded-2xl object-cover border-2 border-salmon/30 shrink-0">`
            : `<div class="w-24 h-24 rounded-2xl bg-salmon/10 border-2 border-salmon/30 flex items-center justify-center text-salmon text-3xl font-bold shrink-0">${initials || '?'}</div>`;

        let messageBtnHTML = '';
        if (currentUserId && currentUserId !== userId) {
            messageBtnHTML = `
                <div class="mt-4 flex justify-center sm:justify-start">
                    <button onclick="window.startDirectChat('${profile.id}', '${fullName.replace(/'/g, "\\'")}')" class="flex items-center gap-2 px-5 py-2 rounded-full bg-salmon text-white font-sans font-medium text-xs hover:brightness-110 transition-all duration-300 active:scale-95">
                        <span class="material-symbols-outlined text-[16px]">mail</span>
                        Send Message
                    </button>
                </div>
            `;
        }

        let contributionHTML = `<p class="text-xs text-slate-500 italic">No public contributions listed.</p>`;
        
        if (profile.role === 'composer') {
            const { data: works } = await window.supabase
                .from('works')
                .select('*')
                .or(`composer_profile_id.eq.${userId},submitted_by.eq.${userId}`)
                .eq('status', 'validated')
                .order('created_at', { ascending: false });

            if (works && works.length > 0) {
                contributionHTML = `
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        ${works.map(w => `
                            <div class="p-4 bg-white/2 border border-white/5 rounded-2xl">
                                <div>
                                    <h5 class="font-bold text-sm text-white">${w.title}</h5>
                                    <p class="text-xs text-slate-400 mt-1">${w.subtitle || ''}</p>
                                </div>
                                <div class="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                                    <span class="text-[10px] text-salmon font-semibold uppercase tracking-wider">${w.scoring_category || 'Work'}</span>
                                    <span class="text-[10px] text-slate-500">${w.year || ''}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } else if (profile.role === 'musician' || profile.role === 'drums' || profile.role === 'group') {
            const { data: performances } = await window.supabase
                .from('performances')
                .select(`
                    id,
                    event_name,
                    performance_date,
                    venue,
                    city,
                    country,
                    work:work_id (
                        id,
                        title,
                        subtitle,
                        composer_name
                    )
                `)
                .eq('performer_id', userId)
                .eq('status', 'validated')
                .order('performance_date', { ascending: false });

            if (performances && performances.length > 0) {
                contributionHTML = `
                    <div class="space-y-3 text-left">
                        ${performances.map(p => {
                            const workTitle = p.work ? p.work.title : 'Unknown Work';
                            const composerName = p.work ? (p.work.composer_name || '') : '';
                            const dateStr = p.performance_date ? p.performance_date.split('-').reverse().join('/') : '—';
                            return `
                                <div class="p-4 bg-white/2 border border-white/5 rounded-2xl">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <h5 class="font-bold text-sm text-white">Performed: ${workTitle}</h5>
                                            <p class="text-xs text-slate-400">by ${composerName}</p>
                                        </div>
                                        <span class="px-2 py-0.5 rounded bg-white/5 text-slate-300 text-[10px] shrink-0">${dateStr}</span>
                                    </div>
                                    ${p.event_name || p.venue ? `
                                    <p class="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                        <span class="material-symbols-outlined text-[13px]">location_on</span>
                                        ${[p.event_name, p.venue, p.city].filter(Boolean).join(' · ')}
                                    </p>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
        }

        contentEl.innerHTML = `
            <div class="flex flex-col gap-6 text-left">
                <!-- Header Card -->
                <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-white/10 text-center sm:text-left">
                    ${avatarHTML}
                    <div class="flex-1">
                        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 justify-center sm:justify-start">
                            <h2 class="text-2xl font-bold text-white">${fullName}</h2>
                            <span class="self-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-salmon/20 text-salmon shrink-0">${displayRoleLabel(profile.role)}</span>
                        </div>
                        <p class="text-slate-400 text-sm mt-1">@${profile.username || 'username'}</p>
                        <p class="text-slate-500 text-xs mt-2 flex items-center justify-center sm:justify-start gap-1.5">
                            <span class="material-symbols-outlined text-[14px]">public</span>
                            ${profile.nationality || 'Nationality not specified'} ${profile.residence_country ? `· Resides in ${profile.residence_country}` : ''}
                        </p>
                        ${messageBtnHTML}
                    </div>
                </div>

                <!-- Bio & Contributions Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4 min-w-0">
                        <div>
                            <h4 class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Bio</h4>
                            <p class="text-sm text-slate-300 leading-relaxed mt-1 whitespace-pre-line overflow-y-auto max-h-[200px]">${profile.bio || 'No biography written yet.'}</p>
                        </div>
                        ${profile.main_aesthetic ? `
                        <div>
                            <h4 class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Main Aesthetic</h4>
                            <p class="text-sm text-slate-300 mt-1">${profile.main_aesthetic}</p>
                        </div>
                        ` : ''}
                        ${profile.public_contact_email ? `
                        <div>
                            <h4 class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contact Email</h4>
                            <a href="mailto:${profile.public_contact_email}" class="text-sm text-salmon hover:underline flex items-center gap-1 mt-1">
                                <span class="material-symbols-outlined text-[16px]">email</span>
                                ${profile.public_contact_email}
                            </a>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div>
                        <h4 class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Public Catalog</h4>
                        <div class="overflow-y-auto max-h-[300px] pr-1">
                            ${contributionHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;

    } catch (err) {
        console.error(err);
        contentEl.innerHTML = `<p class="text-center text-rose-400 py-10 text-sm">Failed to load user profile.</p>`;
    }
};

window.closeUserProfile = () => {
    const backdrop = document.getElementById('user-profile-backdrop');
    if (backdrop) backdrop.style.display = 'none';
};

// ── Direct Messaging ─────────────────────────────────────────────────
window.chatOpen = false;
window.currentChatRecipientId = null;

window.toggleChatPanel = async () => {
    if (!currentUserId) {
        alert("Please log in to use the messaging system.");
        window.location.href = 'login.html';
        return;
    }

    const panel = document.getElementById('chat-panel');
    if (!panel) return;
    window.chatOpen = !window.chatOpen;
    panel.style.display = window.chatOpen ? 'flex' : 'none';

    if (window.chatOpen) {
        window.backToConversationsList();
    }
};

window.backToConversationsList = () => {
    window.currentChatRecipientId = null;
    document.getElementById('chat-header-title').textContent = 'Messages';
    document.getElementById('chat-header-subtitle').textContent = 'Direct Messages';
    document.getElementById('chat-back-btn').style.display = 'none';
    document.getElementById('active-chat-container').style.display = 'none';
    document.getElementById('conversations-list-container').style.display = 'block';
    window.loadConversations();
};

window.startDirectChat = async (recipientId, recipientName) => {
    window.closeUserProfile();
    
    if (!currentUserId) {
        alert("Please log in to chat.");
        window.location.href = 'login.html';
        return;
    }

    const panel = document.getElementById('chat-panel');
    if (panel) {
        window.chatOpen = true;
        panel.style.display = 'flex';
    }

    window.loadChat(recipientId, recipientName);
};

window.loadConversations = async () => {
    const container = document.getElementById('conversations-list-container');
    if (!container) return;

    container.innerHTML = `
        <div class="flex items-center justify-center py-20">
            <span class="material-symbols-outlined text-[24px] animate-spin text-salmon">sync</span>
        </div>
    `;

    try {
        const { data: msgs, error } = await window.supabase
            .from('messages')
            .select('sender_id, receiver_id, content, created_at, is_read')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!msgs || msgs.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-500 py-20 text-xs font-sans">No conversations yet.<br>Search members to start chatting!</p>`;
            return;
        }

        const uniqueUserIds = [...new Set(msgs.flatMap(m => [m.sender_id, m.receiver_id]))].filter(id => id !== currentUserId);

        if (uniqueUserIds.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-500 py-20 text-xs font-sans">No conversations yet.<br>Search members to start chatting!</p>`;
            return;
        }

        const { data: profiles, error: pError } = await window.supabase
            .from('profiles')
            .select('id, username, first_name, last_name, avatar_url, role')
            .in('id', uniqueUserIds);

        if (pError) throw pError;

        const conversations = uniqueUserIds.map(uid => {
            const profile = profiles.find(p => p.id === uid) || { id: uid, first_name: 'Unknown', last_name: 'User', role: 'user' };
            const userMsgs = msgs.filter(m => m.sender_id === uid || m.receiver_id === uid);
            const latestMsg = userMsgs[0];
            const unreadCount = userMsgs.filter(m => m.sender_id === uid && !m.is_read).length;
            return { profile, latestMsg, unreadCount };
        }).sort((a, b) => new Date(b.latestMsg.created_at) - new Date(a.latestMsg.created_at));

        container.innerHTML = conversations.map(c => {
            const fullName = `${c.profile.first_name || ''} ${c.profile.last_name || ''}`.trim() || 'Anonymous User';
            const initials = (c.profile.first_name ? c.profile.first_name[0] : '') + (c.profile.last_name ? c.profile.last_name[0] : '');
            const avatarHTML = c.profile.avatar_url 
                ? `<img src="${c.profile.avatar_url}" class="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0">`
                : `<div class="w-11 h-11 rounded-xl bg-salmon/10 border border-salmon/20 flex items-center justify-center text-salmon font-bold text-sm shrink-0 font-sans">${initials || '?'}</div>`;

            const unreadBadge = c.unreadCount > 0 
                ? `<span class="bg-rose-500 text-white font-sans text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">${c.unreadCount}</span>`
                : '';

            const textStyle = c.unreadCount > 0 ? 'font-bold text-white' : 'text-slate-400';

            return `
                <div onclick="window.loadChat('${c.profile.id}', '${fullName.replace(/'/g, "\\'")}')" class="flex items-center gap-3.5 p-3 hover:bg-white/5 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-white/5 text-left">
                    ${avatarHTML}
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-baseline mb-0.5">
                            <h4 class="font-bold text-sm text-white truncate font-sans">${fullName}</h4>
                            <span class="text-[9px] text-slate-500 shrink-0 ml-2 font-sans">${new Date(c.latestMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div class="flex justify-between items-center gap-2">
                            <p class="text-xs truncate font-sans ${textStyle}">${c.latestMsg.content}</p>
                            ${unreadBadge}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        updateNavbarUnreadBadge();

    } catch (err) {
        console.error("Error loading conversations:", err);
        container.innerHTML = `<p class="text-center text-rose-400 py-10 text-xs font-sans">Error loading conversations.</p>`;
    }
};

window.loadChat = async (recipientId, recipientName) => {
    window.currentChatRecipientId = recipientId;
    
    document.getElementById('chat-header-title').textContent = recipientName;
    document.getElementById('chat-header-subtitle').textContent = 'Chat';
    document.getElementById('chat-back-btn').style.display = 'flex';
    document.getElementById('conversations-list-container').style.display = 'none';
    
    const activeContainer = document.getElementById('active-chat-container');
    if (activeContainer) activeContainer.style.display = 'flex';

    const msgContainer = document.getElementById('chat-messages-container');
    if (!msgContainer) return;

    msgContainer.innerHTML = `
        <div class="flex items-center justify-center py-20">
            <span class="material-symbols-outlined text-[24px] animate-spin text-salmon">sync</span>
        </div>
    `;

    try {
        const { data: msgs, error } = await window.supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUserId})`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        msgContainer.innerHTML = '';
        if (msgs && msgs.length > 0) {
            msgs.forEach(m => appendMessageBubble(m));
        } else {
            msgContainer.innerHTML = `<p class="text-center text-slate-500 py-10 text-xs italic font-sans">Say hi to start the conversation!</p>`;
        }

        msgContainer.scrollTop = msgContainer.scrollHeight;

        // Mark as read
        await window.supabase
            .from('messages')
            .update({ is_read: true })
            .eq('sender_id', recipientId)
            .eq('receiver_id', currentUserId)
            .eq('is_read', false);

        updateNavbarUnreadBadge();

    } catch (err) {
        console.error("Error loading chat:", err);
        msgContainer.innerHTML = `<p class="text-center text-rose-400 py-10 text-xs font-sans">Error loading messages.</p>`;
    }
};

window.handleChatSubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-message-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !window.currentChatRecipientId) return;

    input.value = '';
    await window.sendMessage(window.currentChatRecipientId, text);
};

window.sendMessage = async (recipientId, text) => {
    if (currentUserStatus === 'suspended') {
        alert("Tu cuenta está suspendida. No puedes enviar mensajes privados.");
        return;
    }
    try {
        const { error } = await window.supabase
            .from('messages')
            .insert({
                sender_id: currentUserId,
                receiver_id: recipientId,
                content: text
            });

        if (error) throw error;

    } catch (err) {
        console.error("Error sending message:", err);
        alert("Failed to send message.");
    }
};

function appendMessageBubble(msg) {
    const msgContainer = document.getElementById('chat-messages-container');
    if (!msgContainer) return;
    
    if (msgContainer.querySelector('.italic')) {
        msgContainer.innerHTML = '';
    }

    const isMe = msg.sender_id === currentUserId;
    const bubbleStyle = isMe 
        ? 'bg-salmon text-white rounded-2xl rounded-tr-sm ml-auto max-w-[80%]'
        : 'bg-slate-800 text-slate-100 rounded-2xl rounded-tl-sm mr-auto max-w-[80%]';

    const wrapperStyle = isMe ? 'flex justify-end' : 'flex justify-start';
    const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const div = document.createElement('div');
    div.className = wrapperStyle;
    div.innerHTML = `
        <div class="px-4 py-2.5 shadow-md flex flex-col gap-1 ${bubbleStyle}">
            <p class="text-xs font-sans leading-relaxed break-words text-left">${msg.content}</p>
            <span class="text-[8px] text-white/50 text-right font-mono">${timeStr}</span>
        </div>
    `;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

async function updateNavbarUnreadBadge() {
    try {
        const { count, error } = await window.supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentUserId)
            .eq('is_read', false);

        if (error) throw error;

        const badge = document.getElementById('unread-chat-badge');
        if (badge) {
            if (count > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error("Error updating unread badge:", e);
    }
}

window.initRealtimeMessages = () => {
    window.supabase
        .channel('db-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
            const newMsg = payload.new;
            if (!currentUserId) return;

            if (window.currentChatRecipientId && 
                ((newMsg.sender_id === currentUserId && newMsg.receiver_id === window.currentChatRecipientId) ||
                 (newMsg.sender_id === window.currentChatRecipientId && newMsg.receiver_id === currentUserId))) {
                
                appendMessageBubble(newMsg);
                
                if (newMsg.receiver_id === currentUserId) {
                    await window.supabase
                        .from('messages')
                        .update({ is_read: true })
                        .eq('id', newMsg.id);
                }
            }
            
            if (window.chatOpen) {
                await window.loadConversations();
            }
            
            if (newMsg.receiver_id === currentUserId) {
                updateNavbarUnreadBadge();
            }
        })
        .subscribe();
};

// ── Notifications ───────────────────────────────────────────────────
window.toggleNotificationsDropdown = (forceState) => {
    const dd = document.getElementById('notifications-dropdown');
    if (!dd) return;

    const show = (forceState !== undefined) ? forceState : (dd.style.display === 'none');
    dd.style.display = show ? 'flex' : 'none';
};

window.loadNotifications = async () => {
    const listEl = document.getElementById('notifications-list');
    if (!listEl) return;

    try {
        // Fetch last 15 notifications
        const { data: notifs, error } = await window.supabase
            .from('notifications')
            .select('*')
            .eq('receiver_id', currentUserId)
            .order('created_at', { ascending: false })
            .limit(15);

        if (error) throw error;

        // Unread badge count
        const unreadCount = notifs.filter(n => !n.is_read).length;
        const badge = document.getElementById('unread-notif-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        if (!notifs || notifs.length === 0) {
            listEl.innerHTML = `<p class="text-center text-slate-500 py-6 text-xs italic font-sans">No notifications</p>`;
            return;
        }

        const senderIds = [...new Set(notifs.map(n => n.sender_id))].filter(Boolean);
        let senderProfiles = [];
        if (senderIds.length > 0) {
            const { data: pData, error: spError } = await window.supabase
                .from('profiles')
                .select('id, first_name, last_name, avatar_url')
                .in('id', senderIds);
            if (!spError && pData) senderProfiles = pData;
        }

        listEl.innerHTML = notifs.map(n => {
            const profile = senderProfiles.find(p => p.id === n.sender_id) || { first_name: 'Anonymous', last_name: 'User' };
            const senderName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Anonymous User';
            const initials = (profile.first_name ? profile.first_name[0] : '') + (profile.last_name ? profile.last_name[0] : '');

            const avatarHTML = profile.avatar_url
                ? `<img src="${profile.avatar_url}" class="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0">`
                : `<div class="w-8 h-8 rounded-lg bg-salmon/10 border border-salmon/20 flex items-center justify-center text-salmon font-bold text-xs font-sans shrink-0">${initials || '?'}</div>`;

            const dateStr = new Date(n.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            return `
                <div onclick="window.handleNotificationClick('${n.id}')" class="flex gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors text-left ${!n.is_read ? 'bg-salmon/5 border-l-2 border-salmon' : ''}">
                    ${avatarHTML}
                    <div class="flex-1 space-y-0.5">
                        <p class="text-xs text-slate-200 font-sans leading-tight">
                            <span class="font-bold text-white">${senderName}</span> ${n.content}
                        </p>
                        <span class="text-[9px] text-slate-500 font-mono block">${dateStr}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading notifications:", err);
    }
};

window.markAllNotificationsRead = async () => {
    if (!currentUserId) return;

    try {
        await window.supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('receiver_id', currentUserId)
            .eq('is_read', false);

        window.loadNotifications();
    } catch (err) {
        console.error("Error marking all read:", err);
    }
};

window.handleNotificationClick = async (notifId) => {
    try {
        // Mark as read
        await window.supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notifId);

        window.toggleNotificationsDropdown(false);
        await window.loadNotifications();
        
        // Load conversations
        const panel = document.getElementById('chat-panel');
        if (panel) {
            window.chatOpen = true;
            panel.style.display = 'flex';
            window.backToConversationsList();
        }
    } catch (err) {
        console.error("Error clicking notification:", err);
    }
};

window.initRealtimeNotifications = async () => {
    window.supabase
        .channel('public:notifications')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications'
        }, async (payload) => {
            if (payload.new && payload.new.receiver_id === currentUserId) {
                console.log("🔔 Real-time notification received:", payload.new);
                window.loadNotifications();
            }
        })
        .subscribe();
};

// ── Initialization on Page Load ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth status continuously or on load
    const checkUser = async () => {
        if (!window.supabase) {
            // Retry in 200ms if supabase not ready yet
            setTimeout(checkUser, 200);
            return;
        }
        
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (session) {
                currentUserId = session.user.id;
                
                // Fetch suspension status
                const { data: profile } = await window.supabase
                    .from('profiles')
                    .select('status')
                    .eq('id', currentUserId)
                    .single();
                if (profile) {
                    currentUserStatus = profile.status || 'active';
                }

                // Show elements
                const chatBtn = document.getElementById('navbar-chat-btn');
                if (chatBtn) chatBtn.classList.remove('hidden');
                
                const notifBtn = document.getElementById('navbar-notif-btn');
                if (notifBtn) notifBtn.classList.remove('hidden');

                // Boot receivers
                window.initRealtimeMessages();
                updateNavbarUnreadBadge();
                
                window.loadNotifications();
                window.initRealtimeNotifications();
            }
        } catch (e) {
            console.error("Auth check failed:", e);
        }
    };
    checkUser();

    // Close notifications dropdown on click outside
    document.addEventListener('click', e => {
        const dropdown = document.getElementById('notifications-dropdown');
        const notifBtn = document.getElementById('navbar-notif-btn');
        if (dropdown && dropdown.style.display !== 'none' && !dropdown.contains(e.target) && (notifBtn && !notifBtn.contains(e.target))) {
            window.toggleNotificationsDropdown(false);
        }
    });

    // Close search/profile modal on backdrop click
    const sBackdrop = document.getElementById('user-search-backdrop');
    if (sBackdrop) {
        sBackdrop.addEventListener('click', e => {
            if (e.target === sBackdrop) window.closeUserSearchModal();
        });
    }

    const pBackdrop = document.getElementById('user-profile-backdrop');
    if (pBackdrop) {
        pBackdrop.addEventListener('click', e => {
            if (e.target === pBackdrop) window.closeUserProfile();
        });
    }
});
