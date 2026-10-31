-- CreateTable
CREATE TABLE "SessionChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionChatMessage_sessionId_createdAt_idx" ON "SessionChatMessage"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "SessionChatMessage" ADD CONSTRAINT "SessionChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PrayerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
