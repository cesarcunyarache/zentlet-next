-- CreateTable
CREATE TABLE "whatsapp_link" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversation" JSONB,
    "conversationExpiresAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_link_code" (
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_link_code_pkey" PRIMARY KEY ("codeHash")
);

-- CreateTable
CREATE TABLE "whatsapp_message" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_link_phone_key" ON "whatsapp_link"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_link_userId_key" ON "whatsapp_link"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_link_code_userId_key" ON "whatsapp_link_code"("userId");

-- CreateIndex
CREATE INDEX "whatsapp_link_code_expiresAt_idx" ON "whatsapp_link_code"("expiresAt");

-- CreateIndex
CREATE INDEX "whatsapp_message_receivedAt_idx" ON "whatsapp_message"("receivedAt");

-- AddForeignKey
ALTER TABLE "whatsapp_link" ADD CONSTRAINT "whatsapp_link_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_link_code" ADD CONSTRAINT "whatsapp_link_code_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

