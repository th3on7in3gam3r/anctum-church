CREATE TYPE "PrayerRoomKind" AS ENUM ('CORPORATE', 'HUDDLE');

ALTER TABLE "PrayerRoom" ADD COLUMN "kind" "PrayerRoomKind" NOT NULL DEFAULT 'CORPORATE';
ALTER TABLE "PrayerRoom" ADD COLUMN "groupId" TEXT;

ALTER TABLE "PrayerRoom" ADD CONSTRAINT "PrayerRoom_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PrayerRoom_groupId_idx" ON "PrayerRoom"("groupId");
