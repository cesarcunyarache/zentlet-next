import { decodeCursor, encodeCursor } from "@/features/transaction/lib/feed-query";
import type { ListEntriesQuery } from "../../../schemas/list-api.schema";
import type { EntryCursor } from "../../domain/entities/list.entity";
import { fail } from "../../domain/errors/list.errors";
import type { ListRepository } from "../../domain/repositories/list.repository";
import type { MemberRepository } from "../../domain/repositories/member.repository";

export class ListEntriesUseCase {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly memberRepository: MemberRepository,
  ) {}

  async execute(userId: string, listId: string, { cursor, limit }: ListEntriesQuery) {
    const membership = await this.memberRepository.find(listId, userId);
    if (!membership) return fail("not_found");

    let after: EntryCursor | null = null;
    if (cursor) {
      after = decodeCursor(cursor);
      if (!after) return fail("invalid_cursor");
    }

    const rows = await this.listRepository.findEntries(listId, after, limit + 1);
    const hasNextPage = rows.length > limit;
    const items = rows.slice(0, limit);
    const nextCursor = hasNextPage ? encodeCursor(items[items.length - 1]) : null;

    return { items, nextCursor };
  }
}
