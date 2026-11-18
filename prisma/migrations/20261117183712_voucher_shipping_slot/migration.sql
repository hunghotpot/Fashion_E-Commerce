-- DropIndex
DROP INDEX "VoucherRedemption_orderId_key";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingDiscount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingVoucherCode" TEXT;

-- CreateIndex
CREATE INDEX "VoucherRedemption_orderId_idx" ON "VoucherRedemption"("orderId");

-- Dữ liệu cũ: trước đây mã freeship ghi vào voucherCode/discount. Dời sang cột vận chuyển để tổng tiền và hiển thị vẫn đúng.
UPDATE "Order" o
SET "shippingVoucherCode" = o."voucherCode",
    "shippingDiscount" = o."discount",
    "voucherCode" = NULL,
    "discount" = 0
FROM "Voucher" v
WHERE v."code" = o."voucherCode" AND v."type" = 'FREESHIP';
