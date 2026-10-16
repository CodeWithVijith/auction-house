import type { Unit } from './types';
export function parseAmount(
  input: string,
  unit: Unit,
  allowZero = false,
): number {
  const text = input.trim();
  if (!(unit === 'POINTS' ? /^\d+$/ : /^\d+(?:\.\d{1,2})?$/).test(text))
    throw Error(
      unit === 'POINTS'
        ? 'Points must be a whole number.'
        : 'Use a rupee amount with at most two decimals.',
    );
  const [whole, fraction = ''] = text.split('.');
  const value =
    unit === 'INR'
      ? BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
      : BigInt(whole);
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < (allowZero ? 0n : 1n))
    throw Error(
      'Enter a safe amount ' +
        (allowZero ? 'of zero or more.' : 'greater than zero.'),
    );
  return Number(value);
}
export const amountInput = (minor: number, unit: Unit) =>
  unit === 'INR'
    ? `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`
    : String(minor);
export function money(minor: number, unit: Unit) {
  if (unit === 'POINTS')
    return new Intl.NumberFormat('en-IN').format(minor) + ' pts';
  const absolute = BigInt(minor < 0 ? -minor : minor);
  const whole = new Intl.NumberFormat('en-IN').format(absolute / 100n);
  const fraction = String(absolute % 100n).padStart(2, '0');
  return `${minor < 0 ? '-' : ''}₹${whole}.${fraction}`;
}
export function safeSum(values: number[]) {
  const sum = values.reduce((a, b) => a + BigInt(b), 0n);
  if (sum > BigInt(Number.MAX_SAFE_INTEGER))
    throw Error('Total exceeds the safe integer limit.');
  return Number(sum);
}
