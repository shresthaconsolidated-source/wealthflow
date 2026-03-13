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
