// ============================================================
// transactionParser.ts
// Deterministic rule-based freetext transaction parser.
// No external AI APIs — uses regex, keyword dicts, and fuzzy match.
// ============================================================

export interface ParsedTransaction {
    type: 'income' | 'expense' | 'transfer';
    amount: number;
    note: string;
    date: string; // ISO date string
    from_account_name?: string;
    to_account_name?: string;
    category_keyword?: string;
    confidence: 'high' | 'medium' | 'low';
}

// ---- Keyword Dictionaries ----

const INCOME_KEYWORDS = [
    'salary', 'income', 'received', 'payment', 'interest', 'dividend',
    'bonus', 'revenue', 'deposit', 'credit', 'earning', 'wage', 'freelance',
    'refund', 'cashback', 'return', 'profit', 'rent received', 'invested',
];

const TRANSFER_KEYWORDS = [
    'transfer', 'move', 'send', 'sent', 'moved', 'shifting', 'shift',
];

const CATEGORY_MAP: Record<string, string> = {
    // Food
    lunch: 'food', breakfast: 'food', dinner: 'food', snack: 'food',
    coffee: 'food', tea: 'food', meal: 'food', food: 'food', restaurant: 'food',
    pizza: 'food', burger: 'food', cafe: 'food', drinks: 'food',
    // Transport
    taxi: 'transport', uber: 'transport', cab: 'transport', bus: 'transport',
    fuel: 'transport', petrol: 'transport', gas: 'transport', metro: 'transport',
    flight: 'transport', travel: 'transport', transport: 'transport', fare: 'transport',
    // Shopping
    shopping: 'shopping', clothes: 'shopping', shirt: 'shopping', shoes: 'shopping',
    purchase: 'shopping', bought: 'shopping', amazon: 'shopping', online: 'shopping',
    // Health
    medicine: 'health', doctor: 'health', hospital: 'health', pharmacy: 'health',
    health: 'health', gym: 'health', fitness: 'health',
    // Utilities
    electricity: 'utilities', water: 'utilities', internet: 'utilities',
    wifi: 'utilities', phone: 'utilities', bill: 'utilities', subscription: 'utilities',
    netflix: 'utilities', spotify: 'utilities', rent: 'utilities',
    // Income
    salary: 'salary', interest: 'interest', dividend: 'dividends',
    bonus: 'bonus', freelance: 'freelance',
    // Investment
    shares: 'investments', stocks: 'investments', crypto: 'investments',
    investment: 'investments', mutual: 'investments',
};

const DATE_WORDS: Record<string, () => string> = {
    today: () => new Date().toISOString().slice(0, 10),
    yesterday: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
    },
    'last week': () => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().slice(0, 10);
    },
    'this week': () => new Date().toISOString().slice(0, 10),
};

// ---- Helpers ----

function extractAmount(text: string): number | null {
    // Match: 1200, 1,200, 1.2k, 12.5, 45000
    // We capture the numeric part including commas and decimals.
    // The trailing 'k' or 'K' is handled outside the numeric capture regex.
    const match = text.match(/\b(\d+([\.,]\d+)?)\s*(k\b)?/i);
    if (!match) return null;
    
    // Replace commas before parsing
    let val = parseFloat(match[1].replace(/,/g, ''));
    
    // If the 3rd capture group matched 'k' (case insensitive), multiply by 1000
    if (match[3] && match[3].toLowerCase() === 'k') {
        val *= 1000;
    }
    
    return val;
}

function extractDate(text: string): { date: string; cleaned: string } {
    let remaining = text;
    for (const [phrase, fn] of Object.entries(DATE_WORDS)) {
        if (remaining.toLowerCase().includes(phrase)) {
            remaining = remaining.toLowerCase().replace(phrase, '').trim();
            return { date: fn(), cleaned: remaining };
        }
    }
    return { date: new Date().toISOString().slice(0, 10), cleaned: text };
}

function fuzzyMatch(input: string, candidates: string[]): string | undefined {
    const lower = input.toLowerCase();
    // Exact
    const exact = candidates.find(c => c.toLowerCase() === lower);
    if (exact) return exact;
    // Substring
    return candidates.find(c =>
        c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase())
    );
}

function detectType(text: string): 'income' | 'expense' | 'transfer' {
    const lower = text.toLowerCase();
    if (TRANSFER_KEYWORDS.some(k => lower.includes(k))) return 'transfer';
    if (INCOME_KEYWORDS.some(k => lower.includes(k))) return 'income';
    return 'expense';
}

function detectCategory(text: string): string | undefined {
    const lower = text.toLowerCase();
    for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
        if (lower.includes(kw)) return cat;
    }
    return undefined;
}

// ---- Main Parse Function ----

export function parseTransactionMessage(
    message: string,
    accounts: { id: string; name: string }[],
    categories: { id: string; name: string; type: string }[]
): ParsedTransaction | null {
    if (!message.trim()) return null;

    const accountNames = accounts.map(a => a.name);
    const categoryNames = categories.map(c => c.name);

    // 1. Extract amount
    const amount = extractAmount(message);
    if (!amount || amount <= 0) return null;

    // 2. Extract date
    const { date, cleaned } = extractDate(message);

    // 3. Detect transaction type
    const type = detectType(cleaned);

    // 4. Detect accounts
    let from_account_name: string | undefined;
    let to_account_name: string | undefined;

    // "from X to Y" pattern
    const fromToMatch = cleaned.match(/from\s+(.+?)\s+to\s+(.+?)(?:\s|$)/i);
    if (fromToMatch) {
        from_account_name = fuzzyMatch(fromToMatch[1], accountNames);
        to_account_name = fuzzyMatch(fromToMatch[2], accountNames);
    } else {
        // "to X" pattern (income destination)
        const toMatch = cleaned.match(/\bto\s+(.+?)(?:\s|$)/i);
        if (toMatch) {
            const matched = fuzzyMatch(toMatch[1], accountNames);
            if (type === 'income') to_account_name = matched;
            else if (type === 'transfer') to_account_name = matched;
        }
        // "from X" pattern (expense source)
        const fromMatch = cleaned.match(/\bfrom\s+(.+?)(?:\s|$)/i);
        if (fromMatch && !fromToMatch) {
            from_account_name = fuzzyMatch(fromMatch[1], accountNames);
        }
    }

    // 5. Detect category
    const category_keyword = detectCategory(cleaned);

    // 6. Build note from remaining meaningful words
    const stripWords = ['from', 'to', amount.toString(), date, 'transfer', 'send'];
    let note = cleaned
        .replace(/\b\d[\d,]*(?:\.\d+)?\s*k?\b/i, '')
        .replace(/\b(from|to)\s+\S+/gi, '')
        .replace(/\b(today|yesterday|last week)\b/gi, '')
        .trim();
    if (!note) note = message.trim();

    // 7. Confidence
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (amount && (category_keyword || from_account_name || to_account_name)) confidence = 'medium';
    if (amount && category_keyword && (from_account_name || to_account_name || type !== 'transfer')) confidence = 'high';

    return { type, amount, note, date, from_account_name, to_account_name, category_keyword, confidence };
}
