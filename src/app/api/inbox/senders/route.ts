import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeSenderPattern } from "@/features/inbox/lib/sender";
import { serializeInboxSender } from "@/features/inbox/lib/serialize";
import { addInboxSenderSchema } from "@/features/inbox/schemas/inbox-api.schema";
import {
  errorResponse,
  getSessionUserId,
  internalError,
  parseBody,
  unauthorized,
  writeLimit,
} from "@/lib/api/route-helpers";

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const parsed = await parseBody(req, addInboxSenderSchema);
    if ("error" in parsed) return parsed.error;

    const address = normalizeSenderPattern(parsed.data.address);
    if (!address) return errorResponse("Invalid sender", 422);

    const sender = await prisma.inboxSender.upsert({
      where: { userId_address: { userId, address } },
      create: { userId, address, status: "trusted", origin: "manual" },
      update: { status: "trusted", origin: "manual" },
    });
    return NextResponse.json(serializeInboxSender(sender), { status: 201 });
  } catch (error) {
    return internalError(req, error, "Error adding sender");
  }
}
