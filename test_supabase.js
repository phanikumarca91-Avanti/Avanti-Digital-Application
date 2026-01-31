
import { supabase } from './src/lib/supabase.js';

async function testConnection() {
    console.log("Testing Supabase Connection...");
    try {
        const { data, error } = await supabase.from('vehicles').select('*').limit(1);
        if (error) {
            // expected error as table doesn't exist yet, but proves connection reached server
            console.log("Connection Reached Server! (Error expected as table missing):", error.message);
        } else {
            console.log("Connection Successful! Data:", data);
        }
    } catch (e) {
        console.error("Connection Failed completely:", e);
    }
}

testConnection();
