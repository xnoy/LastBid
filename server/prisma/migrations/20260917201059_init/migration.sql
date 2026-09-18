-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'SOLD', 'UNSOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('NEW', 'LIKE_NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'FOR_PARTS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PAYMENT_PENDING', 'ORDER_CONFIRMED', 'PREPARING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('OUTBID', 'AUCTION_WON', 'AUCTION_LOST', 'AUCTION_ENDING', 'AUCTION_SOLD', 'RESERVE_MET', 'ORDER_UPDATE', 'LIVE_STARTED');

-- CreateEnum
CREATE TYPE "LiveStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "avatarUrl" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "images" TEXT[],
    "videoUrl" TEXT,
    "condition" "ItemCondition" NOT NULL DEFAULT 'GOOD',
    "location" TEXT NOT NULL,
    "shippingInfo" TEXT NOT NULL,
    "shippingCost" INTEGER NOT NULL DEFAULT 0,
    "startPrice" INTEGER NOT NULL,
    "minIncrement" INTEGER NOT NULL,
    "reservePrice" INTEGER,
    "currentBid" INTEGER NOT NULL DEFAULT 0,
    "bidCount" INTEGER NOT NULL DEFAULT 0,
    "status" "AuctionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sellerId" TEXT NOT NULL,
    "winnerId" TEXT,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "isAuto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoBid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxAmount" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "auctionId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "itemTotal" INTEGER NOT NULL,
    "shippingCost" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "shippingName" TEXT,
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingPostal" TEXT,
    "shippingPhone" TEXT,
    "courier" TEXT,
    "trackingNumber" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "LiveStatus" NOT NULL DEFAULT 'SCHEDULED',
    "hostId" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "playbackUrl" TEXT,
    "ingestUrl" TEXT,
    "providerStream" TEXT,
    "thumbnailUrl" TEXT,
    "viewerCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Auction_slug_key" ON "Auction"("slug");

-- CreateIndex
CREATE INDEX "Auction_status_endsAt_idx" ON "Auction"("status", "endsAt");

-- CreateIndex
CREATE INDEX "Auction_category_status_idx" ON "Auction"("category", "status");

-- CreateIndex
CREATE INDEX "Auction_sellerId_status_idx" ON "Auction"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Bid_auctionId_createdAt_idx" ON "Bid"("auctionId", "createdAt");

-- CreateIndex
CREATE INDEX "Bid_bidderId_createdAt_idx" ON "Bid"("bidderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_auctionId_requestId_key" ON "Bid"("auctionId", "requestId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoBid_auctionId_userId_key" ON "AutoBid"("auctionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_auctionId_key" ON "WatchlistItem"("userId", "auctionId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_reference_key" ON "Order"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Order_auctionId_key" ON "Order"("auctionId");

-- CreateIndex
CREATE INDEX "Order_buyerId_createdAt_idx" ON "Order"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_sellerId_createdAt_idx" ON "Order"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_auctionId_key" ON "LiveSession"("auctionId");

-- CreateIndex
CREATE INDEX "LiveChatMessage_sessionId_createdAt_idx" ON "LiveChatMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auction" ADD CONSTRAINT "Auction_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoBid" ADD CONSTRAINT "AutoBid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoBid" ADD CONSTRAINT "AutoBid_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveChatMessage" ADD CONSTRAINT "LiveChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
