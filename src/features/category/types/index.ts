import { User } from "@/generated/prisma/client";

export interface TCategory {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;

  userId: string;
  user?: User | null;

  created_at?: Date;
  updated_at?: Date;
}
