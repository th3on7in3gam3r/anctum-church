-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'PRAYER_LEADER', 'TECHNICAL_ADMIN');

-- CreateEnum
CREATE TYPE "SessionRole" AS ENUM ('HOST', 'MODERATOR', 'SPEAKER', 'LISTENER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('AUDIO_PRAYER', 'PRAYER_LEADER_VIDEO', 'EVENT');

-- CreateEnum
CREATE TYPE "SpeakerPermissionMode" AS ENUM ('ADMIN_APPROVAL_REQUIRED', 'PRAYER_LEADERS', 'OPEN_MICROPHONE');

-- CreateEnum
CREATE TYPE "RoomLifecycleStatus" AS ENUM ('SCHEDULED', 'WAITING', 'LIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'WAITING', 'STARTING', 'LIVE', 'ENDING', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RaisedHandStatus" AS ENUM ('WAITING', 'INVITED', 'DISMISSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PrayerRequestStatus" AS ENUM ('PENDING', 'ANSWERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SpeakerInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ROOM_CREATED', 'ROOM_UPDATED', 'ROOM_ARCHIVED', 'SESSION_STARTED', 'SESSION_ENDED', 'SESSION_CANCELLED', 'PARTICIPANT_JOINED', 'PARTICIPANT_REMOVED', 'HAND_RAISED', 'SPEAKER_INVITED', 'SPEAKER_GRANTED', 'SPEAKER_REVOKED', 'SPEAKER_TRANSFERRED', 'ROLE_CHANGED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Uganda',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Kampala',
    "website" TEXT,
    "primaryContactName" TEXT NOT NULL,
    "primaryContactEmail" TEXT NOT NULL,
    "phone" TEXT,
    "accentColor" TEXT DEFAULT '#203C32',
    "joinPageMessage" TEXT DEFAULT 'Join your church family in prayer.',
    "defaultRoomType" "RoomType" NOT NULL DEFAULT 'AUDIO_PRAYER',
    "defaultSpeakerPermission" "SpeakerPermissionMode" NOT NULL DEFAULT 'ADMIN_APPROVAL_REQUIRED',
    "defaultRecording" BOOLEAN NOT NULL DEFAULT false,
    "defaultExpectedAttendance" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerRoom" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "roomType" "RoomType" NOT NULL DEFAULT 'AUDIO_PRAYER',
    "expectedAttendance" INTEGER NOT NULL DEFAULT 1000,
    "speakerPermission" "SpeakerPermissionMode" NOT NULL DEFAULT 'ADMIN_APPROVAL_REQUIRED',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "scheduledStart" TEXT NOT NULL DEFAULT '05:00 AM',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Kampala',
    "recordingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "RoomLifecycleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "livekitRoomName" TEXT,
    "permanentUrl" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrayerRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerSession" (
    "id" TEXT NOT NULL,
    "prayerRoomId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStart" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "livekitRoomName" TEXT,
    "activeSpeakerParticipantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrayerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "realtimeIdentity" TEXT NOT NULL,
    "role" "SessionRole" NOT NULL DEFAULT 'LISTENER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaisedHand" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "status" "RaisedHandStatus" NOT NULL DEFAULT 'WAITING',
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "RaisedHand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakerInvitation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "invitedById" TEXT,
    "status" "SpeakerInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "SpeakerInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerRequest" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "participantId" TEXT,
    "request" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "status" "PrayerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrayerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "sessionId" TEXT,
    "actorId" TEXT,
    "action" "AuditAction" NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_idx" ON "OrganizationMembership"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMembership_status_idx" ON "OrganizationMembership"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "PrayerRoom_organizationId_idx" ON "PrayerRoom"("organizationId");

-- CreateIndex
CREATE INDEX "PrayerRoom_slug_idx" ON "PrayerRoom"("slug");

-- CreateIndex
CREATE INDEX "PrayerRoom_status_idx" ON "PrayerRoom"("status");

-- CreateIndex
CREATE INDEX "PrayerRoom_createdAt_idx" ON "PrayerRoom"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrayerRoom_organizationId_slug_key" ON "PrayerRoom"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "PrayerSession_prayerRoomId_idx" ON "PrayerSession"("prayerRoomId");

-- CreateIndex
CREATE INDEX "PrayerSession_status_idx" ON "PrayerSession"("status");

-- CreateIndex
CREATE INDEX "PrayerSession_createdAt_idx" ON "PrayerSession"("createdAt");

-- CreateIndex
CREATE INDEX "SessionParticipant_sessionId_idx" ON "SessionParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "SessionParticipant_userId_idx" ON "SessionParticipant"("userId");

-- CreateIndex
CREATE INDEX "SessionParticipant_role_idx" ON "SessionParticipant"("role");

-- CreateIndex
CREATE UNIQUE INDEX "SessionParticipant_sessionId_realtimeIdentity_key" ON "SessionParticipant"("sessionId", "realtimeIdentity");

-- CreateIndex
CREATE INDEX "RaisedHand_sessionId_idx" ON "RaisedHand"("sessionId");

-- CreateIndex
CREATE INDEX "RaisedHand_participantId_idx" ON "RaisedHand"("participantId");

-- CreateIndex
CREATE INDEX "RaisedHand_status_idx" ON "RaisedHand"("status");

-- CreateIndex
CREATE INDEX "RaisedHand_raisedAt_idx" ON "RaisedHand"("raisedAt");

-- CreateIndex
CREATE INDEX "SpeakerInvitation_sessionId_idx" ON "SpeakerInvitation"("sessionId");

-- CreateIndex
CREATE INDEX "SpeakerInvitation_participantId_idx" ON "SpeakerInvitation"("participantId");

-- CreateIndex
CREATE INDEX "SpeakerInvitation_status_idx" ON "SpeakerInvitation"("status");

-- CreateIndex
CREATE INDEX "SpeakerInvitation_createdAt_idx" ON "SpeakerInvitation"("createdAt");

-- CreateIndex
CREATE INDEX "PrayerRequest_sessionId_idx" ON "PrayerRequest"("sessionId");

-- CreateIndex
CREATE INDEX "PrayerRequest_status_idx" ON "PrayerRequest"("status");

-- CreateIndex
CREATE INDEX "PrayerRequest_isPrivate_idx" ON "PrayerRequest"("isPrivate");

-- CreateIndex
CREATE INDEX "PrayerRequest_createdAt_idx" ON "PrayerRequest"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_idx" ON "AuditEvent"("organizationId");

-- CreateIndex
CREATE INDEX "AuditEvent_sessionId_idx" ON "AuditEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_idx" ON "AuditEvent"("action");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerRoom" ADD CONSTRAINT "PrayerRoom_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerRoom" ADD CONSTRAINT "PrayerRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerSession" ADD CONSTRAINT "PrayerSession_prayerRoomId_fkey" FOREIGN KEY ("prayerRoomId") REFERENCES "PrayerRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PrayerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaisedHand" ADD CONSTRAINT "RaisedHand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PrayerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaisedHand" ADD CONSTRAINT "RaisedHand_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SessionParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerInvitation" ADD CONSTRAINT "SpeakerInvitation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PrayerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerInvitation" ADD CONSTRAINT "SpeakerInvitation_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SessionParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakerInvitation" ADD CONSTRAINT "SpeakerInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerRequest" ADD CONSTRAINT "PrayerRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PrayerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerRequest" ADD CONSTRAINT "PrayerRequest_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SessionParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PrayerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

