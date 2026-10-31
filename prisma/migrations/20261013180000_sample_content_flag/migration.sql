ALTER TABLE "Page" ADD COLUMN "isPlaceholder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Announcement" ADD COLUMN "isPlaceholder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "isPlaceholder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Sermon" ADD COLUMN "isPlaceholder" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Page" SET "isPlaceholder" = true WHERE "title" LIKE '%[PLACEHOLDER]%';
UPDATE "Announcement" SET "isPlaceholder" = true WHERE "title" LIKE '%[PLACEHOLDER]%';
UPDATE "Event" SET "isPlaceholder" = true WHERE "title" LIKE '%[PLACEHOLDER]%';
UPDATE "Sermon" SET "isPlaceholder" = true WHERE "title" LIKE '%[PLACEHOLDER]%';
