-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN_A',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherNumber" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "nominal" REAL NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'BANK',
    "description" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "bankAccountName" TEXT NOT NULL DEFAULT '',
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "holdReason" TEXT,
    "currentPicId" TEXT,
    "invoiceFileUrl" TEXT,
    "poFileUrl" TEXT,
    "voucherFileUrl" TEXT,
    "makerFileUrl" TEXT,
    "transferFileUrl" TEXT,
    "finalMergedFileUrl" TEXT,
    "additionalFilesJson" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "vouchers_currentPicId_fkey" FOREIGN KEY ("currentPicId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "voucher_line_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    CONSTRAINT "voucher_line_items_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "approval_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_logs_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "approval_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_voucherNumber_key" ON "vouchers"("voucherNumber");

-- CreateIndex
CREATE INDEX "vouchers_status_idx" ON "vouchers"("status");

-- CreateIndex
CREATE INDEX "vouchers_currentPicId_idx" ON "vouchers"("currentPicId");

-- CreateIndex
CREATE INDEX "vouchers_voucherNumber_idx" ON "vouchers"("voucherNumber");

-- CreateIndex
CREATE INDEX "voucher_line_items_voucherId_idx" ON "voucher_line_items"("voucherId");

-- CreateIndex
CREATE INDEX "approval_logs_voucherId_idx" ON "approval_logs"("voucherId");

-- CreateIndex
CREATE INDEX "approval_logs_userId_idx" ON "approval_logs"("userId");
