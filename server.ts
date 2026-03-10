import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("finance.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    picture TEXT
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    type TEXT, -- 'cash', 'bank', 'asset'
    balance DECIMAL(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    color TEXT,
    icon TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    type TEXT, -- 'income', 'expense'
    icon TEXT,
    color TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    from_account_id TEXT,
    to_account_id TEXT,
    category_id TEXT,
    amount DECIMAL(15, 2),
    type TEXT, -- 'income', 'expense', 'transfer'
    date TEXT,
    note TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(from_account_id) REFERENCES accounts(id),
    FOREIGN KEY(to_account_id) REFERENCES accounts(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  -- Seed initial data for demo user
  INSERT OR IGNORE INTO users (id, email, name) VALUES ('demo-user', 'demo@example.com', 'Demo User');
  
  INSERT OR IGNORE INTO accounts (id, user_id, name, type, balance, color, icon) VALUES 
  ('acc-1', 'demo-user', 'Main Bank', 'bank', 25000, '#10b981', 'CreditCard'),
  ('acc-2', 'demo-user', 'Savings', 'bank', 45000, '#3b82f6', 'Wallet'),
  ('acc-3', 'demo-user', 'Petty Cash', 'cash', 500, '#f59e0b', 'DollarSign'),
  ('acc-4', 'demo-user', 'Investment Portfolio', 'asset', 120000, '#8b5cf6', 'TrendingUp');

  INSERT OR IGNORE INTO categories (id, user_id, name, type, icon, color) VALUES 
  ('cat-1', 'demo-user', 'Salary', 'income', 'DollarSign', '#10b981'),
  ('cat-2', 'demo-user', 'Freelance', 'income', 'Briefcase', '#3b82f6'),
  ('cat-3', 'demo-user', 'Rent', 'expense', 'Home', '#ef4444'),
  ('cat-4', 'demo-user', 'Groceries', 'expense', 'ShoppingCart', '#f59e0b'),
  ('cat-5', 'demo-user', 'Entertainment', 'expense', 'Play', '#8b5cf6');
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock Auth for now (will implement real Google OAuth later)
  // In a real app, we'd use a session/JWT
  app.use((req, res, next) => {
    // For demo purposes, we'll use a hardcoded user if not provided
    // In production, this would come from a verified token
    (req as any).user = { id: 'demo-user', email: 'demo@example.com' };
    next();
  });

  // API Routes
  app.get("/api/user", (req, res) => {
    res.json((req as any).user);
  });

  app.get("/api/accounts", (req, res) => {
    const userId = (req as any).user.id;
    const accounts = db.prepare("SELECT * FROM accounts WHERE user_id = ?").all(userId);
    res.json(accounts);
  });

  app.post("/api/accounts", (req, res) => {
    const userId = (req as any).user.id;
    const { id, name, type, balance, color, icon } = req.body;
    db.prepare("INSERT INTO accounts (id, user_id, name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, userId, name, type, balance, color, icon);
    res.json({ success: true });
  });

  app.get("/api/categories", (req, res) => {
    const userId = (req as any).user.id;
    const categories = db.prepare("SELECT * FROM categories WHERE user_id = ?").all(userId);
    res.json(categories);
  });

  app.post("/api/categories", (req, res) => {
    const userId = (req as any).user.id;
    const { id, name, type, icon, color } = req.body;
    db.prepare("INSERT INTO categories (id, user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)")
      .run(id, userId, name, type, icon, color);
    res.json({ success: true });
  });

  app.get("/api/transactions", (req, res) => {
    const userId = (req as any).user.id;
    const transactions = db.prepare(`
      SELECT t.*, 
             fa.name as from_account_name, 
             ta.name as to_account_name, 
             c.name as category_name 
      FROM transactions t
      LEFT JOIN accounts fa ON t.from_account_id = fa.id
      LEFT JOIN accounts ta ON t.to_account_id = ta.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
      ORDER BY t.date DESC
    `).all(userId);
    res.json(transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const userId = (req as any).user.id;
    const { id, from_account_id, to_account_id, category_id, amount, type, date, note } = req.body;
    
    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO transactions (id, user_id, from_account_id, to_account_id, category_id, amount, type, date, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(id, userId, from_account_id, to_account_id, category_id, amount, type, date, note);

      // Update account balances
      if (type === 'income' && to_account_id) {
        db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amount, to_account_id);
      } else if (type === 'expense' && from_account_id) {
        db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amount, from_account_id);
      } else if (type === 'transfer' && from_account_id && to_account_id) {
        db.prepare("UPDATE accounts SET balance = balance - ? WHERE id = ?").run(amount, from_account_id);
        db.prepare("UPDATE accounts SET balance = balance + ? WHERE id = ?").run(amount, to_account_id);
      }
    });

    transaction();
    res.json({ success: true });
  });

  app.get("/api/dashboard", (req, res) => {
    const userId = (req as any).user.id;
    const month = req.query.month as string; // YYYY-MM

    const accounts = db.prepare("SELECT * FROM accounts WHERE user_id = ?").all(userId);
    const transactions = db.prepare(`
      SELECT * FROM transactions 
      WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    `).all(userId, month);

    const totalNetWorth = accounts.reduce((acc: number, curr: any) => acc + Number(curr.balance), 0);
    const monthlyIncome = transactions.filter((t: any) => t.type === 'income').reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    const monthlyExpense = transactions.filter((t: any) => t.type === 'expense').reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    const monthlySavings = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    res.json({
      totalNetWorth,
      monthlyIncome,
      monthlyExpense,
      monthlySavings,
      savingsRate,
      accounts
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
