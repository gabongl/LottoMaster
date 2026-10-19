import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTargetLottoRound } from '@/lib/lottoSync';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // 히스토리 조회
    const history = await prisma.lottoHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // 유저의 AI 상태 조회 (없으면 기본 생성)
    let aiState = await prisma.aiState.findUnique({
      where: { userId }
    });

    if (!aiState) {
      aiState = await prisma.aiState.create({
        data: {
          userId,
          version: 1.0,
          sumMin: 100,
          sumMax: 180,
          oddRatio: 3.0,
          highRatio: 3.0,
          consecutiveProb: 0.5,
          learningCount: 0
        }
      });
    }

    return NextResponse.json({ history, aiState });
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

    const body = await req.json();
    const { games, targetRound } = body;

    if (!games || !Array.isArray(games)) {
      return NextResponse.json({ error: "Invalid games format" }, { status: 400 });
    }

    // 대상 회차가 지정되지 않은 경우, 토요일 오후 8시 판매마감 기준 공식 대상 회차 자동 부여
    const roundToTarget = targetRound || getTargetLottoRound();

    const newHistory = await prisma.lottoHistory.create({
      data: {
        userId: (session.user as any).id,
        targetRound: roundToTarget,
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
