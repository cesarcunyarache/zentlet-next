import prisma from "@/lib/prisma";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db-errors";
import type { Category as CategoryRow } from "@/generated/prisma/client";
import type { CategoryChanges, NewCategory } from "../../../domain/entities/category.entity";
import type { CategoryRepository } from "../../../domain/repositories/category.repository";
import { toDomain, toPersistence, toPersistenceChanges } from "./category.mapper";

const toDomainOrNull = (row: CategoryRow | null) => (row ? toDomain(row) : null);

export class PrismaCategoryRepository implements CategoryRepository {
  async findAll(userId: string) {
    const rows = await prisma.category.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return rows.map(toDomain);
  }

  async findById(id: string) {
    return toDomainOrNull(await prisma.category.findUnique({ where: { id } }));
  }

  async findOwned(userId: string, id: string) {
    return toDomainOrNull(await prisma.category.findFirst({ where: { id, userId } }));
  }

  countOwned(userId: string) {
    return prisma.category.count({ where: { userId } });
  }

  async insert(category: NewCategory) {
    try {
      return toDomain(await prisma.category.create({ data: toPersistence(category) }));
    } catch (error) {
      if (isUniqueViolation(error)) return "id_taken" as const;
      throw error;
    }
  }

  async updateOwned(userId: string, id: string, changes: CategoryChanges) {
    const { count } = await prisma.category.updateMany({ where: { id, userId }, data: toPersistenceChanges(changes) });
    if (count === 0) return "not_found" as const;
    return toDomainOrNull(await prisma.category.findUnique({ where: { id } })) ?? ("not_found" as const);
  }

  async deleteOwned(userId: string, id: string) {
    try {
      const { count } = await prisma.category.deleteMany({ where: { id, userId } });
      return count > 0;
    } catch (error) {
      if (isForeignKeyViolation(error)) return "has_transactions" as const;
      throw error;
    }
  }
}
