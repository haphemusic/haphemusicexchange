import supabase from './supabase.js';

let currentProfileData = {};


async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // Cargamos los datos más recientes
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !profile) {
        console.error("Error loading profile:", error);
        return;
    }

    console.log("📊 CURRENT PROFILE STATE:");
    console.table(profile);
    
    currentProfileData = profile;

    // Rellenar Nombre y Rol en el Header del perfil
    const firstName = profile.first_name || '---';
    const lastName = profile.last_name || '---';
    document.getElementById('profile-full-name').textContent = `${firstName} ${lastName}`;
    document.getElementById('profile-role-badge').textContent = profile.role || 'User';
    document.getElementById('profile-initials').textContent = (firstName[0] !== '-' ? firstName[0] : '?') + (lastName[0] !== '-' ? lastName[0] : '?');

    // Cargar Avatar si existe
    if (profile.avatar_url) {
        const preview = document.getElementById('profile-avatar-preview');
        const initials = document.getElementById('profile-initials');
        if (preview && initials) {
            preview.src = profile.avatar_url;
            preview.classList.remove('hidden');
            initials.classList.add('hidden');
        }
    }

    // Populate select country dropdowns with correct pre-selected values from DB
    const countrySelectFields = ['nationality', 'country_of_birth'];
    const allTextFields = [
        'first_name', 'last_name', 'username', 'bio', 'gender', 'place_of_birth', 'website',
        'main_aesthetic', 'education', 'awards', 'copyright_society',
        'soundcloud_url', 'spotify_url', 'youtube_url', 'public_contact_email',
        'residence_country'
    ];

    allTextFields.forEach(id => {
        const el = document.getElementById(id);
        if (el && profile[id] !== undefined && profile[id] !== null) {
            el.value = profile[id];
        }
    });

    // For country selects: set value after options are populated (via DOMContentLoaded inline script)
    countrySelectFields.forEach(id => {
        const el = document.getElementById(id);
        if (el && profile[id]) {
            // Wait a tick to ensure options are populated by the inline module script
            setTimeout(() => { el.value = profile[id]; }, 50);
        }
    });

    // Casos especiales: Fecha y Toggles
    if (profile.dob) {
        const dobEl = document.getElementById('dob');
        if (dobEl) dobEl.value = profile.dob;
    }

    const comms = document.getElementById('accepting_commissions');
    if (comms) comms.checked = !!profile.accepting_commissions;

    const collab = document.getElementById('open_to_collaboration');
    if (collab) collab.checked = !!profile.open_to_collaboration;

    calculateProgress(profile);
}

function calculateProgress(data) {
    let completed = 0;
    const totalKeyFields = 4;

    // 1. Nombre (first_name)
    if (data.first_name && typeof data.first_name === 'string' && data.first_name.trim() !== '') completed++;
    // 2. Foto (avatar_url)
    if (data.avatar_url && typeof data.avatar_url === 'string' && data.avatar_url.trim() !== '') completed++;
    // 3. Nacionalidad
    if (data.nationality && typeof data.nationality === 'string' && data.nationality.trim() !== '') completed++;
    // 4. Bio
    if (data.bio && typeof data.bio === 'string' && data.bio.trim() !== '') completed++;

    const progress = Math.min(100, Math.round((completed / totalKeyFields) * 100));
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (progressBar && progressText) {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}% Complete`;
        if (progress === 100) {
            progressBar.style.backgroundColor = '#10B981';
        } else {
            progressBar.style.backgroundColor = '#E57373';
        }
    }
    return progress;
}

async function saveProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const getVal = (id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        return el.value.trim() === "" ? null : el.value.trim();
    };

    const updates = {
        first_name: getVal('first_name'),
        last_name: getVal('last_name'),
        username: getVal('username'),
        bio: getVal('bio'),
        nationality: getVal('nationality'),
        gender: getVal('gender'),
        country_of_birth: getVal('country_of_birth'),
        place_of_birth: getVal('place_of_birth'),
        website: getVal('website'),
        main_aesthetic: getVal('main_aesthetic'),
        education: getVal('education'),
        awards: getVal('awards'),
        copyright_society: getVal('copyright_society'),
        soundcloud_url: getVal('soundcloud_url'),
        spotify_url: getVal('spotify_url'),
        youtube_url: getVal('youtube_url'),
        public_contact_email: getVal('public_contact_email'),
        accepting_commissions: document.getElementById('accepting_commissions').checked,
        open_to_collaboration: document.getElementById('open_to_collaboration').checked,
        updated_at: new Date()
    };

    const mergedData = { ...currentProfileData, ...updates };
    const progress = calculateProgress(mergedData);
    updates.is_complete = (progress === 100);

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)
        .select();

    if (error) {
        alert("Error: " + error.message);
    } else if (data && data.length > 0) {
        const toast = document.getElementById('save-success');
        if (toast) {
            toast.classList.remove('translate-y-32', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        }
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } else {
        alert("Warning: No data saved. Please check your Supabase RLS policies.");
    }
}

async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const userId = session.user.id;
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`; 

    console.log("📤 Uploading avatar to Avatar bucket:", filePath);

    // 1. Subir al storage (Bucket: Avatar)
    const { error: uploadError } = await supabase.storage
        .from('Avatar')
        .upload(filePath, file);

    if (uploadError) {
        console.error("Upload error details:", uploadError);
        alert("Supabase Error: " + uploadError.message + " (Check if bucket name 'Avatar' is exactly the same and Public)");
        return;
    }

    // 2. Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
        .from('Avatar')
        .getPublicUrl(filePath);

    // 3. Actualizar tabla profiles
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

    if (updateError) {
        alert("Error updating profile URL: " + updateError.message);
    } else {
        // 4. Actualizar UI
        const preview = document.getElementById('profile-avatar-preview');
        const initials = document.getElementById('profile-initials');
        if (preview && initials) {
            preview.src = publicUrl;
            preview.classList.remove('hidden');
            initials.classList.add('hidden');
        }
        currentProfileData.avatar_url = publicUrl;
        calculateProgress(currentProfileData);
    }
}

window.saveProfile = saveProfile;
window.uploadAvatar = uploadAvatar;
document.addEventListener('DOMContentLoaded', loadProfile);
