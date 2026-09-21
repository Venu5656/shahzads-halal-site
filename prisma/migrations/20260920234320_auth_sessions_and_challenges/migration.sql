-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('SIGNUP', 'LOGIN', 'CHANGE_PHONE');

-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN     "challengeHash" TEXT NOT NULL,
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "purpose" "OtpPurpose" NOT NULL,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" DROP COLUMN "sessionsValidFrom";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OtpCode_challengeHash_key" ON "OtpCode"("challengeHash");

-- CreateIndex
CREATE INDEX "OtpCode_requestIpHash_createdAt_idx" ON "OtpCode"("requestIpHash", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

