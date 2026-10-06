import { STATUS_LABELS } from './workflow-engine';

/**
 * Returns the CSS class for a status badge.
 * Extracted to avoid duplication across pages.
 */
export function getBadgeClass(status: string): string {
  if (status === 'COMPLETED') return 'badge badge-completed';
  if (status === 'CANCELLED') return 'badge badge-cancelled';
  if (status === 'DRAFT') return 'badge badge-draft';
  return 'badge badge-waiting';
}

/**
 * Returns the human-readable label for an audit log action.
 */
export const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Dibuat', color: 'var(--primary)' },
  APPROVE: { label: 'Disetujui', color: 'var(--success)' },
  REJECT: { label: 'Ditolak', color: 'var(--danger)' },
  HOLD: { label: 'Ditahan', color: 'var(--warning)' },
  UPLOAD: { label: 'Upload Lampiran', color: 'var(--primary)' },
  AMENDMENT: { label: 'Amendment', color: '#8b5cf6' },
  SOFT_DELETE: { label: 'Dibatalkan', color: 'var(--danger)' },
  NOTE: { label: 'Catatan', color: 'var(--text-muted)' },
};

/**
 * Get a status label with fallback.
 */
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}
