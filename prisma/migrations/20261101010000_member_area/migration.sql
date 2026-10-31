-- Member area: what church members see when they sign in.
ALTER TYPE "AuditAction" ADD VALUE 'SETUP_MEMBER_AREA_CHANGED';
ALTER TABLE "Organization" ADD COLUMN "memberArea" JSONB;
