import { APIService } from "@/core/services/api.service";
import { TCategory } from "../types";

export class CategoryService extends APIService {
  constructor() {
    super("");
  }

  async createCategory(data: Partial<TCategory>): Promise<TCategory> {
    return this.post(`/api/category`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async getCategories(): Promise<TCategory[]> {
    return this.get(`/api/categories`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getCategory(categoryId: string): Promise<TCategory> {
    return this.get(`/api/category/${categoryId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async updateCategory(
    categoryId: string,
    data: Partial<TCategory>,
  ): Promise<TCategory> {
    return this.patch(`/api/category/${categoryId}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async deleteCategory(categoryId: string): Promise<void> {
    return this.delete(`/api/category/${categoryId}/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}
