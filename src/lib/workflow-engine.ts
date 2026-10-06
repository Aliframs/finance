/**
 * Workflow Engine — Finance Voucher Approval State Machine
 * Aligned with PRD 3.1 Final
 *
 * Flow: Admin → Accounting 2 → Accounting 1 → Accounting 3
 *       → Finance → Direktur Utama → Direktur → Admin Final Check → Completed
 */

export type VoucherStatus =
  | "DRAFT"
  | "WAITING_ACCOUNTING_2"
  | "WAITING_ACCOUNTING_1"
  | "WAITING_ACCOUNTING_3"
  | "WAITING_FINANCE"
  | "WAITING_DIREKTUR_UTAMA"
  | "WAITING_DIREKTUR"
  | "FINAL_CHECK_ADMIN"
  | "AMENDING"
  | "REVISION_VOUCHER"
  | "REVISION_JOURNAL"
  | "COMPLETED"
  | "CANCELLED";

export type UserRole =
  | "ADMIN"
  | "ACCOUNTING_2"
  | "ACCOUNTING_3"
  | "ACCOUNTING_1"
  | "FINANCE"
  | "DIREKTUR_UTAMA"
  | "DIREKTUR";

export const ALL_ROLES: UserRole[] = [
  "ADMIN",
  "ACCOUNTING_2",
  "ACCOUNTING_3",
  "ACCOUNTING_1",
  "FINANCE",
  "DIREKTUR_UTAMA",
  "DIREKTUR",
];

export const ALL_STATUSES: VoucherStatus[] = [
  "DRAFT",
  "WAITING_ACCOUNTING_2",
  "WAITING_ACCOUNTING_1",
  "WAITING_ACCOUNTING_3",
  "WAITING_FINANCE",
  "WAITING_DIREKTUR_UTAMA",
  "WAITING_DIREKTUR",
  "FINAL_CHECK_ADMIN",
  "AMENDING",
  "REVISION_VOUCHER",
  "REVISION_JOURNAL",
  "COMPLETED",
  "CANCELLED",
];

interface TransitionRule {
  allowedRole: UserRole;
  onApprove: VoucherStatus;
}

const TRANSITION_MAP: Record<string, TransitionRule> = {
  DRAFT: {
    allowedRole: "ADMIN",
    onApprove: "WAITING_ACCOUNTING_2",
  },
  WAITING_ACCOUNTING_2: {
    allowedRole: "ACCOUNTING_2",
    onApprove: "WAITING_ACCOUNTING_1",
  },
  WAITING_ACCOUNTING_1: {
    allowedRole: "ACCOUNTING_1",
    onApprove: "WAITING_ACCOUNTING_3",
  },
  WAITING_ACCOUNTING_3: {
    allowedRole: "ACCOUNTING_3",
    onApprove: "WAITING_FINANCE",
  },
  WAITING_FINANCE: {
    allowedRole: "FINANCE",
    onApprove: "WAITING_DIREKTUR_UTAMA",
  },
  WAITING_DIREKTUR_UTAMA: {
    allowedRole: "DIREKTUR_UTAMA",
    onApprove: "WAITING_DIREKTUR",
  },
  WAITING_DIREKTUR: {
    allowedRole: "DIREKTUR",
    onApprove: "FINAL_CHECK_ADMIN",
  },
  FINAL_CHECK_ADMIN: {
    allowedRole: "ADMIN",
    onApprove: "COMPLETED",
  },
  AMENDING: {
    allowedRole: "ACCOUNTING_1", // Just a placeholder, we handle logic manually for Acc1 & Acc2
    onApprove: "COMPLETED",
  },
  REVISION_VOUCHER: {
    allowedRole: "ADMIN",
    onApprove: "WAITING_ACCOUNTING_2",
  },
  REVISION_JOURNAL: {
    allowedRole: "ACCOUNTING_2",
    onApprove: "WAITING_ACCOUNTING_1",
  },
};

// ─── Core Workflow Functions ──────────────────────

/**
 * Check if a user role can approve a voucher at the given status.
 */
export function canApprove(status: string, role: string): boolean {
  const rule = TRANSITION_MAP[status];
  if (!rule) return false;
  return rule.allowedRole === role;
}

/**
 * Get the next status after approval.
 */
export function getNextStatus(status: string): VoucherStatus | null {
  const rule = TRANSITION_MAP[status];
  return rule?.onApprove ?? null;
}

// ─── Permission Functions (PRD §6) ──────────────

/**
 * Check if a role can edit a voucher at the given status.
 * PRD §6: Admin, Accounting 1/2/3 can edit.
 */
