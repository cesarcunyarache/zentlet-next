"use client";

import { useParams } from "next/navigation";
import { ListDetailView } from "@/features/list/ui/detail/list-detail-view";

export default function ListPage() {
  const { id } = useParams<{ id: string }>();
  return <ListDetailView listId={id} />;
}
