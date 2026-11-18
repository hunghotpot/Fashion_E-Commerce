-- CreateEnum
CREATE TYPE "AdminNotificationCategory" AS ENUM ('ORDER', 'PAYMENT', 'STOCK');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminNotificationsSeenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "category" "AdminNotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");

-- CreateIndex
CREATE INDEX "AdminNotification_category_createdAt_idx" ON "AdminNotification"("category", "createdAt");
