import type { TransactionListQuery } from "../../../schemas/transaction-api.schema";
import { decodeCursor, encodeCursor } from "../../../lib/feed-query";
import type { FeedCursor } from "../../domain/entities/transaction.entity";
import { fail } from "../../domain/errors/transaction.errors";
import type { TransactionRepository } from "../../domain/repositories/transaction.repository";

export class ListTransactionsUseCase {
  constructor(private readonly transactionRepository: TransactionRepository) {}

  async execute(userId: string, query: TransactionListQuery) {
    const { cursor, limit, ...filters } = query;

    let after: FeedCursor | null = null;

    if (cursor) {
      after = decodeCursor(cursor);
      if (!after) return fail("invalid_cursor");
    }

    const rows = await this.transactionRepository.findFeed(
      userId,
      filters,
      after,
      limit + 1,
    );

    const hasNextPage = rows.length > limit;
    const items = rows.slice(0, limit);
    const nextCursor = hasNextPage
      ? encodeCursor(items[items.length - 1])
      : null;

    return { items, nextCursor };
  }
}
