export type GetSubscriptionInput = {
  userId: string;
  // Re-fetches the provider's snapshot before returning, instead of trusting
  // our last-known state (used after checkout return, with no webhook yet).
  sync?: boolean;
};
