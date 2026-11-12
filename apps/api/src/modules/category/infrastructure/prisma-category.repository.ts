import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/infrastructure/prisma.service.js';
import type { Category } from '../domain/category.js';
import { CategoryRepository } from '../domain/category.repository.js';

@Injectable()
export class PrismaCategoryRepository extends CategoryRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(category: Category): Promise<Category> {
    return this.prisma.category.upsert({
      where: { id: category.id },
      create: category,
      update: category,
    });
  }

  async findByUserId(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({ where: { userId } });
  }
}
