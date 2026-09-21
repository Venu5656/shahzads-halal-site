-- DropTable
DROP TABLE "OtpCode";

-- DropEnum
DROP TYPE "OtpPurpose";

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "ipHash" TEXT,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_phone_createdAt_idx" ON "LoginAttempt"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipHash_createdAt_idx" ON "LoginAttempt"("ipHash", "createdAt");

