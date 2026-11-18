-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "flatShippingFee" INTEGER NOT NULL DEFAULT 30000,
    "silverMinSpend" INTEGER NOT NULL DEFAULT 3000000,
    "goldMinSpend" INTEGER NOT NULL DEFAULT 10000000,
    "diamondMinSpend" INTEGER NOT NULL DEFAULT 25000000,
    "memberFreeShipThreshold" INTEGER NOT NULL DEFAULT 500000,
    "silverFreeShipThreshold" INTEGER NOT NULL DEFAULT 400000,
    "goldFreeShipThreshold" INTEGER NOT NULL DEFAULT 300000,
    "diamondFreeShipThreshold" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);
