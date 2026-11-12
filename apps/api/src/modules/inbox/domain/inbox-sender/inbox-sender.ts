export type SenderStatus = 'trusted' | 'blocked';
export type SenderOrigin = 'manual' | 'learned';
export type SenderVerdict = 'known' | 'trusted' | 'blocked' | 'unknown';

export type SenderRule = {
  address: string;
  status: string;
  origin: string;
  acceptedCount: number;
  dismissedCount: number;
};

export type InboxSender = SenderRule & {
  id: string;
  userId: string;
  createdAt: Date;
};
