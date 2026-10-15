export interface AccountCurrency {
  of(userId: string): Promise<string>;
}

export interface ListNotice {
  listId: string;
  listName: string;
}

export interface ListNotifier {
  memberJoined(ownerId: string, notice: ListNotice & { memberName: string }): Promise<void>;
  ownershipReceived(userId: string, notice: ListNotice): Promise<void>;
}
