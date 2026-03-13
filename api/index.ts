import express from "express";
import { createClient } from "@supabase/supabase-js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import compression from "compression";
import rateLimit from "express-rate-limit";

dotenv.config({ path: '.env.local' });

// Ensure the Database URL is present
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
}

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());

const app = express();
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting: 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, 
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Helper for error handling
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware to authenticate /api requests via JWT (skipping auth endpoints)
app.use((req, res, next) => {
  const isApiRoute = req.path.startsWith('/api/') || req.path.startsWith('/auth/');
  const isAuthRoute = req.path === '/api/auth/google' || req.path === '/auth/google';

  if (!isApiRoute || isAuthRoute) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (req as any).user = decoded;
      return next();
    } catch (err) {
      // Token invalid
    }
  }

  return res.status(401).json({ error: "Unauthorized access. No valid session." });
});

let cachedRates: any = null;
let lastRatesFetch = 0;

async function getExchangeRates() {
  const now = Date.now();
  if (cachedRates && (now - lastRatesFetch < 12 * 60 * 60 * 1000)) return cachedRates; // 12 hours
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    if (data && data.rates) {
      cachedRates = data.rates;
      lastRatesFetch = now;
      return cachedRates;
    }
  } catch (err) {
    console.error('Failed to fetch exchange rates', err);
  }
  return cachedRates || { USD: 1, EUR: 0.85, GBP: 0.75, INR: 82.5, NPR: 132.5 };
}

app.get(["/api/exchange-rates", "/exchange-rates"], async (req, res) => {
  const rates = await getExchangeRates();
  res.json(rates);
});

// Auth Route
app.post(["/api/auth/google", "/auth/google"], async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(400).json({ error: "Invalid Google token" });
    }

    const { sub: googleId, email, name, picture } = payload;
    let finalUserId = googleId;

    // Upsert user in database securely
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!existingUser) {
      // New User
      await supabase.from('users').insert({
        id: googleId,
        email,
        name,
        picture
      });

      // We no longer seed default accounts here. The Onboarding Wizard handles it.

      // Seed default categories
      const defaultCategories = [
        { id: 'cat-1-' + googleId, user_id: googleId, name: 'Salary', type: 'income', icon: 'DollarSign', color: '#10b981' },
        { id: 'cat-2-' + googleId, user_id: googleId, name: 'Share Profit', type: 'income', icon: 'TrendingUp', color: '#3b82f6' },
        { id: 'cat-3-' + googleId, user_id: googleId, name: 'Home & Utilities', type: 'expense', icon: 'Home', color: '#ef4444' },
        { id: 'cat-4-' + googleId, user_id: googleId, name: 'Groceries & Dining', type: 'expense', icon: 'ShoppingCart', color: '#f59e0b' },
        { id: 'cat-5-' + googleId, user_id: googleId, name: 'Entertainment', type: 'expense', icon: 'Play', color: '#8b5cf6' }
      ];

      await supabase.from('categories').insert(defaultCategories);

    }

    // Attempt to update last_login_at (wrapped in try-catch in case column doesn't exist yet)
    try {
      await supabase.from('users').update({ 
        name, 
        picture,
        last_login_at: new Date().toISOString() 
      } as any).eq('email', email);
    } catch (e) {
      console.warn("last_login_at column likely missing in users table.");
      await supabase.from('users').update({ name, picture }).eq('email', email);
    }

    // Generate session JWT
    const sessionToken = jwt.sign(
      { id: finalUserId, email, name, picture },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token: sessionToken, user: { id: finalUserId, email, name, picture } });
  } catch (error) {
    console.error("Error verifying Google token:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
});

// API Routes
app.get(["/api/user", "/user"], (req, res) => {
  res.json((req as any).user);
});

app.get(["/api/accounts", "/accounts"], async (req, res) => {
  const userId = (req as any).user.id;
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });

  const { data: txs } = await supabase
    .from('transactions')
    .select('from_account_id, to_account_id, amount, type')
    .eq('user_id', userId);

  const augmentedAccounts = (accounts || []).map(acc => {
    let netChange = 0;
    for (const t of (txs || [])) {
      if (t.type === 'income' && t.to_account_id === acc.id) netChange += Number(t.amount);
      if (t.type === 'expense' && t.from_account_id === acc.id) netChange -= Number(t.amount);
      if (t.type === 'transfer') {
        if (t.to_account_id === acc.id) netChange += Number(t.amount);
        if (t.from_account_id === acc.id) netChange -= Number(t.amount);
      }
    }
    return { ...acc, initial_balance: Number(acc.balance) - netChange };
  });

  res.json(augmentedAccounts);
});

