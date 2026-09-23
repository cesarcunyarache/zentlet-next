import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

/** Devuelve la sesión o null; centraliza la lectura de cabeceras. */
async function getSessionUserId(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session?.user.id ?? null;
}

const unauthorized = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

const notFound = () =>
  NextResponse.json({ message: "Category not found" }, { status: 404 });

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const category = await prisma.category.findFirst({ where: { id, userId } });

    if (!category) return notFound();

    return NextResponse.json(category);
  } catch {
    return NextResponse.json(
      { message: "Error fetching category" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const { name, icon, color, description } = await req.json();

    const { count } = await prisma.category.updateMany({
      where: { id, userId },
      data: { name, icon, color, description },
    });

    if (count === 0) return notFound();

    const category = await prisma.category.findUnique({ where: { id } });

    return NextResponse.json(category);
  } catch {
    return NextResponse.json(
      { message: "Error updating category" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const userId = await getSessionUserId(req);
    if (!userId) return unauthorized();

    const { id } = await params;
    const { count } = await prisma.category.deleteMany({
      where: { id, userId },
    });

    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { message: "Error deleting category" },
      { status: 500 },
    );
  }
}
