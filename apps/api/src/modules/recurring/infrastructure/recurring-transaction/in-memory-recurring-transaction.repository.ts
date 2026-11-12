import { Injectable } from '@nestjs/common';
import type {
  DueRecurringTransaction,
  OccurrenceDraft,
  RecurringTransaction,
  StartSeriesDraft,
  StartSeriesResult,
} from '../../domain/recurring-transaction/recurring-transaction.js';
import { RecurringTransactionRepository } from '../../domain/recurring-transaction/recurring-transaction.repository.js';

type StoredOccurrence = { id: string; transactionDate: Date; listId: string };

@Injectable()
export class InMemoryRecurringTransactionRepository extends RecurringTransactionRepository {
  private readonly templates = new Map<string, RecurringTransaction>();
  private readonly occurrences = new Map<string, StoredOccurrence[]>();

  async startSeries(draft: StartSeriesDraft): Promise<StartSeriesResult> {
    const recurringTransaction: RecurringTransaction = {
      id: draft.id,
      userId: draft.userId,
      type: draft.type,
      amount: draft.amount,
      description: draft.description,
      categoryId: draft.categoryId,
      frequency: draft.frequency,
      anchorDate: draft.anchorDate,
      nextDueDate: draft.nextDueDate,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };

    this.templates.set(draft.id, recurringTransaction);
    this.occurrences.set(draft.id, [
      { id: draft.firstTransaction.id, transactionDate: draft.anchorDate, listId: draft.firstTransaction.listId },
    ]);

    return { recurringTransaction, transactionId: draft.firstTransaction.id };
  }

  async findDueBy(date: Date): Promise<DueRecurringTransaction[]> {
    const due: DueRecurringTransaction[] = [];
    for (const template of this.templates.values()) {
      if (template.nextDueDate.getTime() > date.getTime()) continue;
      const listId = this.occurrences.get(template.id)?.[0]?.listId;
      if (!listId) continue;
      due.push({ ...template, listId });
    }
    return due;
  }

  async recordOccurrences(id: string, drafts: OccurrenceDraft[], nextDueDate: Date): Promise<number> {
    const existing = this.occurrences.get(id) ?? [];
    // Stands in for the DB's `@@unique([recurringTransactionId, transactionDate])`
    // plus `skipDuplicates`: replaying the same drafts never double-inserts.
    const existingDates = new Set(existing.map((occurrence) => occurrence.transactionDate.getTime()));

    let createdCount = 0;
    for (const draft of drafts) {
      if (existingDates.has(draft.transactionDate.getTime())) continue;
      existing.push({ id: crypto.randomUUID(), transactionDate: draft.transactionDate, listId: draft.listId });
      existingDates.add(draft.transactionDate.getTime());
      createdCount += 1;
    }
    this.occurrences.set(id, existing);

    const template = this.templates.get(id);
    if (template) this.templates.set(id, { ...template, nextDueDate });

    return createdCount;
  }

  async deleteOwned(id: string, userId: string): Promise<boolean> {
    const template = this.templates.get(id);
    if (!template || template.userId !== userId) return false;
    this.templates.delete(id);
    // Already-generated transactions survive via the DB's `onDelete: SetNull`;
    // this fake deliberately leaves `occurrences` untouched for the same reason.
    return true;
  }

  // Test helpers — not part of the port, only used to set up fixtures.
  seedTemplate(template: RecurringTransaction, listId: string): void {
    this.templates.set(template.id, template);
    this.occurrences.set(template.id, [{ id: crypto.randomUUID(), transactionDate: template.anchorDate, listId }]);
  }

  occurrenceCount(id: string): number {
    return this.occurrences.get(id)?.length ?? 0;
  }
}