app.post(["/api/accounts", "/accounts"], async (req, res) => {
  const userId = (req as any).user.id;
  const { id, name, type, initial_balance, color, icon } = req.body;

  let finalBalance = Number(initial_balance || 0);

  const { data: existing } = await supabase.from('accounts').select('id, balance').eq('id', id).eq('user_id', userId).single();
  
  if (existing) {
    // If the account exists, the user is editing it.
    // They are providing a new 'initial_balance'.
    // The current balance = new initial_balance + sum of all historical net changes
    const { data: txs } = await supabase
      .from('transactions')
      .select('from_account_id, to_account_id, amount, type')
      .eq('user_id', userId);
      
    let netChange = 0;
    for (const t of (txs || [])) {
      if (t.type === 'income' && t.to_account_id === id) netChange += Number(t.amount);
      if (t.type === 'expense' && t.from_account_id === id) netChange -= Number(t.amount);
      if (t.type === 'transfer') {
        if (t.to_account_id === id) netChange += Number(t.amount);
        if (t.from_account_id === id) netChange -= Number(t.amount);
      }
    }
    // Set the actual db balance to the new initial base + all historical activity
    finalBalance = Number(initial_balance) + netChange;
  }

  const { error } = await supabase.from('accounts').upsert({
    id, user_id: userId, name, type, balance: finalBalance, color, icon
  });

  if (error) {
    console.error("Supabase insert error for accounts:", error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

app.delete(["/api/accounts/:id", "/accounts/:id"], async (req, res) => {
  const userId = (req as any).user.id;
  const accountId = req.params.id;

  const { error } = await supabase.from('accounts').delete().eq('id', accountId).eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get(["/api/categories", "/categories"], async (req, res) => {
  const userId = (req as any).user.id;
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post(["/api/categories", "/categories"], async (req, res) => {
  const userId = (req as any).user.id;
  const { id, name, type, icon, color } = req.body;

  const { error } = await supabase.from('categories').upsert({
    id, user_id: userId, name, type, icon, color
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete(["/api/categories/:id", "/categories/:id"], async (req, res) => {
  const userId = (req as any).user.id;
  const categoryId = req.params.id;

  const { error } = await supabase.from('categories').delete().eq('id', categoryId).eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get(["/api/budgets", "/budgets"], async (req, res) => {
  const userId = (req as any).user.id;
  const { data, error } = await supabase
    .from('budgets')
    .select('*, categories(name, icon, color)')
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post(["/api/budgets", "/budgets"], async (req, res) => {
  const userId = (req as any).user.id;
  const { id, category_id, amount_limit } = req.body;

  const { error } = await supabase.from('budgets').upsert({
    id: id || Math.random().toString(36).substr(2, 9),
    user_id: userId,
    category_id,
    amount_limit
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete(["/api/budgets/:id", "/budgets/:id"], async (req, res) => {
  const userId = (req as any).user.id;
  const budgetId = req.params.id;

  const { error } = await supabase.from('budgets').delete().eq('id', budgetId).eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get(["/api/transactions", "/transactions"], async (req, res) => {
  const userId = (req as any).user.id;
  const { startDate, endDate, categoryId, accountId, search } = req.query;

  let query = supabase
    .from('transactions')
    .select(`
      *,
      accounts!from_account_id(name),
      to_account:accounts!to_account_id(name),
      categories(name)
    `)
    .eq('user_id', userId);

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  
  if (categoryId && categoryId !== 'all') {
    query = query.eq('category_id', categoryId);
  }

  if (accountId && accountId !== 'all') {
    query = query.or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`);
  }

  if (search) {
    query = query.ilike('note', `%${search}%`);
  }

  query = query.order('date', { ascending: false });

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  const formattedData = data.map(t => ({
    ...t,
    from_account_name: t.accounts?.name,
    to_account_name: t.to_account?.name,
    category_name: t.categories?.name
  }));

  res.json(formattedData);
});

app.post(["/api/transactions", "/transactions"], async (req, res) => {
  const userId = (req as any).user.id;
  let { id, from_account_id, to_account_id, category_id, amount, currency, type, date, note } = req.body;
  const baseCurrency = (req as any).headers['x-base-currency'] || 'USD';

  // Fix foreign key constraints: empty strings must be null
  if (!to_account_id) to_account_id = null;
  if (!from_account_id) from_account_id = null;
  if (!category_id) category_id = null;

  // Calculate converted amount for native account balances
  let convertedAmount = Number(amount);
  if (currency && currency !== baseCurrency) {
    const rates = await getExchangeRates();
    const rateSource = rates[currency] || 1;
    const rateTarget = rates[baseCurrency] || 1;
    convertedAmount = (Number(amount) / rateSource) * rateTarget;
  }

  // Use RPC if available, or sequential updates
  const insertPayload = {
    id, user_id: userId, from_account_id, to_account_id, category_id, amount, type, date, note,
    currency: currency || baseCurrency,
    amount_base: convertedAmount
  };

  const { data: newTx, error } = await supabase.from('transactions').insert(insertPayload).select().single();

  if (error) {
    console.error("Supabase insert error for transactions:", error);
    return res.status(500).json({ error: error.message });
  }

  // Update balances sequentially
  try {
    if (type === 'income' && to_account_id) {
      let { data } = await supabase.from('accounts').select('balance').eq('id', to_account_id).single();
      if (data) await supabase.from('accounts').update({ balance: Number(data.balance) + convertedAmount }).eq('id', to_account_id);
    } else if (type === 'expense' && from_account_id) {
      let { data } = await supabase.from('accounts').select('balance').eq('id', from_account_id).single();
      if (data) await supabase.from('accounts').update({ balance: Number(data.balance) - convertedAmount }).eq('id', from_account_id);
    } else if (type === 'transfer' && from_account_id && to_account_id) {
      let { data: fromD } = await supabase.from('accounts').select('balance').eq('id', from_account_id).single();
      if (fromD) await supabase.from('accounts').update({ balance: Number(fromD.balance) - convertedAmount }).eq('id', from_account_id);

      let { data: toD } = await supabase.from('accounts').select('balance').eq('id', to_account_id).single();
      if (toD) await supabase.from('accounts').update({ balance: Number(toD.balance) + convertedAmount }).eq('id', to_account_id);
    }
  } catch (balanceError) {
    console.error("Error updating account balances:", balanceError);
  }

  res.json({ success: true, transaction: newTx });
});

// UPDATE transaction (delete old, insert new to keep balances accurate)
app.put(["/api/transactions/:id", "/transactions/:id"], async (req, res) => {
  const userId = (req as any).user.id;
  const transactionId = req.params.id;
  let { from_account_id, to_account_id, category_id, amount, currency, type, date, note } = req.body;
  const baseCurrency = (req as any).headers['x-base-currency'] || 'USD';

  if (!to_account_id) to_account_id = null;
  if (!from_account_id) from_account_id = null;
  if (!category_id) category_id = null;

  // Fetch old transaction so we can reverse its balance effect
  const { data: old } = await supabase
    .from('transactions').select('*').eq('id', transactionId).eq('user_id', userId).single();

  if (!old) return res.status(404).json({ error: 'Transaction not found' });

  // Reverse old balance effect
  try {
    const oldConvertedAmount = Number(old.amount_base || old.amount);

    if (old.type === 'income' && old.to_account_id) {
      const { data: acc } = await supabase.from('accounts').select('balance').eq('id', old.to_account_id).single();
      if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) - oldConvertedAmount }).eq('id', old.to_account_id);
    } else if (old.type === 'expense' && old.from_account_id) {
      const { data: acc } = await supabase.from('accounts').select('balance').eq('id', old.from_account_id).single();
      if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) + oldConvertedAmount }).eq('id', old.from_account_id);
    } else if (old.type === 'transfer') {
      if (old.from_account_id) {
        const { data: acc } = await supabase.from('accounts').select('balance').eq('id', old.from_account_id).single();
        if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) + oldConvertedAmount }).eq('id', old.from_account_id);
      }
      if (old.to_account_id) {
        const { data: acc } = await supabase.from('accounts').select('balance').eq('id', old.to_account_id).single();
        if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) - oldConvertedAmount }).eq('id', old.to_account_id);
      }
    }
  } catch (e) { console.error('Error reversing balance', e); }

  // Calculate new converted amount
  let newConvertedAmount = Number(amount);
  if (currency && currency !== baseCurrency) {
    const rates = await getExchangeRates();
    const rateSource = rates[currency] || 1;
    const rateTarget = rates[baseCurrency] || 1;
    newConvertedAmount = (Number(amount) / rateSource) * rateTarget;
  }

  // Update the transaction record
  const updatePayload: any = {
    from_account_id, to_account_id, category_id, amount, type, date, note,
    currency: currency || baseCurrency,
    amount_base: newConvertedAmount
  };

  const { data: updatedTx, error } = await supabase.from('transactions').update(updatePayload).eq('id', transactionId).eq('user_id', userId).select().single();

  if (error) return res.status(500).json({ error: error.message });

  // Apply new balance effect
  try {
    if (type === 'income' && to_account_id) {
      const { data: acc } = await supabase.from('accounts').select('balance').eq('id', to_account_id).single();
      if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) + newConvertedAmount }).eq('id', to_account_id);
    } else if (type === 'expense' && from_account_id) {
      const { data: acc } = await supabase.from('accounts').select('balance').eq('id', from_account_id).single();
      if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) - newConvertedAmount }).eq('id', from_account_id);
    } else if (type === 'transfer') {
      if (from_account_id) {
        const { data: acc } = await supabase.from('accounts').select('balance').eq('id', from_account_id).single();
        if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) - newConvertedAmount }).eq('id', from_account_id);
      }
      if (to_account_id) {
        const { data: acc } = await supabase.from('accounts').select('balance').eq('id', to_account_id).single();
        if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) + newConvertedAmount }).eq('id', to_account_id);
      }
    }
  } catch (e) { console.error('Error applying new balance', e); }

  res.json({ success: true, transaction: updatedTx });
});

app.delete(["/api/transactions/:id", "/transactions/:id"], async (req, res) => {
  const userId = (req as any).user.id;
  const transactionId = req.params.id;

  // Fetch old transaction so we can reverse its balance effect
  const { data: old } = await supabase
    .from('transactions').select('*').eq('id', transactionId).eq('user_id', userId).single();

  if (!old) return res.status(404).json({ error: 'Transaction not found' });

  // Reverse old balance effect
  try {
    const oldConvertedAmount = Number(old.amount_base || old.amount);
    if (old.type === 'income' && old.to_account_id) {
      const { data: acc } = await supabase.from('accounts').select('balance').eq('id', old.to_account_id).single();
      if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) - oldConvertedAmount }).eq('id', old.to_account_id);
    } else if (old.type === 'expense' && old.from_account_id) {
      const { data: acc } = await supabase.from('accounts').select('balance').eq('id', old.from_account_id).single();
      if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) + oldConvertedAmount }).eq('id', old.from_account_id);
    } else if (old.type === 'transfer') {
      if (old.from_account_id) {
        const { data: acc } = await supabase.from('accounts').select('balance').eq('id', old.from_account_id).single();
        if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) + oldConvertedAmount }).eq('id', old.from_account_id);
      }
      if (old.to_account_id) {
        const { data: acc } = await supabase.from('accounts').select('balance').eq('id', old.to_account_id).single();
        if (acc) await supabase.from('accounts').update({ balance: Number(acc.balance) - oldConvertedAmount }).eq('id', old.to_account_id);
      }
    }
  } catch (e) {
    console.error('Error reversing balance during deletion', e);
  }

  const { error } = await supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get(["/api/user/settings", "/user/settings"], asyncHandler(async (req: any, res: any) => {
  const userId = (req as any).user.id;
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user settings:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || { base_currency: 'USD' });
  } catch (err: any) {
    console.error("Unexpected error fetching user settings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}));

app.post(["/api/user/settings", "/user/settings"], asyncHandler(async (req: any, res: any) => {
  const userId = (req as any).user.id;
  const { base_currency } = req.body;

  if (!base_currency) {
    return res.status(400).json({ error: "base_currency is required" });
  }

  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, base_currency }, { onConflict: 'user_id' });

    if (error) {
      console.error("Error saving user settings:", error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("Unexpected error saving user settings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}));

// Export transactions as CSV
app.get(["/api/transactions/export", "/transactions/export"], asyncHandler(async (req: any, res: any) => {
  const userId = req.user.id;
  
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      date,
      type,
      amount,
      note,
      from_account:accounts!from_account_id(name),
      to_account:accounts!to_account_id(name),
      categories(name)
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const headers = ['Date', 'Type', 'Amount', 'From Account', 'To Account', 'Category', 'Note'];
  const rows = (data || []).map(t => [
    t.date,
    t.type,
    t.amount,
    (t.from_account as any)?.name || '',
    (t.to_account as any)?.name || '',
    (t.categories as any)?.name || '',
    t.note || ''
  ]);

  const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions_export.csv');
  res.status(200).send(csvContent);
}));


// Admin Stats - Restricted to ADMIN_EMAILS
app.get(["/api/admin/stats", "/admin/stats"], asyncHandler(async (req: any, res: any) => {
  const user = req.user;
  if (!user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  // Aggregate stats
  const [{ data: users }, { data: transactions }] = await Promise.all([
    supabase.from('users').select('id, name, email, picture, created_at').order('created_at', { ascending: false }),
    supabase.from('transactions').select('user_id, date, created_at, amount, type')
  ]);

  // Calculate daily activity
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const stats = (users || []).map(u => {
    const userTxs = (transactions || []).filter(t => t.user_id === u.id);
    const todayCount = userTxs.filter(t => (t.created_at || t.date).startsWith(today)).length;
    const totalCount = userTxs.length;

    // Sort userTxs by date to find most recent
    const sortedTxs = userTxs.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

    return {
      ...u,
      todayCount,
      totalCount,
      lastActive: sortedTxs.length > 0 ? (sortedTxs[0].created_at || sortedTxs[0].date) : u.created_at
    };
  });

  res.json({
    totalUsers: users?.length || 0,
    activeToday: stats.filter(s => s.todayCount > 0).length,
    users: stats
  });
}));

// Global error handler (must be last)
app.use((err: any, req: any, res: any, next: any) => {
  console.error("GLOBAL ERROR CAPTURED:", err.stack || err);
  res.status(500).json({ 
    error: "A server crash was prevented.", 
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack 
  });
});

app.get(["/api/dashboard", "/dashboard"], async (req, res) => {
  const userId = (req as any).user.id;
  const month = req.query.month as string; // YYYY-MM

  const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', userId);

  // Postgres specific date matching requires passing strings
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .like('date', `${month}%`);

  const rates = await getExchangeRates();
  const baseCurrency = (req as any).headers['x-base-currency'] || 'USD';
  const targetRate = rates[baseCurrency] || 1;

  const convert = (amount: number, fromCurrency: string) => {
    // If no currency is recorded (legacy), assume it was already in the BASE currency 
    // to prevent inflation (USD -> NPR multiplication errors)
    if (!fromCurrency || fromCurrency === baseCurrency) return amount;
    const sourceRate = rates[fromCurrency] || 1;
    return (amount / sourceRate) * targetRate;
  };

  const totalNetWorth = (accounts || []).reduce((acc: number, curr: any) => acc + Number(curr.balance), 0);
  const monthlyIncome = (transactions || []).filter((t: any) => t.type === 'income').reduce((acc: number, curr: any) => acc + convert(Number(curr.amount), curr.currency), 0);
  const monthlyExpense = (transactions || []).filter((t: any) => t.type === 'expense').reduce((acc: number, curr: any) => acc + convert(Number(curr.amount), curr.currency), 0);
  const monthlySavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  // Fetch budgets and calculate spending
  const { data: budgets } = await supabase
    .from('budgets')
    .select('*, categories(name, icon, color)')
    .eq('user_id', userId);

  const budgetProgress = (budgets || []).map(b => {
    let spent = 0;
    if (b.category_id) {
      spent = (transactions || [])
        .filter((t: any) => t.type === 'expense' && t.category_id === b.category_id)
        .reduce((s: number, t: any) => s + convert(Number(t.amount), t.currency), 0);
    } else {
      // Global Budget (All Expenses)
      spent = (transactions || [])
        .filter((t: any) => t.type === 'expense')
        .reduce((s: number, t: any) => s + convert(Number(t.amount), t.currency), 0);
    }
    
    return {
      ...b,
      spent,
      limit: Number(b.amount_limit),
      is_global: !b.category_id
    };
  });

  res.json({
    totalNetWorth,
    monthlyIncome,
    monthlyExpense,
    monthlySavings,
    savingsRate,
    accounts: accounts || [],
    budgets: budgetProgress
  });
});

app.get(["/api/dashboard/history", "/dashboard/history"], async (req, res) => {
  const userId = (req as any).user.id;
  const months = Math.min(parseInt(req.query.months as string || '12'), 24);

  const { data: accounts } = await supabase.from('accounts').select('balance').eq('user_id', userId);
  const currentNetWorth = (accounts || []).reduce((s: number, a: any) => s + Number(a.balance), 0);

  const { data: allTx } = await supabase
    .from('transactions')
    .select('amount,type,date,currency')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  const rates = await getExchangeRates();
  const baseCurrency = (req as any).headers['x-base-currency'] || 'USD';
  const targetRate = rates[baseCurrency] || 1;

  const convert = (amount: number, fromCurrency: string) => {
    // If no currency is recorded (legacy), assume it was already in the BASE currency 
    // to prevent inflation (USD -> NPR multiplication errors)
    if (!fromCurrency || fromCurrency === baseCurrency) return amount;
    const sourceRate = rates[fromCurrency] || 1;
    return (amount / sourceRate) * targetRate;
  };

  // Build map of monthly aggregates
  const monthMap: Record<string, { income: number; expense: number }> = {};
  for (const t of (allTx || [])) {
    const key = t.date.slice(0, 7); // YYYY-MM
    if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0 };
    const convertedAmount = convert(Number(t.amount), t.currency);
    if (t.type === 'income') monthMap[key].income += convertedAmount;
    if (t.type === 'expense') monthMap[key].expense += convertedAmount;
  }

  // Walk backwards from current net worth to reconstruct historical net worth
  const result = [];
  let runningNW = currentNetWorth;
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const { income = 0, expense = 0 } = monthMap[key] || {};
    const savings = income - expense;
    result.push({ month: key, label, income, expense, savings, netWorth: runningNW });
    // Going backwards: subtract the net effect of this month to get prior month end
    runningNW -= savings;
  }

  res.json(result.reverse());
});

app.post(["/api/maintenance/sync-balances", "/maintenance/sync-balances"], async (req, res) => {
  const userId = (req as any).user.id;
  
  try {
    const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', userId);
    const { data: txs } = await supabase.from('transactions').select('from_account_id, to_account_id, amount, type').eq('user_id', userId);

    if (!accounts) return res.json({ success: true, updated: 0 });

    let updatedCount = 0;
    for (const acc of accounts) {
      let netChange = 0;
      for (const t of (txs || [])) {
        const amount = Number((t as any).amount_base || t.amount);
        if (t.type === 'income' && t.to_account_id === acc.id) netChange += amount;
        if (t.type === 'expense' && t.from_account_id === acc.id) netChange -= amount;
        if (t.type === 'transfer') {
          if (t.to_account_id === acc.id) netChange += amount;
          if (t.from_account_id === acc.id) netChange -= amount;
        }
      }

      // We don't have a separate initialBalance column, but most corrupted accounts 
      // are due to the netChange being added multiple times to the current 'balance'.
      // Resetting to netChange (initial=0) is the most standard 'healing' action.
      await supabase.from('accounts').update({ balance: netChange }).eq('id', acc.id);
      updatedCount++;
    }
    res.json({ success: true, updated: updatedCount });
  } catch (e: any) {
    console.error("Sync Balances error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.delete(["/api/user/delete", "/user/delete"], asyncHandler(async (req: any, res: any) => {
  const userId = req.user.id;

  // Delete all user data securely
  // Using Promise.all for parallel deletion of child records to avoid orphaned data
  try {
    await Promise.all([
      supabase.from('transactions').delete().eq('user_id', userId),
      supabase.from('user_settings').delete().eq('user_id', userId),
      supabase.from('budgets').delete().eq('user_id', userId) // Even if table doesn't exist yet, it's safe to include
    ]);

    // Categories and Accounts might be referenced by other things, but we deleted transactions first
    await Promise.all([
      supabase.from('accounts').delete().eq('user_id', userId),
      supabase.from('categories').delete().eq('user_id', userId),
    ]);

    // Finally delete the user
    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) {
      console.error("Error deleting user:", error);
      return res.status(500).json({ error: "Failed to delete account from database." });
    }

    res.json({ success: true, message: "Account deleted successfully." });
  } catch (err: any) {
    console.error("Unexpected error during account deletion:", err);
    res.status(500).json({ error: "Internal server error during deletion." });
  }
}));

export default app;
