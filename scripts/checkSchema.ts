import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTable() {
    console.log("Checking for user_settings table...");
    const { data, error } = await supabase.from('user_settings').select('*').limit(1);
    
    if (error) {
        console.error("Error accessing user_settings table:", error);
        if (error.code === '42P01') {
            console.log("CONFIRMED: Table 'user_settings' does not exist.");
        }
    } else {
        console.log("Table 'user_settings' exists.");
        console.log("Columns:", Object.keys(data[0] || {}));
    }
}

checkTable();
