import type { CreateListInput } from "../../../schemas/list-api.schema";
import type { ListOverview, TransactionList } from "../../domain/list.entity";
import { fail } from "../../domain/list.errors";
import type { AccountCurrency } from "../../domain/list.ports";
import type { ListRepository } from "../../domain/list.repository";

const freshOverview = (list: TransactionList): ListOverview => ({
  ...list,
  role: "owner",
  memberCount: 1,
  count: 0,
  expenseTotal: 0,
  incomeTotal: 0,
});

export class CreateListUseCase {
  constructor(
    private readonly lists: ListRepository,
    private readonly currency: AccountCurrency,
  ) {}

  async execute(userId: string, input: CreateListInput) {
    const existing = await this.lists.findById(input.id);
    if (existing) return existing.ownerId === userId ? this.alreadyCreated(userId, existing) : fail("id_taken");

    const created = await this.lists.insert({
      id: input.id,
      name: input.name,
      icon: input.icon,
      color: input.color,
      description: input.description ?? null,
      currency: await this.currency.of(userId),
      ownerId: userId,
    });
    if (created === "id_taken") return fail("id_taken");
    return { list: freshOverview(created), created: true };
  }

  private async alreadyCreated(userId: string, list: TransactionList) {
    const overviews = await this.lists.findOverviews(userId);
    return { list: overviews.find((overview) => overview.id === list.id) ?? freshOverview(list), created: false };
  }
}
