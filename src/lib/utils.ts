import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currencyCode?: string) {
  const code = currencyCode || (typeof window !== 'undefined' && localStorage.getItem('base_currency')) || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).format(amount);
  } catch (e) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}

export function getCurrencySymbol(currencyCode?: string) {
  const code = currencyCode || (typeof window !== 'undefined' && localStorage.getItem('base_currency')) || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
    }).format(0).replace(/[0-9.,\s]/g, '');
  } catch (e) {
    return '$';
  }
}

// Normalizes any stored/loose date value into the `YYYY-MM-DDTHH:mm` shape
// that <input type="datetime-local"> requires, in the user's local timezone.
export function getLocalDatetimePattern(dateStr?: string | null) {
  if (!dateStr) {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
  if (dateStr.length === 16 && dateStr.includes('T')) return dateStr;
  if (dateStr.length === 10 && !dateStr.includes('T')) return `${dateStr}T00:00`;

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mins}`;
}
