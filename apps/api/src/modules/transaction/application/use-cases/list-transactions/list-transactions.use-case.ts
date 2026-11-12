import { Injectable } from '@nestjs/common';
import type { FeedCursor, Transaction, TransactionFilters } from '../../../domain/transaction/transaction.js';
import { TransactionRepository } from '../../../domain/transaction/transaction.repository.js';
import { InvalidTransactionCursorError } from '../../../domain/transaction.errors.js';
import type { ListTransactionsInput } from './list-transactions.input.js';
import type { ListTransactionsOutput } from './list-transactions.output.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function encodeCursor(cursor: FeedCursor): string {
  const payload = { transactionDate: cursor.transactionDate.toISOString(), createdAt: cursor.createdAt.toISOString(), id: cursor.id };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): FeedCursor {
  try {
    const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      transactionDate: string;
      createdAt: string;
      id: string;
    };
    const transactionDate = new Date(payload.transactionDate);
    const createdAt = new Date(payload.createdAt);
    if (Number.isNaN(transactionDate.getTime()) || Number.isNaN(createdAt.getTime()) || !payload.id) {
      throw new Error('invalid cursor payload');
    }
    return { transactionDate, createdAt, id: payload.id };
  } catch {
    throw new InvalidTransactionCursorError();
  }
}

function toFilters(input: ListTransactionsInput): TransactionFilters {
  return {
    userId: input.userId,
    type: input.type,
    categoryId: input.categoryId,
    listId: input.listId,
    from: input.from,
    to: input.to,
  };
}

@Injectable()
export class ListTransactionsUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(input: ListTransactionsInput): Promise<ListTransactionsOutput> {
    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const after = input.cursor ? decodeCursor(input.cursor) : null;

    const transactions = await this.transactionRepository.findFeed(toFilters(input), after, limit);

    return { transactions, nextCursor: this.nextCursor(transactions, limit) };
  }

  private nextCursor(transactions: Transaction[], limit: number): string | null {
    if (transactions.length < limit) return null;
    const last = transactions[transactions.length - 1];
    if (!last) return null;
    return encodeCursor({ transactionDate: last.transactionDate, createdAt: last.createdAt, id: last.id });
  }
}
