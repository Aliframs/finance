export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const formatted = new Intl.NumberFormat("id-ID", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  return isNegative ? `(${formatted})` : formatted;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Parse nominal input that supports =-prefix for deductions.
 * e.g. "=-50000" returns -50000, "50000" returns 50000
 */
export function parseNominal(input: string): number {
  const trimmed = input.trim();
  if (trimmed.startsWith("=-")) {
    const num = parseFloat(trimmed.slice(2).replace(/[,.]/g, ""));
    return isNaN(num) ? 0 : -num;
  }
  const num = parseFloat(trimmed.replace(/[,.]/g, ""));
  return isNaN(num) ? 0 : num;
}
