-- CreateEnum
CREATE TYPE "NewsSentiment" AS ENUM ('BULLISH', 'BEARISH', 'NEUTRAL', 'MIXED');

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT,
    "source" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "sentiment" "NewsSentiment",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsSentimentCache" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "bullishPercent" DOUBLE PRECISION NOT NULL,
    "bearishPercent" DOUBLE PRECISION NOT NULL,
    "neutralPercent" DOUBLE PRECISION NOT NULL,
    "companyNewsScore" DOUBLE PRECISION NOT NULL,
    "articleCount" INTEGER NOT NULL,
    "summary" TEXT,
    "keyThemes" JSONB,
    "sentimentStrength" TEXT,
    "confidence" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsSentimentCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsArticle_symbol_publishedAt_idx" ON "NewsArticle"("symbol", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_symbol_url_key" ON "NewsArticle"("symbol", "url");

-- CreateIndex
CREATE UNIQUE INDEX "NewsSentimentCache_symbol_key" ON "NewsSentimentCache"("symbol");

-- CreateIndex
CREATE INDEX "NewsSentimentCache_symbol_idx" ON "NewsSentimentCache"("symbol");

-- CreateIndex
CREATE INDEX "NewsSentimentCache_lastUpdated_idx" ON "NewsSentimentCache"("lastUpdated");
