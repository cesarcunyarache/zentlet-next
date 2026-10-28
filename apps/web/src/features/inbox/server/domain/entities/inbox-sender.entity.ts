import type { SenderRule } from "../../../types";

export interface InboxSender extends SenderRule {
  id: string;
  userId: string;
  createdAt: Date;
}