export function canEdit(status: string, role: string): boolean {
  if (status === "REVISION_VOUCHER" && role === "ADMIN") return true;
  if (status === "REVISION_JOURNAL" && role === "ACCOUNTING_2") return true;
  if (status === "AMENDING") return role === "ACCOUNTING_1" || role === "ACCOUNTING_2";
  if (status === "COMPLETED") return role === "ADMIN" || role === "FINANCE";
  if (status === "CANCELLED") return false;
  return role === "ADMIN" || role === "ACCOUNTING_1";
}

/**
 * Check if a role can soft-delete (cancel) a voucher.
 * PRD §6: Admin, Accounting 1/2/3 can delete.
 */
export function canDelete(status: string, role: string): boolean {
  if (status === "AMENDING") return role === "ACCOUNTING_1" || role === "ACCOUNTING_2";
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  const deletableRoles = ["ADMIN", "ACCOUNTING_1", "ACCOUNTING_2", "ACCOUNTING_3"];
  return deletableRoles.includes(role);
}

/**
 * Check if a role can amend a completed voucher.
 * PRD §13: Only Accounting 1 and Accounting 2.
 */
export function canAmend(role: string): boolean {
  return role === "ACCOUNTING_1" || role === "ACCOUNTING_2";
}

/**
 * Check if a role can input or edit journal entries at a given status.
 * PRD v3.0: Acc 2 inputs at WAITING_ACCOUNTING_2, Acc 1 reviews/corrects at WAITING_ACCOUNTING_1.
 */
export function canInputJournal(role: string, status?: string): boolean {
  if (status === "WAITING_ACCOUNTING_2") return role === "ACCOUNTING_2";
  if (status === "WAITING_ACCOUNTING_1") return role === "ACCOUNTING_1";
  if (status === "AMENDING") return role === "ACCOUNTING_1" || role === "ACCOUNTING_2";
  if (status === "REVISION_JOURNAL") return role === "ACCOUNTING_2" || role === "ACCOUNTING_1";
  if (status === "COMPLETED") return role === "ADMIN" || role === "FINANCE";
  
  // If no status is provided (for general UI checks), allow if role is either
  return role === "ACCOUNTING_2" || role === "ACCOUNTING_1";
}

/**
 * Check if a role can add notes.
 * PRD §10: Accounting 1, 2, 3 can add. All roles can view.
 */
export function canAddNote(role: string): boolean {
  return ["ACCOUNTING_1", "ACCOUNTING_2", "ACCOUNTING_3"].includes(role);
}

/**
 * Check if a role can upload attachments.
 * PRD §11: ALL roles can upload, replace, and download.
 */
export function canUpload(_role: string): boolean {
  return true; // All roles per PRD §11
}

/**
 * Check if a role can download preview PDF.
 * PRD §6 & §11: ALL roles can download preview.
 */
export function canDownload(_role: string): boolean {
  return true; // All roles per PRD §6
}

/**
 * Check if a role can replace an attachment.
 * PRD §11: All roles can replace if wrong.
 */
export function canReplaceAttachment(_role: string): boolean {
  return true; // All roles per PRD §11
}

// ─── Labels ──────────────────────────────────────

/** Human-readable status labels (Indonesian) */
export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  WAITING_ACCOUNTING_2: "Menunggu Accounting 2",
  WAITING_ACCOUNTING_3: "Menunggu Accounting 3",
  WAITING_ACCOUNTING_1: "Menunggu Accounting 1",
  WAITING_FINANCE: "Menunggu Finance",
  WAITING_DIREKTUR_UTAMA: "Menunggu Direktur Utama",
  WAITING_DIREKTUR: "Menunggu Direktur",
  FINAL_CHECK_ADMIN: "Final Check Admin",
  AMENDING: "Sedang Direvisi",
  REVISION_VOUCHER: "Revisi Voucher",
  REVISION_JOURNAL: "Revisi Journal",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

/** Role labels (Indonesian) */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  ACCOUNTING_2: "Accounting 2",
  ACCOUNTING_3: "Accounting 3",
  ACCOUNTING_1: "Accounting 1",
  FINANCE: "Finance",
  DIREKTUR_UTAMA: "Direktur Utama",
  DIREKTUR: "Direktur",
};

/**
 * Get the role label for a status (who is the PIC).
 * Used by API routes to assign the next PIC.
 */
export function getPICRoleForStatus(status: string): UserRole | null {
  const rule = TRANSITION_MAP[status];
  return rule?.allowedRole ?? null;
}
