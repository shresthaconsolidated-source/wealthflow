import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  const currencyCode = (typeof window !== 'undefined' && localStorage.getItem('base_currency')) || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch (e) {
    // Fallback in case of invalid currency code
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}

export function getCurrencySymbol() {
  const currencyCode = (typeof window !== 'undefined' && localStorage.getItem('base_currency')) || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(0).replace(/[0-9.,\s]/g, '');
  } catch (e) {
    return '$';
  }
}
