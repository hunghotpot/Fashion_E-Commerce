-- CreateTable
CREATE TABLE "StoreProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "hotline" TEXT,
    "email" TEXT,
    "address" TEXT,
    "about" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProfile_pkey" PRIMARY KEY ("id")
);
