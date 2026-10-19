import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncLatestLotto, getTargetLottoRound } from '@/lib/lottoSync';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // 1. 최신 당첨 번호 동기화 먼저 수행
    await syncLatestLotto().catch(err => {
      console.warn('[History Check] Sync warning:', err);
    });

    // 2. 미분석 히스토리 목록 조회
    const unanalyzedList = await prisma.lottoHistory.findMany({
      where: {
        userId,
        analyzed: false
      },
      orderBy: { createdAt: 'asc' }
    });

    if (unanalyzedList.length === 0) {
      return NextResponse.json({
        success: true,
        analyzedCount: 0,
        message: "분석할 새로운 번호 보관함이 없습니다. (모두 이미 분석되었거나 보관함이 비어있습니다.)"
      });
    }

    let analyzedCount = 0;
    const pendingRounds: number[] = [];
    let latestAiState = null;

    // 3. 유저의 현재 AI 상태 가져오기 (없으면 기본값 생성)
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

    // 4. 각 미분석 레코드 분석 루프
    for (const record of unanalyzedList) {
      let targetRound = record.targetRound;

      // 만약 targetRound가 기록되지 않은 기존 데이터라면, 생성일시 기준 토요일 20시 마감 회차 자동 계산
      if (!targetRound) {
        targetRound = getTargetLottoRound(new Date(record.createdAt));
      }

      // DB에서 해당 회차의 실제 당첨 번호 조회
      const draw = await prisma.lottoDraw.findUnique({
        where: { round: targetRound }
      });

      // 아직 추첨 전이라 DB에 없는 경우
      if (!draw) {
        if (!pendingRounds.includes(targetRound)) {
          pendingRounds.push(targetRound);
        }
        continue;
      }

      // 실제 당첨 번호
      const winNums = [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5, draw.num6];
      const bonus = draw.bonus;
      const games = record.games as number[][];

      // 각 게임별 적중 결과 판정 (1등 ~ 5등 및 2등 보너스 완벽 판정)
      const results = games.map(game => {
        const hitCount = game.filter(n => winNums.includes(n)).length;
        const hasBonus = game.includes(bonus);

        if (hitCount === 6) return '1등 당첨!! 🎉 (6개 일치)';
        if (hitCount === 5 && hasBonus) return '2등 당첨!! ✨ (5개+보너스 일치)';
        if (hitCount === 5) return '3등 당첨! 👏 (5개 일치)';
        if (hitCount === 4) return '4등 당첨 🎯 (4개 일치 - 5만원)';
        if (hitCount === 3) return '5등 당첨 👍 (3개 일치 - 5천원)';
        return '낙첨';
      });

      // DB에 분석 결과 영구 저장
      await prisma.lottoHistory.update({
        where: { id: record.id },
        data: {
          targetRound,
          analyzed: true,
          results
        }
      });

      // 5. 실제 당첨 번호 특성을 바탕으로 AI 자가 학습(Self-Learning) 수행
      const winSum = winNums.reduce((a, b) => a + b, 0);
      const targetMin = Math.max(21, winSum - 30);
      const targetMax = Math.min(255, winSum + 30);

      const realOddCount = winNums.filter(n => n % 2 !== 0).length;
      const realHighCount = winNums.filter(n => n >= 23).length;
      let hasConsecutive = false;
      const sortedWinNums = [...winNums].sort((a, b) => a - b);
      for (let i = 0; i < sortedWinNums.length - 1; i++) {
        if (sortedWinNums[i + 1] - sortedWinNums[i] === 1) {
          hasConsecutive = true;
          break;
        }
      }

      // 가중치 보정 (Learning Rate: 0.3)
      aiState.sumMin = Math.round(aiState.sumMin * 0.7 + targetMin * 0.3);
      aiState.sumMax = Math.round(aiState.sumMax * 0.7 + targetMax * 0.3);
      aiState.oddRatio = parseFloat((aiState.oddRatio * 0.7 + realOddCount * 0.3).toFixed(2));
      aiState.highRatio = parseFloat((aiState.highRatio * 0.7 + realHighCount * 0.3).toFixed(2));
      aiState.consecutiveProb = parseFloat((aiState.consecutiveProb * 0.7 + (hasConsecutive ? 1 : 0) * 0.3).toFixed(2));
      aiState.learningCount += 1;
      aiState.version = parseFloat((aiState.version + 0.1).toFixed(1));

      analyzedCount++;
    }

    // AI 상태가 갱신되었다면 DB에 저장
    if (analyzedCount > 0) {
      latestAiState = await prisma.aiState.update({
        where: { userId },
        data: {
          version: aiState.version,
          sumMin: aiState.sumMin,
          sumMax: aiState.sumMax,
          oddRatio: aiState.oddRatio,
          highRatio: aiState.highRatio,
          consecutiveProb: aiState.consecutiveProb,
          learningCount: aiState.learningCount
        }
      });
    } else {
      latestAiState = aiState;
    }

    // 최신 히스토리 재조회
    const updatedHistory = await prisma.lottoHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    let message = "";
    if (analyzedCount > 0) {
      message = `총 ${analyzedCount}건의 보관함에 대해 실제 당첨 결과 확인 및 AI 자가학습이 완료되었습니다!`;
      if (pendingRounds.length > 0) {
        message += ` (아직 추첨 전인 회차: ${pendingRounds.join(', ')}회)`;
      }
    } else {
      message = `보관된 번호 중 아직 추첨일이 도래하지 않은 번호입니다. (대기 회차: ${pendingRounds.join(', ')}회 - 매주 토요일 20:45 발표)`;
    }

    return NextResponse.json({
      success: true,
      analyzedCount,
      pendingRounds,
      history: updatedHistory,
      aiState: latestAiState,
      message
    });

  } catch (error) {
    console.error("History Check Error:", error);
    return NextResponse.json({ error: "Failed to check winnings" }, { status: 500 });
  }
}
