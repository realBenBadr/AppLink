import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { code, id } = await request.json();

    if (!code || !id) {
      return NextResponse.json(
        { error: "Code and ID are required" },
        { status: 400 }
      );
    }

    const updatedCode = await prisma.generatedCode.update({
      where: { id },
      data: { code },
    });

    return NextResponse.json({ success: true, data: updatedCode });
  } catch (error) {
    console.error("Error saving code:", error);
    return NextResponse.json(
      { error: "Failed to save code" },
      { status: 500 }
    );
  }
} 