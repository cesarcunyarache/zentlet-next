import type { TransactionListQuery } from "../../schemas/transaction-api.schema";
import { decodeCursor, encodeCursor } from "../../lib/feed-query";
import { fail } from "../domain/transaction.errors";
import type { TransactionRepository } from "../domain/transaction.repository";

export class ListTransactionsUseCase {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(userId: string, query: TransactionListQuery) {
    const { cursor, limit, ...filters } = query;
    const after = cursor ? decodeCursor(cursor) : null;
    if (cursor && !after) return fail("invalid_cursor");

    const rows = await this.transactions.findFeed(userId, filters, after, limit + 1);
    const items = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? encodeCursor(items[items.length - 1]) : null;
    return { items, nextCursor };
  }
}
