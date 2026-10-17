import type { CreateListInput } from "../../../schemas/list-api.schema";
import type { ListOverview, TransactionList } from "../../domain/entities/list.entity";
import { fail } from "../../domain/errors/list.errors";
import type { AccountCurrency } from "../../domain/ports/list.ports";
import type { ListRepository } from "../../domain/repositories/list.repository";

function emptyOverview(list: TransactionList): ListOverview {
  return {
    ...list,
    role: "owner",
    memberCount: 1,
    count: 0,
    expenseTotal: 0,
    incomeTotal: 0,
  };
}

export class CreateListUseCase {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly accountCurrency: AccountCurrency,
  ) {}

  async execute(userId: string, input: CreateListInput) {
    const existing = await this.listRepository.findById(input.id);

    if (existing) {
      const belongsToAnotherUser = existing.ownerId !== userId;
      if (belongsToAnotherUser) return fail("id_taken");
      return this.findRetriedCreation(userId, existing);
    }

    const currency = await this.accountCurrency.of(userId);
    const created = await this.listRepository.insert({
      id: input.id,
      name: input.name,
      icon: input.icon,
      color: input.color,
      description: input.description ?? null,
      currency,
      ownerId: userId,
    });
    if (created === "id_taken") return fail("id_taken");

    return { list: emptyOverview(created), created: true };
  }

  private async findRetriedCreation(userId: string, list: TransactionList) {
    const overviews = await this.listRepository.findOverviews(userId);
    const overview = overviews.find((candidate) => candidate.id === list.id);
    return { list: overview ?? emptyOverview(list), created: false };
  }
}
