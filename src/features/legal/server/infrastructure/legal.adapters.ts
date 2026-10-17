import prisma from "@/lib/prisma";
import type { SignUpRollback } from "../domain/ports/legal.ports";

export const signUpRollback: SignUpRollback = {
  async undo(userId) {
    await prisma.user.delete({ where: { id: userId } });
  },
};
