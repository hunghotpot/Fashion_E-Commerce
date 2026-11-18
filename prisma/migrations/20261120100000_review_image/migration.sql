-- Ảnh kèm đánh giá sản phẩm (tối đa 3 ảnh mỗi đánh giá, kiểm ở service).
-- Sinh bằng `prisma migrate diff`; đã bỏ dòng DROP INDEX "ProductEmbedding_embedding_hnsw" vì chỉ mục HNSW viết tay trong migration gốc.

-- CreateTable
CREATE TABLE "ReviewImage" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewImage_url_key" ON "ReviewImage"("url");

-- CreateIndex
CREATE INDEX "ReviewImage_reviewId_position_idx" ON "ReviewImage"("reviewId", "position");

-- AddForeignKey
ALTER TABLE "ReviewImage" ADD CONSTRAINT "ReviewImage_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
