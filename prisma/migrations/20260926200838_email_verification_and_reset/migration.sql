-- Email verification and password reset.
--
-- User.email becomes required and unique, because it is now the address every
-- verification and reset link is sent to.
--
-- Pre-launch data note: any account created before this migration has no email
-- address. Rather than drop those rows, each gets a placeholder at the
-- unroutable .invalid TLD (RFC 2606) and stays unverified, so it cannot log in
-- and cannot receive mail. Re-register those accounts; there is no production
-- data at this point.

-- CreateEnum
CREATE TYPE "EmailTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- DropIndex
DROP INDEX "LoginAttempt_phone_createdAt_idx";

-- AlterTable
-- Rename rather than drop-and-add: the column holds the same thing (whatever
-- was typed in the identifier box), and dropping it would both lose the recent
-- failure history that rate limiting reads and fail on a non-empty table.
ALTER TABLE "LoginAttempt" RENAME COLUMN "phone" TO "identifier";

-- AlterTable
-- Backfill before the NOT NULL constraint can be applied.
UPDATE "User"
SET "email" = 'needs-email+' || "id" || '@shahzads.invalid'
WHERE "email" IS NULL;

ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "pendingEmail" TEXT,
ALTER COLUMN "email" SET NOT NULL;

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "EmailTokenPurpose" NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_tokenHash_key" ON "EmailToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailToken_userId_purpose_createdAt_idx" ON "EmailToken"("userId", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "EmailToken_email_purpose_createdAt_idx" ON "EmailToken"("email", "purpose", "createdAt");

-- CreateIndex
CREATE INDEX "EmailToken_expiresAt_idx" ON "EmailToken"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_identifier_createdAt_idx" ON "LoginAttempt"("identifier", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

