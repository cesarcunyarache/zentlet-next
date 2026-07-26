import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching categories" },
      { status: 500 },
    );
  }
}
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body = await req.json();

    const { name, icon, description, color } = body;

    const category = await prisma.category.create({
      data: {
        name,
        icon,
        description,
        color,
        userId: session.user.id,
      },
    });

    return NextResponse.json(category, {
      status: 201,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error creating category",
      },
      {
        status: 500,
      },
    );
  }
}
