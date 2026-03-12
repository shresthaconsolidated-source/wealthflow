import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function checkAllSchema() {
  console.log('Fetching table list...');
  
  // Querying standard information_schema
  const { data: tables, error: tableError } = await supabase.rpc('get_tables_and_columns');
  
  if (tableError) {
    console.log('RPC failed, trying raw query...');
    const { data: raw, error: rawError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (rawError) {
      console.error('Error fetching users:', rawError);
    } else {
      console.log('Users sample columns:', Object.keys(raw[0] || {}));
    }

    const { data: txRaw } = await supabase.from('transactions').select('*').limit(1);
    console.log('Transactions sample columns:', Object.keys(txRaw?.[0] || {}));
  } else {
    console.log('Tables:', tables);
  }
}

checkAllSchema();
