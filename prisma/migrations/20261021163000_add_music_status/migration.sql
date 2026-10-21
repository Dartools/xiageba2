-- AlterTable
ALTER TABLE "Music" ADD COLUMN "status" SMALLINT NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Music_status_idx" ON "Music"("status");
