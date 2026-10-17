import { fail } from "../../domain/errors/list.errors";
import { canRemoveEntry } from "../../domain/policies/list.policy";
import type { ListRepository } from "../../domain/repositories/list.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";

export class RemoveEntryUseCase {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly memberRepository: MemberRepository,
  ) {}

  async execute(userId: string, listId: string, transactionId: string) {
    const membership = await this.memberRepository.find(listId, userId);
    if (!membership) return fail("not_found");

    const authorId = await this.listRepository.findEntryAuthor(listId, transactionId);
    if (!authorId) return fail("transaction_not_found");

    const isAuthor = authorId === userId;
    if (!canRemoveEntry(membership.role, isAuthor)) return fail("forbidden");

    const list = await this.listRepository.findById(listId);
    if (list?.isPrivate) return fail("forbidden");

    await this.listRepository.unassign(listId, transactionId);
    return { ok: true as const };
  }
}
