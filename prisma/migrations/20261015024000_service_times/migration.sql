CREATE TABLE "ServiceTime" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "homeLabel" TEXT,
    "cadence" TEXT NOT NULL,
    "weekday" TEXT,
    "opens" TEXT NOT NULL,
    "closes" TEXT NOT NULL,
    "startLabel" TEXT NOT NULL,
    "endLabel" TEXT NOT NULL,
    "place" TEXT,
    "note" TEXT,
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ServiceTime_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServiceTime_organizationId_name_key" ON "ServiceTime"("organizationId", "name");
CREATE INDEX "ServiceTime_organizationId_sortOrder_idx" ON "ServiceTime"("organizationId", "sortOrder");

ALTER TABLE "ServiceTime" ADD CONSTRAINT "ServiceTime_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
