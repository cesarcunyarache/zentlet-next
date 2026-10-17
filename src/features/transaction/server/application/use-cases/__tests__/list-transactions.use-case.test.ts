import { describe, expect, it, vi } from "vitest";
import { decodeCursor, encodeCursor } from "../../../../lib/feed-query";
import type { TransactionListQuery } from "../../../../schemas/transaction-api.schema";
import { ListTransactionsUseCase } from "../list-transactions.use-case";
import { fakeRepository, stored } from "./fake-transaction.repository";

const USER = "user-1";

const transactionOn = (day: number) =>
  stored({
    id: `tx-${day}`,
    userId: USER,
    description: "Café",
    amount: 5,
    type: "expense",
    categoryId: "food",
    reference: null,
    transactionDate: new Date(Date.UTC(2026, 8, day)),
    listId: "private-list",
  });

const query = (overrides: Partial<TransactionListQuery> = {}) => ({ limit: 2, ...overrides }) as TransactionListQuery;

describe("ListTransactionsUseCase", () => {
  it("pide una fila de más para saber si hay otra página", async () => {
    const rows = [transactionOn(3), transactionOn(2), transactionOn(1)];
    const repository = fakeRepository({ findFeed: vi.fn().mockResolvedValue(rows) });

    const result = await new ListTransactionsUseCase(repository).execute(USER, query());

    expect(repository.findFeed).toHaveBeenCalledWith(USER, {}, null, 3);
    expect(result).toEqual({ items: rows.slice(0, 2), nextCursor: encodeCursor(rows[1]) });
  });

  it("en la última página no hay cursor siguiente", async () => {
    const rows = [transactionOn(2)];
    const repository = fakeRepository({ findFeed: vi.fn().mockResolvedValue(rows) });

    expect(await new ListTransactionsUseCase(repository).execute(USER, query())).toEqual({
      items: rows,
      nextCursor: null,
    });
  });

  it("continúa desde el cursor recibido", async () => {
    const cursor = encodeCursor(transactionOn(5));
    const repository = fakeRepository();

    await new ListTransactionsUseCase(repository).execute(USER, query({ cursor }));

    expect(repository.findFeed).toHaveBeenCalledWith(USER, {}, decodeCursor(cursor), 3);
  });

  it("un cursor ilegible es invalid_cursor y no consulta", async () => {
    const repository = fakeRepository();

    const result = await new ListTransactionsUseCase(repository).execute(USER, query({ cursor: "basura" }));

    expect(result).toEqual({ error: "invalid_cursor" });
    expect(repository.findFeed).not.toHaveBeenCalled();
  });
});
