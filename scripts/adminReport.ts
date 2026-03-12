import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function generatePulseReport() {
  console.log('\n📊 WEALTHFLOW ADMIN PULSE REPORT');
  console.log('====================================');
  console.log(`Generated: ${new Date().toLocaleString()}\n`);

  try {
    // 1. User Stats
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false });

    if (userError) throw userError;

    // 2. Transaction Activity (Last 48 hours)
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('user_id, date, created_at')
      .gte('date', yesterday);

    if (txError) throw txError;

    console.log(`✅ Total Users: ${users.length}`);
    
    // New users in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const newUsers = users.filter(u => new Date(u.created_at) > sevenDaysAgo);
    console.log(`📈 New Users (7d): ${newUsers.length}`);

    console.log('\n--- DAILY TRANSACTION ACTIVITY ---');
    const today = new Date().toISOString().split('T')[0];
    
    const userActivity = users.map(u => {
      const todayCount = transactions?.filter(t => t.user_id === u.id && (t.date === today || t.created_at?.startsWith(today))).length || 0;
      const yesterdayCount = transactions?.filter(t => t.user_id === u.id && (t.date === yesterday || t.created_at?.startsWith(yesterday))).length || 0;
      return {
        name: u.name,
        email: u.email,
        today: todayCount,
        yesterday: yesterdayCount
      };
    }).filter(a => a.today > 0 || a.yesterday > 0);

    if (userActivity.length === 0) {
      console.log('No transaction activity recorded today or yesterday.');
    } else {
      console.table(userActivity);
    }

    console.log('\n--- RECENT SIGNUPS ---');
    console.table(users.slice(0, 5).map(u => ({
      Name: u.name,
      Email: u.email,
      Joined: new Date(u.created_at).toLocaleDateString()
    })));

  } catch (error: any) {
    console.error('❌ Error generating report:', error.message);
  }
  
  console.log('\n====================================');
}

generatePulseReport();
