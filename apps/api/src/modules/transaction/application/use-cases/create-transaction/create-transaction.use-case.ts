import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/prisma/infrastructure/prisma.service.js';
import type { Transaction } from '../../../domain/transaction/transaction.js';
import { TransactionRepository } from '../../../domain/transaction/transaction.repository.js';
import { CategoryNotOwnedError, InvalidTransactionAmountError, TransactionIdTakenError } from '../../../domain/transaction.errors.js';
import { ListPlacementService } from '../../services/list-placement.service.js';
import type { CreateTransactionInput } from './create-transaction.input.js';
import type { CreateTransactionOutput } from './create-transaction.output.js';

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly listPlacement: ListPlacementService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateTransactionInput): Promise<CreateTransactionOutput> {
    if (input.id) {
      const existing = await this.transactionRepository.findById(input.id);
      if (existing) {
        if (existing.userId !== input.userId) throw new TransactionIdTakenError(input.id);
        return { transaction: existing, created: false };
      }
    }

    if (!(input.amount > 0)) throw new InvalidTransactionAmountError(input.amount);

    const ownsCategory = await this.categoryBelongsToUser(input.categoryId, input.userId);
    if (!ownsCategory) throw new CategoryNotOwnedError(input.categoryId);

    const listId = await this.listPlacement.resolveTargetListId(input.userId, input.listId ?? null);

    const now = new Date();
    const draft: Transaction = {
      id: input.id ?? crypto.randomUUID(),
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      categoryId: input.categoryId,
      description: input.description ?? null,
      reference: input.reference ?? null,
      transactionDate: input.transactionDate,
      recurringTransactionId: null,
      listId,
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.transactionRepository.create(draft);
    if (created !== 'id_taken') return { transaction: created, created: true };

    // Lost the race between our existence check and the insert: another
    // request with the same id landed first.
    const retried = await this.transactionRepository.findOwned(draft.id, input.userId);
    if (!retried) throw new TransactionIdTakenError(draft.id);
    return { transaction: retried, created: false };
  }

  private async categoryBelongsToUser(categoryId: string, userId: string): Promise<boolean> {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
    return category !== null;
  }
}
