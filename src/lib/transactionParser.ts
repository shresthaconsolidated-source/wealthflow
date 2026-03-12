// ============================================================
// transactionParser.ts — Advanced Smart Parser
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

const INCOME_KEYWORDS = [
    'salary', 'income', 'received', 'payment', 'interest', 'dividend',
    'bonus', 'revenue', 'deposit', 'credit', 'earning', 'wage', 'freelance',
    'refund', 'cashback', 'return', 'profit', 'rent received', 'invested',
];

const TRANSFER_KEYWORDS = [
    'transfer', 'move', 'send', 'sent', 'moved', 'shifting', 'shift', 'between',
];

const CATEGORY_MAP: Record<string, string> = {
    lunch: 'food', breakfast: 'food', dinner: 'food', snack: 'food',
    coffee: 'food', tea: 'food', meal: 'food', food: 'food', restaurant: 'food',
    taxi: 'transport', uber: 'transport', cab: 'transport', bus: 'transport',
    fuel: 'transport', petrol: 'transport', gas: 'transport',
    shopping: 'shopping', clothes: 'shopping', purchase: 'shopping', bought: 'shopping',
    medicine: 'health', doctor: 'health', hospital: 'health', pharmacy: 'health',
    gym: 'health', fitness: 'health',
    electricity: 'utilities', water: 'utilities', internet: 'utilities',
    bill: 'utilities', rent: 'utilities',
    salary: 'salary', bonus: 'bonus', freelance: 'freelance',
    shares: 'investments', stocks: 'investments', crypto: 'investments',
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function extractAmount(text: string): number | null {
    const match = text.match(/\b(\d+([\.,]\d+)?)\s*(k\b)?/i);
    if (!match) return null;
    let val = parseFloat(match[1].replace(/,/g, ''));
    if (match[3] && match[3].toLowerCase() === 'k') val *= 1000;
    return val;
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function extractDate(text: string): { date: string; cleaned: string } {
    let lower = text.toLowerCase();
    const now = new Date();
    let target = new Date(now);

    // 1. Relative phrases
    if (lower.includes('today')) {
        return { date: formatDate(now), cleaned: lower.replace('today', '').trim() };
    }
    if (lower.includes('yesterday')) {
        target.setDate(now.getDate() - 1);
        return { date: formatDate(target), cleaned: lower.replace('yesterday', '').trim() };
    }
    
    const lastMonthMatch = lower.match(/last month/i);
    if (lastMonthMatch) {
        target.setMonth(now.getMonth() - 1);
        return { date: formatDate(target), cleaned: lower.replace(/last month/i, '').trim() };
    }

    const agoMatch = lower.match(/(\d+)\s+days?\s+ago/i);
    if (agoMatch) {
        target.setDate(now.getDate() - parseInt(agoMatch[1]));
        return { date: formatDate(target), cleaned: lower.replace(agoMatch[0], '').trim() };
    }

    // 2. Month names (e.g. 25th oct, oct 25, 25 oct)
    for (let i = 0; i < MONTHS.length; i++) {
        const m = MONTHS[i];
        const monthRegex = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+${m}|${m}\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i');
        const mMatch = lower.match(monthRegex);
        if (mMatch) {
            const day = parseInt(mMatch[1] || mMatch[2]);
            const d = new Date(now.getFullYear(), i, day);
            // If date is in future, assume last year
            if (d > now) d.setFullYear(now.getFullYear() - 1);
            return { date: formatDate(d), cleaned: lower.replace(mMatch[0], '').trim() };
        }
    }

    return { date: formatDate(now), cleaned: text };
}

function fuzzyMatch(input: string, candidates: string[]): string | undefined {
    if (!input || !candidates.length) return undefined;
    const lower = input.toLowerCase().trim();
    if (lower.length < 2) return undefined;

    return candidates.find(c => {
        const cl = c.toLowerCase();
        return cl === lower || cl.includes(lower) || lower.includes(cl);
    });
}

export function parseTransactionMessage(
    message: string,
    accounts: { id: string; name: string }[],
    categories: { id: string; name: string; type: string }[]
): ParsedTransaction | null {
    if (!message?.trim()) return null;

    const accountNames = (accounts || []).map(a => a.name);
    
    const amount = extractAmount(message);
    if (!amount || amount <= 0) return null;

    const { date, cleaned } = extractDate(message);
    const lower = cleaned.toLowerCase();

    // Type detection
    let type: 'income' | 'expense' | 'transfer' = 'expense';
    if (TRANSFER_KEYWORDS.some(k => lower.includes(k))) type = 'transfer';
    else if (INCOME_KEYWORDS.some(k => lower.includes(k))) type = 'income';

    // Account detection via prepositions: from, to, by, in, into, on
    let from_account_name: string | undefined;
    let to_account_name: string | undefined;

    const preps = ['from', 'to', 'by', 'in', 'into', 'on'];
    const prepRegex = new RegExp(`\\b(${preps.join('|')})\\s+([\\w\\s]+?)(?=\\s+(?:${preps.join('|')}|\\d)|$)`, 'gi');
    
    let match;
    while ((match = prepRegex.exec(lower)) !== null) {
        const prep = match[1].toLowerCase();
        const rawName = match[2].trim();
        const matchedAccount = fuzzyMatch(rawName, accountNames);

        if (matchedAccount) {
            if (prep === 'from') from_account_name = matchedAccount;
            else if (prep === 'to' || prep === 'into' || prep === 'in' || prep === 'on' || prep === 'by') {
                if (type === 'income') to_account_name = matchedAccount;
                else if (type === 'transfer') {
                    if (prep === 'from') from_account_name = matchedAccount;
                    else to_account_name = matchedAccount;
                } else {
                    // expense: "by cash", "on bank"
                    from_account_name = matchedAccount;
                }
            }
        }
    }

    // Special case for transfers without explicit from/to headers but two accounts mentioned
    if (type === 'transfer' && !from_account_name && !to_account_name) {
        // try to find any two account names mentioned
        const found = accountNames.filter(n => lower.includes(n.toLowerCase()));
        if (found.length >= 1) from_account_name = found[0];
        if (found.length >= 2) to_account_name = found[1];
    }

    // Category detection
    let category_keyword: string | undefined;
    for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
        if (lower.includes(kw)) {
            category_keyword = cat;
            break;
        }
    }

    // Clean Note
    let note = message
        .replace(/\b\d[\d,]*(?:\.\d+)?\s*k?\b/gi, '') // remove amount
        .replace(/(today|yesterday|last month|last week|\d+\s+days?\s+ago)/gi, '') // remove dates
        .replace(new RegExp(`\\b(${preps.join('|')})\\s+`, 'gi'), ' '); // remove dangling prepositions
    
    // Remove detected account names
    if (from_account_name) {
        note = note.replace(new RegExp(`\\b${from_account_name}\\b`, 'gi'), '');
    }
    if (to_account_name) {
        note = note.replace(new RegExp(`\\b${to_account_name}\\b`, 'gi'), '');
    }

    // Remove type keywords if they are isolated
    [...INCOME_KEYWORDS, ...TRANSFER_KEYWORDS].forEach(kw => {
        note = note.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '');
    });

    note = note.replace(/\s+/g, ' ').trim();

    if (!note || note.length < 2) note = message.trim();

    // Confidence
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (category_keyword || from_account_name || to_account_name) confidence = 'medium';
    if (category_keyword && (from_account_name || to_account_name)) confidence = 'high';

    return { type, amount, note, date, from_account_name, to_account_name, category_keyword, confidence };
}
