-- Khách báo đã chuyển khoản (chỉ để Admin ưu tiên đối soát) và tài khoản nhận QR do Admin cấu hình.
ALTER TABLE "Order" ADD COLUMN "customerReportedPaidAt" TIMESTAMP(3);

CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "bankName" TEXT NOT NULL,
    "bankBin" TEXT NOT NULL,
    "accountNo" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);
