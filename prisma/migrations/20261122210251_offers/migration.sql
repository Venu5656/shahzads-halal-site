-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'SENT_WITH_FAILURES');

-- CreateEnum
CREATE TYPE "OfferSendStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT[],
    "buttonLabel" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferSend" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "OfferSendStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "OfferSend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_status_createdAt_idx" ON "Offer"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OfferSend_offerId_status_idx" ON "OfferSend"("offerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OfferSend_offerId_subscriberId_key" ON "OfferSend"("offerId", "subscriberId");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferSend" ADD CONSTRAINT "OfferSend_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferSend" ADD CONSTRAINT "OfferSend_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
