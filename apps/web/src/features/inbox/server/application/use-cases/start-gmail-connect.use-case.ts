import { randomBytes } from "node:crypto";
import type { GmailGateway } from "../../domain/ports/inbox.ports";

const STATE_BYTES = 24;

export class StartGmailConnectUseCase {
  constructor(private readonly gmailGateway: GmailGateway) {}

  execute() {
    if (!this.gmailGateway.isAvailable()) return null;

    const state = randomBytes(STATE_BYTES).toString("base64url");
    return { state, url: this.gmailGateway.authorizeUrl(state) };
  }
}
