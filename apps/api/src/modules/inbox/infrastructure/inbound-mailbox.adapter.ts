import { Injectable } from '@nestjs/common';
import { InboundMailbox } from '../domain/inbound-mailbox.js';

@Injectable()
export class EnvInboundMailbox extends InboundMailbox {
  domain(): string | null {
    return process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase() || null;
  }
}
