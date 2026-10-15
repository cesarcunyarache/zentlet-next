import type { ListRepository } from "../../domain/list.repository";

export class ListListsUseCase {
  constructor(private readonly lists: ListRepository) {}

  async execute(userId: string) {
    return { lists: await this.lists.findOverviews(userId) };
  }
}
