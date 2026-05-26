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
    const displayRole = (profile.role && profile.role.toLowerCase() === 'musician') ? 'Performer' : (profile.role || 'User');
    document.getElementById('profile-role-badge').textContent = displayRole;
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

    // Rellenar todos los campos del formulario
    const textFields = [
        'performer_name', 'foundation_year', 'entity_type', 'bio', 'base_city', 'website',
        'standard_instrumentation', 'repertoire_focus', 'tech_capabilities',
        'soundcloud_url', 'spotify_url', 'youtube_url',
        'booking_contact_name', 'public_booking_email'
    ];

    textFields.forEach(id => {
        const el = document.getElementById(id);
        if (el && profile[id] !== undefined && profile[id] !== null) {
            el.value = profile[id];
        }
    });

    // Casos especiales: Fecha y Toggles
    if (profile.dob) {
        const dobEl = document.getElementById('dob');
        if (dobEl) dobEl.value = profile.dob;
    }

    const comms = document.getElementById('call_for_scores_status');
    if (comms) comms.checked = !!profile.call_for_scores_status;

    const collab = document.getElementById('open_to_collaboration');
    if (collab) collab.checked = !!profile.open_to_collaboration;

    calculateProgress(profile);
}

function calculateProgress(data) {
    let completed = 0;
    const totalKeyFields = 5;

    // 1. Nombre (performer_name)
    if (data.performer_name && typeof data.performer_name === 'string' && data.performer_name.trim() !== '') completed++;
    // 2. Tipo de entidad (entity_type)
    if (data.entity_type && typeof data.entity_type === 'string' && data.entity_type.trim() !== '') completed++;
    // 3. Año de fundación (foundation_year)
    if (data.foundation_year && String(data.foundation_year).trim() !== '') completed++;
    // 4. Ciudad base / Nacionalidad
    if (data.base_city && typeof data.base_city === 'string' && data.base_city.trim() !== '') completed++;
    // 5. Bio
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
        performer_name: getVal('performer_name'),
        foundation_year: getVal('foundation_year'),
        entity_type: getVal('entity_type'),
        bio: getVal('bio'),
        base_city: getVal('base_city'),
        website: getVal('website'),
        standard_instrumentation: getVal('standard_instrumentation'),
        repertoire_focus: getVal('repertoire_focus'),
        tech_capabilities: getVal('tech_capabilities'),
        soundcloud_url: getVal('soundcloud_url'),
        spotify_url: getVal('spotify_url'),
        youtube_url: getVal('youtube_url'),
        booking_contact_name: getVal('booking_contact_name'),
        public_booking_email: getVal('public_booking_email'),
        call_for_scores_status: document.getElementById('call_for_scores_status').checked,
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
            window.location.href = 'musician.html';
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
