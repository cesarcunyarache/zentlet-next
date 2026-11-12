// Resolves the domain used to allocate forwarding addresses (e.g. "in.zentlet.app").
// Returns null when email import is not configured for this deployment.
export abstract class InboundMailbox {
  abstract domain(): string | null;
}
