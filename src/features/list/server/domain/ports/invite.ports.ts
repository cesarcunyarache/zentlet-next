export interface InviteTokens {
  create(): { token: string; hash: string };
  hash(token: string): string;
}

export interface InviteEmail {
  to: string;
  token: string;
  inviterName: string;
  listName: string;
  locale: string;
}

export interface InviteMailer {
  send(email: InviteEmail): Promise<boolean>;
}
