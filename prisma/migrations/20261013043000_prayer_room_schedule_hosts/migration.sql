-- AlterTable
ALTER TABLE "PrayerRoom" ADD COLUMN "selectedDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "oneTimeDate" TEXT,
ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "passcodeHash" TEXT,
ADD COLUMN "allowGuests" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "prayerRequestsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "anonymousRequestsAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "chatEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateEnum
CREATE TYPE "PrayerRoomHostRole" AS ENUM ('SERMON_LEADER', 'CO_HOST');

-- CreateTable
CREATE TABLE "PrayerRoomHost" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PrayerRoomHostRole" NOT NULL,

    CONSTRAINT "PrayerRoomHost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrayerRoomHost_roomId_userId_key" ON "PrayerRoomHost"("roomId", "userId");

-- CreateIndex
CREATE INDEX "PrayerRoomHost_roomId_idx" ON "PrayerRoomHost"("roomId");

-- CreateIndex
CREATE INDEX "PrayerRoomHost_userId_idx" ON "PrayerRoomHost"("userId");

-- AddForeignKey
ALTER TABLE "PrayerRoomHost" ADD CONSTRAINT "PrayerRoomHost_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PrayerRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerRoomHost" ADD CONSTRAINT "PrayerRoomHost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
