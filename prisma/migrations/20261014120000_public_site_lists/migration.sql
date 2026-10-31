ALTER TABLE "Group" ADD COLUMN "showOnWebsite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Group" ADD COLUMN "publicDescription" TEXT;
ALTER TABLE "Group" ADD COLUMN "meetingTime" TEXT;
ALTER TABLE "Group" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Group" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Event" ADD COLUMN "prayerRoomId" TEXT;
CREATE INDEX "Event_prayerRoomId_idx" ON "Event"("prayerRoomId");
ALTER TABLE "Event" ADD CONSTRAINT "Event_prayerRoomId_fkey" FOREIGN KEY ("prayerRoomId") REFERENCES "PrayerRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VisitorCard" ADD COLUMN "service" TEXT;

CREATE TABLE "Leader" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "photoUrl" TEXT,
    "bio" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Leader_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Leader_organizationId_idx" ON "Leader"("organizationId");
ALTER TABLE "Leader" ADD CONSTRAINT "Leader_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Faq_organizationId_idx" ON "Faq"("organizationId");
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
