import { Injectable } from '@nestjs/common';
import { ListCategoriesUseCase } from '../../category/application/use-cases/list-categories/list-categories.use-case.js';
import { CreateTransactionUseCase } from '../../transaction/application/use-cases/create-transaction/create-transaction.use-case.js';
import { Logger } from '../../../shared/logger/domain/logger.js';
import { WhatsappLedger, type RecordableMovement, type WhatsappCategory } from '../domain/whatsapp-ledger/whatsapp-ledger.js';

@Injectable()
export class TransactionWhatsappLedger extends WhatsappLedger {
  constructor(
    private readonly listCategories: ListCategoriesUseCase,
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly logger: Logger,
  ) {
    super();
  }

  async categories(userId: string): Promise<WhatsappCategory[]> {
    const categories = await this.listCategories.execute({ userId });
    return categories.map((category) => ({ id: category.id, name: category.name }));
  }

  // Never throws: the port's contract is that a failed record leaves the
  // draft pending rather than crashing the conversation handler.
  async record(userId: string, movementId: string, movement: RecordableMovement): Promise<boolean> {
    try {
      await this.createTransaction.execute({
        id: movementId,
        userId,
        type: movement.type,
        amount: movement.amount,
        categoryId: movement.categoryId,
        description: movement.description,
        transactionDate: new Date(),
      });
      return true;
    } catch (error) {
      this.logger.error({ err: error, userId, movementId }, 'whatsapp.record_failed');
      return false;
    }
  }
}
