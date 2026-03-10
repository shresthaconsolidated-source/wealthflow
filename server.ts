import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the Database URL is present
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

// Connect to Supabase via JS Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// We assume the user has created the tables in the Supabase Dashboard SQL Editor already.

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // STRICT Middleware to authenticate requests via JWT
  app.use((req, res, next) => {
    // Skip auth for non-API routes (allow Vite frontend to load)
    if (!req.path.startsWith('/api')) {
      return next();
    }
    if (req.path === '/api/auth/google') {
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
        // Token invalid, fall through to 401
      }
    }

    return res.status(401).json({ error: "Unauthorized access. No valid session." });
  });

  // Auth Route
  app.post("/api/auth/google", async (req, res) => {
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

        // Seed default accounts
        const defaultAccounts = [
          { id: 'acc-1-' + googleId, user_id: googleId, name: 'Main Bank', type: 'bank', balance: 0, icon: 'Wallet', color: '#3b82f6' },
          { id: 'acc-2-' + googleId, user_id: googleId, name: 'Bank 2', type: 'bank', balance: 0, icon: 'CreditCard', color: '#10b981' },
          { id: 'acc-3-' + googleId, user_id: googleId, name: 'Petty Cash', type: 'cash', balance: 0, icon: 'DollarSign', color: '#f59e0b' },
          { id: 'acc-4-' + googleId, user_id: googleId, name: 'Shares', type: 'asset', balance: 0, icon: 'Briefcase', color: '#6366f1' },
          { id: 'acc-5-' + googleId, user_id: googleId, name: 'FD', type: 'asset', balance: 0, icon: 'Target', color: '#8b5cf6' }
        ];

        // Seed default categories
        const defaultCategories = [
          { id: 'cat-1-' + googleId, user_id: googleId, name: 'Salary', type: 'income', icon: 'DollarSign', color: '#10b981' },
          { id: 'cat-2-' + googleId, user_id: googleId, name: 'Share Profit', type: 'income', icon: 'TrendingUp', color: '#3b82f6' },
          { id: 'cat-3-' + googleId, user_id: googleId, name: 'Home & Utilities', type: 'expense', icon: 'Home', color: '#ef4444' },
          { id: 'cat-4-' + googleId, user_id: googleId, name: 'Groceries & Dining', type: 'expense', icon: 'ShoppingCart', color: '#f59e0b' },
          { id: 'cat-5-' + googleId, user_id: googleId, name: 'Entertainment', type: 'expense', icon: 'Play', color: '#8b5cf6' }
        ];

        await supabase.from('accounts').insert(defaultAccounts);
        await supabase.from('categories').insert(defaultCategories);

      } else {
        finalUserId = existingUser.id;
        await supabase
          .from('users')
          .update({ name, picture })
          .eq('email', email);
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
  app.get("/api/user", (req, res) => {
    res.json((req as any).user);
  });

  app.get("/api/accounts", async (req, res) => {
    const userId = (req as any).user.id;
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/accounts", async (req, res) => {
    const userId = (req as any).user.id;
    const { id, name, type, balance, color, icon } = req.body;

    const { error } = await supabase.from('accounts').insert({
      id, user_id: userId, name, type, balance, color, icon
    });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/categories", async (req, res) => {
    const userId = (req as any).user.id;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/categories", async (req, res) => {
    const userId = (req as any).user.id;
    const { id, name, type, icon, color } = req.body;

    const { error } = await supabase.from('categories').insert({
      id, user_id: userId, name, type, icon, color
    });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/transactions", async (req, res) => {
    const userId = (req as any).user.id;

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        accounts!from_account_id(name),
        to_account:accounts!to_account_id(name),
        categories(name)
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const formattedData = data.map(t => ({
      ...t,
      from_account_name: t.accounts?.name,
      to_account_name: t.to_account?.name,
      category_name: t.categories?.name
    }));

    res.json(formattedData);
  });

  app.post("/api/transactions", async (req, res) => {
    const userId = (req as any).user.id;
    const { id, from_account_id, to_account_id, category_id, amount, type, date, note } = req.body;

    // Use RPC if available, or sequential updates
    const { error } = await supabase.from('transactions').insert({
      id, user_id: userId, from_account_id, to_account_id, category_id, amount, type, date, note
    });

    if (error) return res.status(500).json({ error: error.message });

    // Update balances sequentially
    if (type === 'income' && to_account_id) {
      let { data } = await supabase.from('accounts').select('balance').eq('id', to_account_id).single();
      if (data) await supabase.from('accounts').update({ balance: Number(data.balance) + Number(amount) }).eq('id', to_account_id);
    } else if (type === 'expense' && from_account_id) {
      let { data } = await supabase.from('accounts').select('balance').eq('id', from_account_id).single();
      if (data) await supabase.from('accounts').update({ balance: Number(data.balance) - Number(amount) }).eq('id', from_account_id);
    } else if (type === 'transfer' && from_account_id && to_account_id) {
      let { data: fromD } = await supabase.from('accounts').select('balance').eq('id', from_account_id).single();
      if (fromD) await supabase.from('accounts').update({ balance: Number(fromD.balance) - Number(amount) }).eq('id', from_account_id);

      let { data: toD } = await supabase.from('accounts').select('balance').eq('id', to_account_id).single();
      if (toD) await supabase.from('accounts').update({ balance: Number(toD.balance) + Number(amount) }).eq('id', to_account_id);
    }

    res.json({ success: true });
  });

  app.get("/api/dashboard", async (req, res) => {
    const userId = (req as any).user.id;
    const month = req.query.month as string; // YYYY-MM

    const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', userId);

    // Postgres specific date matching requires passing strings
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .like('date', `${month}%`);

    const totalNetWorth = (accounts || []).reduce((acc: number, curr: any) => acc + Number(curr.balance), 0);
    const monthlyIncome = (transactions || []).filter((t: any) => t.type === 'income').reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    const monthlyExpense = (transactions || []).filter((t: any) => t.type === 'expense').reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    const monthlySavings = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    res.json({
      totalNetWorth,
      monthlyIncome,
      monthlyExpense,
      monthlySavings,
      savingsRate,
      accounts: accounts || []
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
