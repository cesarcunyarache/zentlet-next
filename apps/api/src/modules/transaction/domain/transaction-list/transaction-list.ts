export type TransactionListRole = 'owner' | 'editor' | 'viewer';

export type TransactionList = {
  id: string;
  ownerId: string;
  privateOwnerId: string | null;
  currency: string;
  name: string;
  icon: string;
  color: string;
};

export type NewTransactionList = {
  id: string;
  ownerId: string;
  name: string;
  icon: string;
  color: string;
  currency: string;
};

export type ListMembership = {
  role: TransactionListRole;
  list: {
    currency: string;
    privateOwnerId: string | null;
    archivedAt: Date | null;
  };
};
