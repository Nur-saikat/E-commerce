import { isoDate } from '../format';

export function todayInput(): string {
  return isoDate(new Date().toISOString());
}

export function toIso(value: string): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}
