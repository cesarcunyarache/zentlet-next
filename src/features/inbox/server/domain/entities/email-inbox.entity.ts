export interface EmailInbox {
  id: string;
  userId: string;
  address: string;
  verificationCode: string | null;
  verificationUrl: string | null;
  lastReceivedAt: Date | null;
}

export interface EmailVerification {
  code: string | null;
  url: string | null;
}
