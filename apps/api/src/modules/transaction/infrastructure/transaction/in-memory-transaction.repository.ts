import { Injectable } from '@nestjs/common';
import type { FeedCursor, Transaction, TransactionFilters, TransactionPatch } from '../../domain/transaction/transaction.js';
import { TransactionRepository } from '../../domain/transaction/transaction.repository.js';

function matchesFilters(transaction: Transaction, filters: TransactionFilters): boolean {
  if (transaction.userId !== filters.userId) return false;
  if (filters.type && transaction.type !== filters.type) return false;
  if (filters.categoryId && transaction.categoryId !== filters.categoryId) return false;
  if (filters.listId && transaction.listId !== filters.listId) return false;
  if (filters.from && transaction.transactionDate.getTime() < filters.from.getTime()) return false;
  if (filters.to && transaction.transactionDate.getTime() > filters.to.getTime()) return false;
  return true;
}

function toCursorTuple(value: FeedCursor): [number, number, string] {
  return [value.transactionDate.getTime(), value.createdAt.getTime(), value.id];
}

/** Matches `ORDER BY transactionDate desc, createdAt desc, id desc`: positive when `a` sorts after `b`. */
function compareDesc(a: Transaction, b: FeedCursor): number {
  const left = toCursorTuple({ transactionDate: a.transactionDate, createdAt: a.createdAt, id: a.id });
  const right = toCursorTuple(b);
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] === right[index]) continue;
    return left[index] < right[index] ? 1 : -1;
  }
  return 0;
}

function isAfterCursor(transaction: Transaction, after: FeedCursor): boolean {
  return compareDesc(transaction, after) > 0;
}

@Injectable()
export class InMemoryTransactionRepository extends TransactionRepository {
  private readonly transactions = new Map<string, Transaction>();

  async create(transaction: Transaction): Promise<Transaction | 'id_taken'> {
    if (this.transactions.has(transaction.id)) return 'id_taken';
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async update(id: string, userId: string, patch: TransactionPatch): Promise<Transaction | null> {
    const existing = await this.findOwned(id, userId);
    if (!existing) return null;

    const updated: Transaction = { ...existing, ...patch, updatedAt: new Date() };
    this.transactions.set(id, updated);
    return updated;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await this.findOwned(id, userId);
    if (!existing) return false;
    this.transactions.delete(id);
    return true;
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.get(id) ?? null;
  }

  async findOwned(id: string, userId: string): Promise<Transaction | null> {
    const transaction = this.transactions.get(id);
    if (!transaction || transaction.userId !== userId) return null;
    return transaction;
  }

  async findFeed(filters: TransactionFilters, after: FeedCursor | null, take: number): Promise<Transaction[]> {
    const matching = [...this.transactions.values()]
      .filter((transaction) => matchesFilters(transaction, filters))
      .sort((a, b) => compareDesc(a, b));

    const page = after ? matching.filter((transaction) => isAfterCursor(transaction, after)) : matching;
    return page.slice(0, take);
  }

  async summarize(filters: TransactionFilters): Promise<{ total: number }> {
    const total = [...this.transactions.values()]
      .filter((transaction) => matchesFilters(transaction, filters))
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return { total };
  }
}
