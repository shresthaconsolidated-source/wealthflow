// quickEntryConfig.ts — Static config for quick-entry buttons
export interface QuickAction {
    id: string;
    label: string;
    emoji: string;
    type: 'expense' | 'income' | 'transfer';
    categoryKeyword: string;
    color: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
    { id: 'food', label: 'Food', emoji: '🍔', type: 'expense', categoryKeyword: 'food', color: 'orange' },
    { id: 'transport', label: 'Transport', emoji: '🚗', type: 'expense', categoryKeyword: 'transport', color: 'blue' },
    { id: 'coffee', label: 'Coffee', emoji: '☕', type: 'expense', categoryKeyword: 'food', color: 'amber' },
    { id: 'grocery', label: 'Grocery', emoji: '🛒', type: 'expense', categoryKeyword: 'shopping', color: 'green' },
    { id: 'shopping', label: 'Shopping', emoji: '🛍️', type: 'expense', categoryKeyword: 'shopping', color: 'purple' },
    { id: 'health', label: 'Health', emoji: '💊', type: 'expense', categoryKeyword: 'health', color: 'red' },
    { id: 'salary', label: 'Salary', emoji: '💰', type: 'income', categoryKeyword: 'salary', color: 'emerald' },
    { id: 'interest', label: 'Interest', emoji: '📈', type: 'income', categoryKeyword: 'interest', color: 'teal' },
    { id: 'transfer', label: 'Transfer', emoji: '↔️', type: 'transfer', categoryKeyword: '', color: 'indigo' },
];
