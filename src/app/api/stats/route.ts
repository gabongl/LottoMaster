import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncLatestLotto } from '@/lib/lottoSync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. 최신 회차 자동 동기화 시도 (실패해도 기존 통계 표시는 유지)
    await syncLatestLotto().catch(err => {
      console.warn('[Stats API] Auto sync error ignored:', err);
    });

    const draws = await prisma.lottoDraw.findMany({
      orderBy: { round: 'desc' }
    });
    
    if (draws.length === 0) {
      return NextResponse.json({ hot: [7, 15, 23, 31, 44], cold: [2, 9, 18, 25, 41] });
    }
    
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 45; i++) counts[i] = 0;
    
    draws.forEach((draw) => {
      counts[draw.num1]++;
      counts[draw.num2]++;
      counts[draw.num3]++;
      counts[draw.num4]++;
      counts[draw.num5]++;
      counts[draw.num6]++;
    });
    
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    const hotNumbers = sorted.slice(0, 5).map(e => parseInt(e[0]));
    const coldNumbers = sorted.slice(-5).map(e => parseInt(e[0]));
    const latestRound = draws[0]?.round || 0;
    
    return NextResponse.json({ 
      hot: hotNumbers, 
      cold: coldNumbers, 
      totalDraws: draws.length,
      latestRound: latestRound
    });
  } catch (error) {
    console.error("Stats Error:", error);
    return NextResponse.json({ hot: [7, 15, 23, 31, 44], cold: [2, 9, 18, 25, 41] });
  }
}
