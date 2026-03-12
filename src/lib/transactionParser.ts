// transactionParser.ts
// Deterministic rule-based freetext transaction parser.
// No external AI APIs — uses regex, keyword dicts, and fuzzy match.
// ============================================================
import { 
  format, 
  subDays, 
  startOfToday, 
  nextDay, 
  previousDay, 
  parseISO, 
  isValid,
  startOfWeek
} from 'date-fns';

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const DAY_MAP: Record<string, Day> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
};

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
    today: () => format(startOfToday(), 'yyyy-MM-dd'),
    yesterday: () => format(subDays(startOfToday(), 1), 'yyyy-MM-dd'),
};

function getRelativeDate(phrase: string): string | null {
    const lower = phrase.toLowerCase().trim();
    const today = startOfToday();

    if (lower === 'last week') return format(subDays(today, 7), 'yyyy-MM-dd');

    // Handle "last Friday", "this Monday", "next Friday"
    const match = lower.match(/^(?:(last|this|next)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
    if (match) {
        const modifier = match[1] || 'this'; // default to 'this'
        const dayName = match[2];
        const targetDay = DAY_MAP[dayName];

        if (modifier === 'last') {
            return format(previousDay(today, targetDay), 'yyyy-MM-dd');
        } else if (modifier === 'next') {
            return format(nextDay(today, targetDay), 'yyyy-MM-dd');
        } else {
            // "this Friday"
            // If today is the target day, return today.
            if (today.getDay() === targetDay) return format(today, 'yyyy-MM-dd');
            
            // Otherwise, get the day in the current week (Sunday to Saturday)
            const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Start at Monday
            const dayInWeek = nextDay(subDays(weekStart, 1), targetDay);
            return format(dayInWeek, 'yyyy-MM-dd');
        }
    }

    return null;
}

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
    const lowerText = text.toLowerCase();
    
    // 1. Check simple words first
    for (const [phrase, fn] of Object.entries(DATE_WORDS)) {
        if (lowerText.includes(phrase)) {
            return { date: fn(), cleaned: text.replace(new RegExp(`\\b${phrase}\\b`, 'i'), '').trim() };
        }
    }

    // 2. Check for "last week" specifically to avoid regex collision
    if (lowerText.includes('last week')) {
        return { date: getRelativeDate('last week')!, cleaned: text.replace(/last week/i, '').trim() };
    }

    // 3. Check relative days like "last friday", "friday"
    const relativeRegex = /\b(last|this|next)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi;
    const match = text.match(relativeRegex);
    if (match) {
        const phrase = match[0];
        const date = getRelativeDate(phrase);
        if (date) {
            return { date, cleaned: text.replace(phrase, '').trim() };
        }
    }

    return { date: format(startOfToday(), 'yyyy-MM-dd'), cleaned: text };
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
