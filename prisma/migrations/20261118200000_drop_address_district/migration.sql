-- Sau sáp nhập (01/07/2025) không còn cấp quận/huyện: bỏ hẳn cột và khoá trong bản chụp địa chỉ của đơn hàng.
ALTER TABLE "Address" DROP COLUMN "district";

UPDATE "Order" SET "shippingAddress" = "shippingAddress" - 'district' WHERE "shippingAddress" ? 'district';
