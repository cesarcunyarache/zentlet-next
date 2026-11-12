export type EmailInbox = {
  id: string;
  userId: string;
  address: string;
  verificationCode: string | null;
  verificationUrl: string | null;
  lastReceivedAt: Date | null;
};

export type EmailVerification = {
  code: string | null;
  url: string | null;
};
