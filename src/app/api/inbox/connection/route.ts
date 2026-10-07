import { NextResponse } from "next/server";
import { createConnection, getConnection, inboundDomain } from "@/features/inbox/server/connection";
import { errorResponse, getSessionUserId, internalError, unauthorized, writeLimit } from "@/lib/api/route-helpers";

export async function GET(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    return NextResponse.json(await getConnection(userId));
  } catch (error) {
    return internalError(req, error, "Error fetching email connection");
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const limited = await writeLimit(userId);
    if (limited) return limited;

    const domain = inboundDomain();
    if (!domain) return errorResponse("Email import is not configured", 503);

    await createConnection(userId, domain);
    return NextResponse.json(await getConnection(userId), { status: 201 });
  } catch (error) {
    return internalError(req, error, "Error creating email connection");
  }
}
