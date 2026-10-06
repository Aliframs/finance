export const PO_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: 'var(--text-muted)' },
  WAITING_PIC: { label: 'Menunggu PIC', color: '#eab308' },
  WAITING_DIRUT: { label: 'Menunggu Dirut', color: '#f97316' },
  COMPLETED: { label: 'Selesai', color: 'var(--success)' },
  REJECTED: { label: 'Ditolak', color: 'var(--danger)' },
  CANCELLED: { label: 'Dibatalkan', color: 'var(--danger)' },
};

export function canApprovePO(status: string, currentRole: string, isPIC: boolean): boolean {
  if (status === 'DRAFT' && currentRole === 'ADMIN') return true;
  if (status === 'WAITING_PIC' && isPIC) return true;
  if (status === 'WAITING_DIRUT' && currentRole === 'DIREKTUR_UTAMA') return true;
  return false;
}

export function canRejectPO(status: string, currentRole: string, isPIC: boolean): boolean {
  if (status === 'WAITING_PIC' && isPIC) return true;
  if (status === 'WAITING_DIRUT' && currentRole === 'DIREKTUR_UTAMA') return true;
  return false;
}

export function canDeletePO(status: string, currentRole: string): boolean {
  return currentRole === 'ADMIN' && (status === 'DRAFT' || status === 'REJECTED');
}

export function canEditPO(status: string, currentRole: string): boolean {
  return currentRole === 'ADMIN' && status !== 'COMPLETED' && status !== 'CANCELLED';
}

export function getNextPOStatus(currentStatus: string): string {
  if (currentStatus === 'DRAFT') return 'WAITING_PIC';
  if (currentStatus === 'WAITING_PIC') return 'WAITING_DIRUT';
  if (currentStatus === 'WAITING_DIRUT') return 'COMPLETED';
  return currentStatus;
}
