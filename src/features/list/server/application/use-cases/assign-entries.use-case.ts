import type { AssignEntriesInput } from "../../../schemas/list-api.schema";
import { fail } from "../../domain/errors/list.errors";
import { canContribute } from "../../domain/policies/list.policy";
import type { AccountCurrency } from "../../domain/ports/list.ports";
import type { ListRepository } from "../../domain/repositories/list.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";

export class AssignEntriesUseCase {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly memberRepository: MemberRepository,
    private readonly accountCurrency: AccountCurrency,
  ) {}

  async execute(userId: string, listId: string, { transactionIds }: AssignEntriesInput) {
    const membership = await this.memberRepository.find(listId, userId);
    if (!membership) return fail("not_found");

    const list = await this.listRepository.findById(listId);
    if (!list) return fail("not_found");

    if (!canContribute(membership.role)) return fail("forbidden");

    if (!list.isPrivate) {
      const userCurrency = await this.accountCurrency.of(userId);
      if (list.currency !== userCurrency) return fail("currency_mismatch");
    }

    const uniqueIds = [...new Set(transactionIds)];
    const ownedCount = await this.listRepository.countOwnedTransactions(userId, uniqueIds);
    const ownsAllTransactions = ownedCount === uniqueIds.length;
    if (!ownsAllTransactions) return fail("transaction_not_found");

    const assigned = await this.listRepository.assign(listId, userId, uniqueIds);
    return { assigned };
  }
}
