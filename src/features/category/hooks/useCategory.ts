"use client";

import useSWR from "swr";
import { CategoryFormValues } from "../schemas/category.schema";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCategory() {
  const { data, error, isLoading, mutate } = useSWR("/api/category", fetcher);

  async function createCategory(payload: CategoryFormValues) {
    const response = await fetch("/api/category", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const category = await response.json();

    // actualiza cache SWR
    mutate();

    return category;
  }

  return {
    categories: data ?? [],
    isLoading,
    error,
    createCategory,
  };
}
