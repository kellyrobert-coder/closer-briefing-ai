import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    // Handle "2026-04-03 14:00" or "2026-04-03T14:00" or just "2026-04-03"
    const hasTime = /\d{2}:\d{2}/.test(dateStr);
    const date = new Date(dateStr.replace(' ', 'T'));
    const datePart = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    if (hasTime) {
      const timePart = date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${datePart} às ${timePart}`;
    }
    return datePart;
  } catch {
    return dateStr;
  }
}

export function formatPhone(phone: string): string {
  if (!phone) return '—';
  // Clean up scientific notation format from database
  const cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.length >= 11) {
    const digits = cleaned.replace('+', '');
    if (digits.length === 13) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
  }
  return cleaned;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}

export function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/30';
  if (score >= 60) return 'bg-amber-500/20 border-amber-500/30';
  return 'bg-red-500/20 border-red-500/30';
}

export function getStatusLabel(score: number): string {
  if (score >= 80) return 'Quente';
  if (score >= 60) return 'Morno';
  return 'Frio';
}

export function getStatusColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}
