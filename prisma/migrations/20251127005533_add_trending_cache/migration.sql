-- CreateTable
CREATE TABLE "TrendingCache" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendingCache_pkey" PRIMARY KEY ("id")
);
