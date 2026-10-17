import { pickSuccessor } from "../../domain/policies/list.policy";
import type { ListNotifier } from "../../domain/ports/list.ports";
import type { ListRepository } from "../../domain/repositories/list.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";

export class HandOverListsUseCase {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly memberRepository: MemberRepository,
    private readonly listNotifier: ListNotifier,
  ) {}

  async execute(ownerId: string) {
    const ownedListIds = await this.listRepository.findOwnedIds(ownerId);

    for (const listId of ownedListIds) {
      await this.handOverList(ownerId, listId);
    }
  }

  private async handOverList(ownerId: string, listId: string) {
    const list = await this.listRepository.findById(listId);
    if (list?.isPrivate) return;

    const members = await this.memberRepository.findAll(listId);
    const successor = pickSuccessor(members, ownerId);

    if (!successor) {
      await this.listRepository.delete(listId);
      return;
    }

    await this.memberRepository.transferOwnership(listId, ownerId, successor.userId);

    if (!list) return;
    await this.listNotifier.ownershipReceived(successor.userId, { listId, listName: list.name });
  }
}
