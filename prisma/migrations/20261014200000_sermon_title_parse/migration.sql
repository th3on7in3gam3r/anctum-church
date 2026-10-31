ALTER TABLE "Organization" ADD COLUMN "speakerAliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Sermon" ADD COLUMN "sourceTitle" TEXT;
