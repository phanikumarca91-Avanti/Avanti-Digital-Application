
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nuzrqknjkadyifjqqyqh.supabase.co';
const supabaseKey = 'sb_publishable_2qPDJWfN_8BeZZfCOwVB4g_iqkjwuBT'; // Using the key from src/lib/supabase.js

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTable() {
    console.log("Checking 'sales_dispatch_assignments' table...");
    try {
        const { data, error } = await supabase.from('sales_dispatch_assignments').select('*').limit(1);

        if (error) {
            console.error("Error accessing table:", error.message, error.code);
            if (error.code === '42P01') { // undefined_table
                console.error("CONCLUSION: TABLE MISSING");
            } else {
                console.error("CONCLUSION: ACCESS ERROR (RLS or other)");
            }
        } else {
            console.log("CONCLUSION: TABLE EXISTS");
        }
    } catch (e) {
        console.error("Unexpected error:", e);
    }
}

verifyTable();
