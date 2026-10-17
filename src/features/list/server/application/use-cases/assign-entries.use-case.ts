import type { AssignEntriesInput } from "../../../schemas/list-api.schema";
import { fail } from "../../domain/list.errors";
import { canContribute } from "../../domain/list.policy";
import type { AccountCurrency } from "../../domain/list.ports";
import type { ListRepository } from "../../domain/list.repository";
import type { MemberRepository } from "../../domain/member.repository";

export class AssignEntriesUseCase {
  constructor(
    private readonly lists: ListRepository,
    private readonly members: MemberRepository,
    private readonly currency: AccountCurrency,
  ) {}

  async execute(userId: string, listId: string, { transactionIds }: AssignEntriesInput) {
    const membership = await this.members.find(listId, userId);
    const list = membership && (await this.lists.findById(listId));
    if (!membership || !list) return fail("not_found");
    if (!canContribute(membership.role)) return fail("forbidden");
    if (!list.isPrivate && list.currency !== (await this.currency.of(userId))) return fail("currency_mismatch");

    const ids = [...new Set(transactionIds)];
    if ((await this.lists.countOwnedTransactions(userId, ids)) !== ids.length) return fail("transaction_not_found");

    return { assigned: await this.lists.assign(listId, userId, ids) };
  }
}
