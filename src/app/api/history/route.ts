import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const history = await prisma.lottoHistory.findMany({
      where: { userId: (session.user as any).id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("History GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { games } = await req.json();
    if (!games || !Array.isArray(games)) {
      return NextResponse.json({ error: "Invalid games format" }, { status: 400 });
    }

    const newHistory = await prisma.lottoHistory.create({
      data: {
        userId: (session.user as any).id,
        games: games,
        analyzed: false
      }
    });

    return NextResponse.json({ success: true, history: newHistory });
  } catch (error) {
    console.error("History POST Error:", error);
    return NextResponse.json({ error: "Failed to save history" }, { status: 500 });
  }
}
