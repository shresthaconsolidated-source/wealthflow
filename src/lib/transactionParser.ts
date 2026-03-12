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
  startOfWeek,
  setMonth,
  setYear,
  setDay as setDayOfWeek,
  setDate as setDayOfMonth,
  subMonths,
  subYears,
  startOfMonth,
  startOfYear
} from 'date-fns';

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const DAY_MAP: Record<string, Day> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
};

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
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
    pizza: 'food', burger: 'food', cafe: 'food', drinks: 'food', momo: 'food',
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
    if (lower === 'last month') return format(subMonths(today, 1), 'yyyy-MM-dd');
    if (lower === 'this month') return format(startOfMonth(today), 'yyyy-MM-dd');
    if (lower === 'last year') return format(subYears(today, 1), 'yyyy-MM-dd');
    if (lower === 'this year') return format(startOfYear(today), 'yyyy-MM-dd');

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

function getAbsoluteDate(text: string): { date: string, phrase: string } | null {
    const lower = text.toLowerCase();
    
    // Pattern 1: "25th oct 2025" or "25 oct 2025" or "25th oct"
    // Match: [day] [month] [year?]
    const dmyMatch = lower.match(/\b(\d+)(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})?\b/i);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1]);
        const monthName = dmyMatch[2].toLowerCase();
        const year = dmyMatch[3] ? parseInt(dmyMatch[3]) : new Date().getFullYear();
        const month = MONTH_MAP[monthName];
        
        let d = startOfToday();
        d = setYear(d, year);
        d = setMonth(d, month);
        d = setDayOfMonth(d, day);
        
        if (isValid(d)) {
            return { date: format(d, 'yyyy-MM-dd'), phrase: dmyMatch[0] };
        }
    }

    // Pattern 2: "oct 25th 2025" or "oct 25"
    // Match: [month] [day] [year?]
    const mdyMatch = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d+)(?:st|nd|rd|th)?\s*(\d{4})?\b/i);
    if (mdyMatch) {
        const monthName = mdyMatch[1].toLowerCase();
        const day = parseInt(mdyMatch[2]);
        const year = mdyMatch[3] ? parseInt(mdyMatch[3]) : new Date().getFullYear();
        const month = MONTH_MAP[monthName];

        let d = startOfToday();
        d = setYear(d, year);
        d = setMonth(d, month);
        d = setDayOfMonth(d, day);

        if (isValid(d)) {
            return { date: format(d, 'yyyy-MM-dd'), phrase: mdyMatch[0] };
        }
    }

    return null;
}

function extractDate(text: string): { date: string; cleaned: string } {
    const lowerText = text.toLowerCase();
    
    // 1. Check simple words first (today, yesterday)
    for (const [phrase, fn] of Object.entries(DATE_WORDS)) {
        if (new RegExp(`\\b${phrase}\\b`, 'i').test(text)) {
            return { date: fn(), cleaned: text.replace(new RegExp(`\\b${phrase}\\b`, 'i'), '').trim() };
        }
    }

    // 2. Check for broad relative periods specifically to avoid regex collision
    const relativePeriods = ['last week', 'last month', 'this month', 'last year', 'this year'];
    for (const period of relativePeriods) {
        if (new RegExp(`\\b${period}\\b`, 'i').test(text)) {
            return { date: getRelativeDate(period)!, cleaned: text.replace(new RegExp(`\\b${period}\\b`, 'i'), '').trim() };
        }
    }

    // 3. Check for absolute dates like "25th oct 2025"
    const absDate = getAbsoluteDate(text);
    if (absDate) {
        return { date: absDate.date, cleaned: text.replace(new RegExp(absDate.phrase, 'i'), '').trim() };
    }

    // 4. Check relative days like "last friday", "friday"
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
    const fromToMatch = cleaned.match(/\b(from|by)\s+(.+?)\s+(to|in|into)\s+(.+?)(?:\s|$)/i);
    if (fromToMatch) {
        from_account_name = fuzzyMatch(fromToMatch[2], accountNames);
        to_account_name = fuzzyMatch(fromToMatch[4], accountNames);
    } else {
        // "to X" / "in X" pattern (income destination / transfer to)
        const toMatch = cleaned.match(/\b(to|in|into)\s+(.+?)(?:\s|$)/i);
        if (toMatch) {
            const matched = fuzzyMatch(toMatch[2], accountNames);
            if (type === 'income' || type === 'transfer') to_account_name = matched;
            else if (type === 'expense' && !from_account_name) from_account_name = matched; // e.g., "momo 200 in cash"
        }
        // "from X" / "by X" pattern (expense source)
        const fromMatch = cleaned.match(/\b(from|by|at)\s+(.+?)(?:\s|$)/i);
        if (fromMatch && !fromToMatch) {
            from_account_name = fuzzyMatch(fromMatch[2], accountNames);
        }
    }

    // 5. Detect category
    const category_keyword = detectCategory(cleaned);

    // 6. Build note from remaining meaningful words
    let note = cleaned
        .replace(/\b\d[\d,]*(?:\.\d+)?\s*k?\b/i, '') // strip amount
        .replace(/\b(from|to|on|at|for|by|in|into)\s+\S+/gi, '') // strip prepositions and following word
        .replace(/\b(today|yesterday|last week|last month|this month|last year|this year)\b/gi, '')
        .replace(/\b(on|at|for|by|in|into)\b/gi, '') // strip hanging prepositions
        .replace(/\s+/g, ' ')
        .trim();
    if (!note) note = message.trim();

    // 7. Confidence
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (amount && (category_keyword || from_account_name || to_account_name)) confidence = 'medium';
    if (amount && category_keyword && (from_account_name || to_account_name || type !== 'transfer')) confidence = 'high';

    return { type, amount, note, date, from_account_name, to_account_name, category_keyword, confidence };
}
