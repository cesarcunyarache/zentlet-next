import { APIService } from "@/core/services/api.service";
import type { TCategory, TCategoryPayload } from "../types";

export class CategoryService extends APIService {
  async getCategories(): Promise<TCategory[]> {
    const response = await this.get<TCategory[]>("/api/category");

    return response.data;
  }

  async getCategory(categoryId: string): Promise<TCategory> {
    const response = await this.get<TCategory>(`/api/category/${categoryId}`);

    return response.data;
  }

  async createCategory(
    data: TCategoryPayload & { id: string },
  ): Promise<TCategory> {
    const response = await this.post<TCategory>("/api/category", data);

    return response.data;
  }

  async updateCategory(
    categoryId: string,
    data: Partial<TCategoryPayload>,
  ): Promise<TCategory> {
    const response = await this.patch<TCategory>(
      `/api/category/${categoryId}`,
      data,
    );

    return response.data;
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.delete(`/api/category/${categoryId}`);
  }
}

export const categoryService = new CategoryService();
