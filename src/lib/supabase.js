
import { createClient } from '@supabase/supabase-js';

// TODO: Move these to .env.local once file permission issues are resolved
const supabaseUrl = 'https://nuzrqknjkadyifjqqyqh.supabase.co';
const supabaseKey = 'sb_publishable_2qPDJWfN_8BeZZfCOwVB4g_iqkjwuBT';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true
    },
    global: {
        headers: { 'x-application-name': 'material-inward' }
    }
});

// Log connection attempt
console.log('Supabase Client Initialized', { url: supabaseUrl });
