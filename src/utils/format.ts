/**
 * Helper utilities for safe number and currency formatting across the app.
 */

export function safeNum(val: any, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(n) ? fallback : n;
}

export function safeToFixed(val: any, digits: number = 2): string {
  return safeNum(val).toFixed(digits);
}

export function formatCurrency(val: any, symbol: string = '€'): string {
  return `${symbol}${safeToFixed(val, 2)}`;
}
