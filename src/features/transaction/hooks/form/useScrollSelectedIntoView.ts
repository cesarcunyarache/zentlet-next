"use client";

import { useEffect, useRef } from "react";

export function useScrollSelectedIntoView(selectedId: string) {
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    chipRefs.current.get(selectedId)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [selectedId]);

  return function registerChip(categoryId: string) {
    return (node: HTMLButtonElement | null) => {
      if (node) chipRefs.current.set(categoryId, node);
      else chipRefs.current.delete(categoryId);
    };
  };
}
