CREATE TYPE "SermonStatus" AS ENUM ('DRAFT', 'PUBLISHED');

ALTER TABLE "Sermon" ADD COLUMN "status" "SermonStatus" NOT NULL DEFAULT 'DRAFT';
UPDATE "Sermon" SET "status" = 'PUBLISHED' WHERE "isPublished" = true;

ALTER TABLE "Sermon" ADD COLUMN "youtubeVideoId" TEXT;
ALTER TABLE "Sermon" ADD COLUMN "thumbnailUrl" TEXT;

ALTER TABLE "Organization" ADD COLUMN "youtubeChannelId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "youtubeChannelInput" TEXT;
ALTER TABLE "Organization" ADD COLUMN "defaultSermonSpeaker" TEXT DEFAULT 'Pastor GraceLove Hiire';

CREATE TABLE "IgnoredVideo" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IgnoredVideo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IgnoredVideo_organizationId_youtubeVideoId_key" ON "IgnoredVideo"("organizationId", "youtubeVideoId");
CREATE INDEX "IgnoredVideo_organizationId_idx" ON "IgnoredVideo"("organizationId");
ALTER TABLE "IgnoredVideo" ADD CONSTRAINT "IgnoredVideo_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- youtubeVideoId stays nullable here. scripts/backfill-sermon-youtube-ids.ts fills it,
-- stops if two sermons in one church parse to the same video, then adds the unique index.
