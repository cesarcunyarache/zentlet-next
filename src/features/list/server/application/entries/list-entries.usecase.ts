import { decodeCursor, encodeCursor } from "@/features/transaction/lib/feed-query";
import type { ListEntriesQuery } from "../../../schemas/list-api.schema";
import { fail } from "../../domain/list.errors";
import type { ListRepository } from "../../domain/list.repository";
import type { MemberRepository } from "../../domain/member.repository";

export class ListEntriesUseCase {
  constructor(
    private readonly lists: ListRepository,
    private readonly members: MemberRepository,
  ) {}

  async execute(userId: string, listId: string, { cursor, limit }: ListEntriesQuery) {
    if (!(await this.members.find(listId, userId))) return fail("not_found");

    const after = cursor ? decodeCursor(cursor) : null;
    if (cursor && !after) return fail("invalid_cursor");

    const rows = await this.lists.findEntries(listId, after, limit + 1);
    const items = rows.slice(0, limit);
    const nextCursor = rows.length > limit ? encodeCursor(items[items.length - 1]) : null;
    return { items, nextCursor };
  }
}
