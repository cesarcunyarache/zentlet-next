import type { ListRepository } from "../../domain/repositories/list.repository";

export class ListListsUseCase {
  constructor(private readonly listRepository: ListRepository) {}

  async execute(userId: string) {
    await this.listRepository.ensurePrivate(userId);

    const lists = await this.listRepository.findOverviews(userId);
    return { lists };
  }
}
