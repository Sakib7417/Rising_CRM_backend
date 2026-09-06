/*
  Warnings:

  - The values [ACTIVE,INTERESTED,QUOTATION_SENT] on the enum `LeadStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FollowupType" AS ENUM ('PHONE_CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'SITE_VISIT');

-- CreateEnum
CREATE TYPE "FollowupOutcome" AS ENUM ('INTERESTED', 'NOT_INTERESTED', 'BUSY', 'CALL_LATER', 'NO_ANSWER', 'QUOTATION_SENT', 'DEMO_SCHEDULED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadSource" ADD VALUE 'INSTAGRAM';
ALTER TYPE "LeadSource" ADD VALUE 'GOOGLE';
ALTER TYPE "LeadSource" ADD VALUE 'OTHER';

-- AlterEnum
BEGIN;
CREATE TYPE "LeadStatus_new" AS ENUM ('NEW', 'CONTACTED', 'FOLLOW_UP', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'CLOSED', 'INACTIVE');
ALTER TABLE "public"."Lead" ALTER COLUMN "leadStatus" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "leadStatus" TYPE "LeadStatus_new" USING ("leadStatus"::text::"LeadStatus_new");
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
DROP TYPE "public"."LeadStatus_old";
ALTER TABLE "Lead" ALTER COLUMN "leadStatus" SET DEFAULT 'NEW';
COMMIT;

-- AlterTable
ALTER TABLE "Followup" ADD COLUMN     "followupType" "FollowupType" NOT NULL DEFAULT 'PHONE_CALL',
ADD COLUMN     "outcome" "FollowupOutcome";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM';

-- CreateTable
CREATE TABLE "ImportHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT,
    "totalRows" INTEGER NOT NULL,
    "importedRows" INTEGER NOT NULL,
    "duplicateRows" INTEGER NOT NULL,
    "failedRows" INTEGER NOT NULL,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportHistory_userId_idx" ON "ImportHistory"("userId");

-- CreateIndex
CREATE INDEX "ImportHistory_createdAt_idx" ON "ImportHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "ImportHistory" ADD CONSTRAINT "ImportHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
