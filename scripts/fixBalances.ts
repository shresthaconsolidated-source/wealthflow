import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: 'C:/Users/Acer/.gemini/antigravity/scratch/wealthflow/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBalances() {
    console.log("Fetching accounts and transactions...");

    const { data: accounts, error: errA } = await supabase.from('accounts').select('*');
    const { data: transactions, error: errT } = await supabase.from('transactions').select('*');

    if (errA || errT) {
        console.error("Error fetching", errA, errT);
        return;
    }

    const balances: Record<string, number> = {};
    for (const acc of accounts) {
        balances[acc.id] = 0;
    }

    for (const t of transactions) {
        const amount = Number(t.amount);
        if (t.type === 'income') {
            // NEW transactions have to_account_id set. Legacy (pre-fix) ones only had from_account_id.
            const targetId = t.to_account_id || t.from_account_id;
            if (targetId && balances[targetId] !== undefined) balances[targetId] += amount;
        } else if (t.type === 'expense' && t.from_account_id) {
            if (balances[t.from_account_id] !== undefined) balances[t.from_account_id] -= amount;
        } else if (t.type === 'transfer' && t.from_account_id && t.to_account_id) {
            if (balances[t.from_account_id] !== undefined) balances[t.from_account_id] -= amount;
            if (balances[t.to_account_id] !== undefined) balances[t.to_account_id] += amount;
        }
    }

    console.log("New balances computed:", balances);

    for (const [id, bal] of Object.entries(balances)) {
        console.log(`Updating account ${id} to ${bal}`);
        await supabase.from('accounts').update({ balance: bal }).eq('id', id);
    }

    console.log("Done fixing balances.");
}

fixBalances();
