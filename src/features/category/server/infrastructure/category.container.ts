import { CreateCategoryUseCase } from "../application/use-cases/create-category.use-case";
import { DeleteCategoryUseCase } from "../application/use-cases/delete-category.use-case";
import { ListCategoriesUseCase } from "../application/use-cases/list-categories.use-case";
import { UpdateCategoryUseCase } from "../application/use-cases/update-category.use-case";
import { PrismaCategoryRepository } from "./persistence/prisma/prisma-category.repository";

const repository = new PrismaCategoryRepository();

export const categoryUseCases = {
  list: new ListCategoriesUseCase(repository),
  create: new CreateCategoryUseCase(repository),
  update: new UpdateCategoryUseCase(repository),
  delete: new DeleteCategoryUseCase(repository),
};
