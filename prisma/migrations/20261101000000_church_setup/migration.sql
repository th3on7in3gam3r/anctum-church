-- Church setup: feature switches, brand, terminology, and church-defined roles.

ALTER TYPE "AuditAction" ADD VALUE 'SETUP_FEATURES_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'SETUP_BRAND_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'SETUP_ROLE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SETUP_ROLE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SETUP_ROLE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'SETUP_ROLE_ASSIGNED';

ALTER TABLE "Organization" ADD COLUMN "appName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "brandTheme" TEXT NOT NULL DEFAULT 'forest';
ALTER TABLE "Organization" ADD COLUMN "features" JSONB;
ALTER TABLE "Organization" ADD COLUMN "terminology" JSONB;

CREATE TABLE "ChurchRole" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "canManageSetup" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "areas" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChurchRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChurchRole_organizationId_key_key" ON "ChurchRole"("organizationId", "key");
CREATE INDEX "ChurchRole_organizationId_idx" ON "ChurchRole"("organizationId");

ALTER TABLE "ChurchRole" ADD CONSTRAINT "ChurchRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationMembership" ADD COLUMN "churchRoleId" TEXT;
CREATE INDEX "OrganizationMembership_churchRoleId_idx" ON "OrganizationMembership"("churchRoleId");
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_churchRoleId_fkey" FOREIGN KEY ("churchRoleId") REFERENCES "ChurchRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
