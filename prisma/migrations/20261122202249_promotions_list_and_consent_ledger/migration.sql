-- CreateEnum
CREATE TYPE "ConsentChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "ConsentAction" AS ENUM ('GRANTED', 'CONFIRMED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "Subscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailConfirmedAt" TIMESTAMP(3),
    "phone" TEXT,
    "smsConsentAt" TIMESTAMP(3),
    "emailStoppedAt" TIMESTAMP(3),
    "smsStoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriberToken" (
    "tokenHash" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriberToken_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "ConsentEvent" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "channel" "ConsentChannel" NOT NULL,
    "action" "ConsentAction" NOT NULL,
    "target" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "disclosureVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscriber_email_key" ON "Subscriber"("email");

-- CreateIndex
CREATE INDEX "Subscriber_emailConfirmedAt_idx" ON "Subscriber"("emailConfirmedAt");

-- CreateIndex
CREATE INDEX "Subscriber_phone_idx" ON "Subscriber"("phone");

-- CreateIndex
CREATE INDEX "SubscriberToken_subscriberId_createdAt_idx" ON "SubscriberToken"("subscriberId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriberToken_expiresAt_idx" ON "SubscriberToken"("expiresAt");

-- CreateIndex
CREATE INDEX "ConsentEvent_subscriberId_channel_createdAt_idx" ON "ConsentEvent"("subscriberId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentEvent_channel_action_createdAt_idx" ON "ConsentEvent"("channel", "action", "createdAt");

-- AddForeignKey
ALTER TABLE "SubscriberToken" ADD CONSTRAINT "SubscriberToken_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
