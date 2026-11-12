import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/prisma/infrastructure/prisma.service.js';
import { TransactionRepository } from '../../../domain/transaction/transaction.repository.js';
import { CategoryNotOwnedError, InvalidTransactionAmountError, TransactionNotFoundError } from '../../../domain/transaction.errors.js';
import type { UpdateTransactionInput } from './update-transaction.input.js';
import type { UpdateTransactionOutput } from './update-transaction.output.js';

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateTransactionInput): Promise<UpdateTransactionOutput> {
    const existing = await this.transactionRepository.findOwned(input.id, input.userId);
    if (!existing) throw new TransactionNotFoundError(input.id);

    if (input.patch.amount !== undefined && !(input.patch.amount > 0)) {
      throw new InvalidTransactionAmountError(input.patch.amount);
    }

    if (input.patch.categoryId !== undefined) {
      const ownsCategory = await this.categoryBelongsToUser(input.patch.categoryId, input.userId);
      if (!ownsCategory) throw new CategoryNotOwnedError(input.patch.categoryId);
    }

    const updated = await this.transactionRepository.update(input.id, input.userId, input.patch);
    if (!updated) throw new TransactionNotFoundError(input.id);

    return { transaction: updated };
  }

  private async categoryBelongsToUser(categoryId: string, userId: string): Promise<boolean> {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId }, select: { id: true } });
    return category !== null;
  }
}
