-- CreateEnum
CREATE TYPE "CustomerTier" AS ENUM ('MEMBER', 'SILVER', 'GOLD', 'DIAMOND');

-- CreateEnum
CREATE TYPE "VoucherAudience" AS ENUM ('ALL', 'TIER', 'USERS');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'VOUCHER';

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "audience" "VoucherAudience" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "minTier" "CustomerTier",
ADD COLUMN     "welcomeTier" "CustomerTier";

-- CreateTable
CREATE TABLE "VoucherAssignment" (
    "voucherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherAssignment_pkey" PRIMARY KEY ("voucherId","userId")
);

-- CreateIndex
CREATE INDEX "VoucherAssignment_userId_idx" ON "VoucherAssignment"("userId");

-- AddForeignKey
ALTER TABLE "VoucherAssignment" ADD CONSTRAINT "VoucherAssignment_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherAssignment" ADD CONSTRAINT "VoucherAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
