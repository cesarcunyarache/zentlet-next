import { isExpense } from "@/features/transaction/server/domain/entities/transaction.entity";
import { merchantKey } from "../../../lib/merchant";
import type { AcceptInboxItemInput } from "../../../schemas/inbox-api.schema";
import { fail } from "../../domain/errors/inbox.errors";
import type { BudgetMonitor, ListPlacement } from "../../domain/ports/inbox.ports";
import type { InboxItemRepository } from "../../domain/repositories/inbox-item.repository";

export class AcceptInboxItemUseCase {
  constructor(
    private readonly inboxItemRepository: InboxItemRepository,
    private readonly listPlacement: ListPlacement,
    private readonly budgetMonitor: BudgetMonitor,
  ) {}

  async execute(userId: string, id: string, input: AcceptInboxItemInput) {
    const item = await this.inboxItemRepository.findPendingOwned(userId, id);
    if (!item) return fail("not_found");

    const ownsCategory = await this.inboxItemRepository.categoryBelongsTo(userId, input.categoryId);
    if (!ownsCategory) return fail("category_not_found");

    const listId = await this.listPlacement.privateListFor(userId);
    const transaction = await this.inboxItemRepository.accept({
      item,
      merchantKey: merchantKey(item.merchant ?? item.description),
      transaction: {
        userId,
        description: input.description,
        amount: input.amount,
        type: input.type,
        categoryId: input.categoryId,
        transactionDate: new Date(input.transactionDate),
        reference: item.reference,
        listId,
      },
    });

    if (isExpense(transaction)) this.budgetMonitor.scheduleCheck(userId, transaction.categoryId);

    return { transaction };
  }
}
