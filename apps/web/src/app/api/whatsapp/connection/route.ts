import { NextResponse } from "next/server";
import { whatsappUseCases } from "@/features/whatsapp/server/infrastructure/whatsapp.container";
import { WHATSAPP_ERRORS } from "@/features/whatsapp/server/infrastructure/http/whatsapp.http-errors";
import { errorFrom, getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();
    return NextResponse.json(await whatsappUseCases.connection.execute(userId));
  } catch (error) {
    return internalError(req, error, "Error fetching WhatsApp connection");
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const result = await whatsappUseCases.createLinkCode.execute(userId);
    if ("error" in result) return errorFrom(WHATSAPP_ERRORS, result.error);
    return NextResponse.json(result.linkCode, { status: 201 });
  } catch (error) {
    return internalError(req, error, "Error creating WhatsApp link code");
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const result = await whatsappUseCases.unlink.execute(userId);
    if ("error" in result) return errorFrom(WHATSAPP_ERRORS, result.error);
    return NextResponse.json(await whatsappUseCases.connection.execute(userId));
  } catch (error) {
    return internalError(req, error, "Error unlinking WhatsApp");
  }
}
