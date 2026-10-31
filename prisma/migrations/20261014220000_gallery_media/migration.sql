ALTER TYPE "OrganizationRole" ADD VALUE 'MEDIA';

ALTER TYPE "AuditAction" ADD VALUE 'ALBUM_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ALBUM_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'ALBUM_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'ALBUM_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'PHOTO_CONSENT_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE 'PHOTO_HIDDEN';
ALTER TYPE "AuditAction" ADD VALUE 'VIDEO_ADDED';

ALTER TABLE "OrganizationMembership" ADD COLUMN "canPublishGallery" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "AlbumStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "AlbumCategory" AS ENUM ('SERVICE', 'EVENT', 'MINISTRY', 'OTHER');
CREATE TYPE "VideoProvider" AS ENUM ('YOUTUBE', 'TIKTOK');
CREATE TYPE "VideoOrientation" AS ENUM ('LANDSCAPE', 'VERTICAL');

CREATE TABLE "Album" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "category" "AlbumCategory" NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "status" "AlbumStatus" NOT NULL DEFAULT 'DRAFT',
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "coverPhotoId" TEXT,
  "eventId" TEXT,
  "sermonId" TEXT,
  "groupId" TEXT,
  "createdById" TEXT,
  "submittedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "publishedById" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Photo" (
  "id" TEXT NOT NULL,
  "albumId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "blurDataUrl" TEXT,
  "alt" TEXT NOT NULL,
  "caption" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "hasMinors" BOOLEAN NOT NULL DEFAULT false,
  "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "consentConfirmedById" TEXT,
  "consentConfirmedAt" TIMESTAMP(3),
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Video" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "albumId" TEXT,
  "provider" "VideoProvider" NOT NULL,
  "externalId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "thumbnailUrl" TEXT NOT NULL,
  "orientation" "VideoOrientation" NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Album_coverPhotoId_key" ON "Album"("coverPhotoId");
CREATE UNIQUE INDEX "Album_organizationId_slug_key" ON "Album"("organizationId", "slug");
CREATE INDEX "Album_organizationId_status_date_idx" ON "Album"("organizationId", "status", "date");
CREATE INDEX "Photo_albumId_sortOrder_idx" ON "Photo"("albumId", "sortOrder");
CREATE UNIQUE INDEX "Video_organizationId_provider_externalId_key" ON "Video"("organizationId", "provider", "externalId");
CREATE INDEX "Video_organizationId_isPublished_idx" ON "Video"("organizationId", "isPublished");

ALTER TABLE "Album" ADD CONSTRAINT "Album_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Album" ADD CONSTRAINT "Album_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Album" ADD CONSTRAINT "Album_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Album" ADD CONSTRAINT "Album_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "Sermon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Album" ADD CONSTRAINT "Album_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Album" ADD CONSTRAINT "Album_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Album" ADD CONSTRAINT "Album_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_consentConfirmedById_fkey" FOREIGN KEY ("consentConfirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Video" ADD CONSTRAINT "Video_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Video" ADD CONSTRAINT "Video_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;
