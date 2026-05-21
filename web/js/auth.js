import supabase from './supabase.js';

window.supabase = supabase;
window.supabaseClient = supabase;

/**
 * Verifica si el usuario está autenticado y tiene los permisos necesarios.
 */
async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    const path = window.location.pathname;
    console.log("🔍 Checking auth for path:", path);
    
    const isLoginPage = path.includes('login.html');
    const isProfilePage = path.includes('profile');
    const isPublicPage = path.includes('index.html') || path === '/' || path.endsWith('web/');
    
    if (!session && !isLoginPage && !isPublicPage) {
        console.warn("⚠️ No session found, redirecting to login...");
        window.location.href = 'login.html';
        return;
    }

    if (session) {
        console.log("✅ Session active for:", session.user.email);
        
        // Obtener el perfil con el rol y estado de completitud
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, is_complete')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile) {
            console.error("❌ Profile not found or database error:", profileError);
            
            // SI estamos en la página de perfil, permitimos seguir para que profile.js intente arreglarlo
            if (isProfilePage) {
                console.log("🛠️ User is on profile page, allowing access to complete setup.");
                actualizarInterfaz(session.user, 'user', false);
                return;
            }

            if (!isPublicPage && !isLoginPage) {
                alert("Your profile was not found. Please go to your profile settings to complete it.");
                window.location.href = 'index.html'; // Default safe zone
            }
            actualizarInterfaz(session.user, 'user', false);
            return;
        }

        const role = profile.role ? profile.role.toLowerCase().trim() : 'user';
        const isComplete = profile.is_complete;
        console.log("👤 User role:", role, "| Complete:", isComplete);

        // Actualizar el timestamp de última actividad de manera asíncrona (Online indicator)
        supabase.from('profiles')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', session.user.id)
            .then(({ error }) => {
                if (error) console.warn("Failed to update last active:", error);
            });

        // Protección de rutas: Redirigir si el usuario intenta entrar en un dashboard que no le toca
        const path = window.location.pathname;
        if (path.includes('admin.html') && role !== 'admin') window.location.href = 'index.html';
        if (path.includes('composer.html') && role !== 'composer') window.location.href = 'index.html';
        if (path.includes('musician.html') && role !== 'musician') window.location.href = 'index.html';
        
        actualizarInterfaz(session.user, role, isComplete);
    }
}

/**
 * Función principal de Login real con Supabase
 */
async function intentarLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    } else {
        errorDiv.classList.add('hidden');
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
        
        const role = profile?.role ? profile.role.toLowerCase().trim() : 'user';
        
        if (role === 'admin') window.location.href = 'admin.html';
        else if (role === 'composer') window.location.href = 'composer.html';
        else if (role === 'musician') window.location.href = 'musician.html';
        else window.location.href = 'index.html';
    }
}

function actualizarInterfaz(user, role, isComplete) {
    const loginBtn = document.querySelector('a[href="login.html"]');
    if (loginBtn) {
        const normRole = role.toLowerCase().trim();
        let dashboardUrl = 'index.html';
        let profileUrl = 'profile-composer.html';
        
        if (normRole === 'admin') dashboardUrl = 'admin.html';
        else if (normRole === 'composer') { dashboardUrl = 'composer.html'; profileUrl = 'profile-composer.html'; }
        else if (normRole === 'musician') { dashboardUrl = 'musician.html'; profileUrl = 'profile-musician.html'; }

        const statusColor = isComplete ? 'text-emerald-400' : 'text-amber-400';
        const statusIcon = isComplete ? 'check_circle' : 'warning';
        const statusText = isComplete ? 'Verified Profile' : 'Incomplete Profile';

        loginBtn.outerHTML = `
            <div class="flex items-center gap-4">
                <a href="${profileUrl}" class="flex flex-col items-end hidden md:flex hover:opacity-80 transition-all group">
                    <div class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px] ${statusColor}">${statusIcon}</span>
                        <span class="text-[10px] font-bold text-salmon uppercase tracking-widest group-hover:text-white transition-colors">${role}</span>
                    </div>
                    <span class="text-[10px] ${statusColor} font-medium">${statusText}</span>
                </a>
                <a href="${dashboardUrl}" class="px-6 py-2 rounded-full bg-salmon text-white font-medium hover:brightness-110 transition-all duration-300 active:scale-95 text-sm relative">
                    Dashboard
                    ${!isComplete ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 border-2 border-slate-900 rounded-full"></span>' : ''}
                </a>
                <button id="logout-btn" class="p-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-rose-500/20 hover:text-rose-400 transition-all duration-300">
                    <span class="material-symbols-outlined">logout</span>
                </button>
            </div>
        `;
        document.getElementById('logout-btn').addEventListener('click', logout);
    }
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

/**
 * Función para registrar nuevos usuarios con Perfil Progresivo
 */
async function intentarRegistro() {
    const firstName = document.getElementById('reg-firstname').value;
    const lastName = document.getElementById('reg-lastname').value;
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const dob = document.getElementById('reg-dob').value;
    const country = document.getElementById('reg-country').value;
    const password = document.getElementById('reg-password').value;
    const role = document.querySelector('#form-register input[name="role"]:checked').value;
    
    const errorDiv = document.getElementById('login-error');
    const privacyChecked = document.getElementById('reg-privacy').checked;

    if (!privacyChecked) {
        errorDiv.textContent = "You must accept the Privacy Policy to continue.";
        errorDiv.classList.remove('hidden');
        return;
    }

    console.log("🚀 Registering user:", username);

    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                username: username,
                dob: dob,
                residence_country: country,
                initial_role: role
            }
        }
    });

    if (error) {
        console.error("Error de registro:", error);
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    } else {
        alert("Account created! Check your email and then log in to complete your profile.");
        window.location.reload();
    }
}

// Exponer funciones al scope global
window.intentarLogin = intentarLogin;
window.intentarRegistro = intentarRegistro;
window.logout = logout;

document.addEventListener('DOMContentLoaded', checkAuth);
