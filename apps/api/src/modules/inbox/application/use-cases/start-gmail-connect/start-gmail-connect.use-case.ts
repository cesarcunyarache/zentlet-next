import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { GmailClient } from '../../../domain/gmail-client.js';

const STATE_BYTES = 24;

@Injectable()
export class StartGmailConnectUseCase {
  constructor(private readonly gmailClient: GmailClient) {}

  execute(): { state: string; url: string } | null {
    if (!this.gmailClient.isAvailable()) return null;

    const state = randomBytes(STATE_BYTES).toString('base64url');
    return { state, url: this.gmailClient.authorizeUrl(state) };
  }
}
