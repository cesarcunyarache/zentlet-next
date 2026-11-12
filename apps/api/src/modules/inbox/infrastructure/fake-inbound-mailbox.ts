import { InboundMailbox } from '../domain/inbound-mailbox.js';

export class FakeInboundMailbox extends InboundMailbox {
  constructor(private readonly value: string | null = 'in.zentlet.test') {
    super();
  }

  domain(): string | null {
    return this.value;
  }
}
