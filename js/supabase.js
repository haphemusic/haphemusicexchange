import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Inicializar el cliente de Supabase
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default client;
