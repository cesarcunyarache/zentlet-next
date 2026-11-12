import type { ZodTypeAny, z } from 'zod';
import { AiService } from '../../../../../shared/ai/application/ai.service.js';
import { ObjectGenerator, type GenerateObjectRequest, type GenerateObjectResult } from '../../../../../shared/ai/domain/object-generator.js';
import { Logger, type LogContext } from '../../../../../shared/logger/domain/logger.js';
import { WhatsappLedger, type RecordableMovement, type WhatsappCategory } from '../../../domain/whatsapp-ledger/whatsapp-ledger.js';
import { WhatsappMessenger } from '../../../domain/whatsapp-messenger/whatsapp-messenger.js';

export class FakeLogger extends Logger {
  debug(_context: LogContext, _message: string): void {}
  info(_context: LogContext, _message: string): void {}
  warn(_context: LogContext, _message: string): void {}
  error(_context: LogContext, _message: string): void {}
}

export class FakeObjectGenerator extends ObjectGenerator {
  readonly model = 'fake-model';
  calls = 0;

  constructor(
    private readonly outputs: unknown[] = [],
    private readonly shouldFail = false,
  ) {
    super();
  }

  async generate<T extends ZodTypeAny>(_request: GenerateObjectRequest<T>): Promise<GenerateObjectResult<T>> {
    this.calls += 1;
    if (this.shouldFail) throw new Error('ai generation failed');
    return { output: this.outputs.shift() as z.infer<T> };
  }
}

export function fakeAiService(
  outputs: unknown[] = [],
  options: { configured?: boolean; shouldFail?: boolean } = {},
): { ai: AiService; generator: FakeObjectGenerator | null } {
  const configured = options.configured ?? true;
  const generator = configured ? new FakeObjectGenerator(outputs, options.shouldFail ?? false) : null;
  return { ai: new AiService(generator, new FakeLogger()), generator };
}

export class FakeWhatsappLedger extends WhatsappLedger {
  readonly recorded: { userId: string; movementId: string; movement: RecordableMovement }[] = [];

  constructor(
    private readonly userCategories: WhatsappCategory[] = [],
    private readonly recordResult = true,
  ) {
    super();
  }

  async categories(_userId: string): Promise<WhatsappCategory[]> {
    return this.userCategories;
  }

  async record(userId: string, movementId: string, movement: RecordableMovement): Promise<boolean> {
    this.recorded.push({ userId, movementId, movement });
    return this.recordResult;
  }
}

export class FakeWhatsappMessenger extends WhatsappMessenger {
  readonly sent: { phone: string; text: string }[] = [];

  async send(phone: string, text: string): Promise<void> {
    this.sent.push({ phone, text });
  }
}
