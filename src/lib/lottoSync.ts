import { prisma } from './prisma';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  latestRound: number;
  message: string;
}

/**
 * 동행복권 최신 회차 데이터를 확인하고 DB에 동기화하는 함수
 */
export async function syncLatestLotto(): Promise<SyncResult> {
  try {
    // 1. 현재 DB에 저장된 가장 최근 회차를 가져옵니다.
    const lastDraw = await prisma.lottoDraw.aggregate({
      _max: { round: true },
    });

    let currentRound = (lastDraw._max.round || 0) + 1;
    let syncedCount = 0;
    const maxBatchLimit = 50; // 과도한 루프 방지

    while (syncedCount < maxBatchLimit) {
      const url = `https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=${currentRound}&_=${Date.now()}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://dhlottery.co.kr/',
          'Accept': 'application/json, text/javascript, */*; q=0.01'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        console.warn(`[LottoSync] Failed to fetch round ${currentRound}, HTTP ${response.status}`);
        break;
      }

      const json = await response.json();
      const item = json?.data?.list?.[0];

      // 데이터가 없거나 당첨번호가 없는 경우(미추첨 최신 회차) 루프 종료
      if (!item || !item.tm1WnNo || !item.tm6WnNo) {
        break;
      }

      // 2. DB에 안전하게 upsert
      await prisma.lottoDraw.upsert({
        where: { round: currentRound },
        update: {
          num1: item.tm1WnNo,
          num2: item.tm2WnNo,
          num3: item.tm3WnNo,
          num4: item.tm4WnNo,
          num5: item.tm5WnNo,
          num6: item.tm6WnNo,
          bonus: item.bnsWnNo,
        },
        create: {
          round: currentRound,
          num1: item.tm1WnNo,
          num2: item.tm2WnNo,
          num3: item.tm3WnNo,
          num4: item.tm4WnNo,
          num5: item.tm5WnNo,
          num6: item.tm6WnNo,
          bonus: item.bnsWnNo,
        }
      });

      syncedCount++;
      currentRound++;
    }

    const finalLatestRound = currentRound - 1;

    return {
      success: true,
      syncedCount,
      latestRound: finalLatestRound,
      message: syncedCount > 0 
        ? `${syncedCount}개의 최신 회차가 성공적으로 동기화되었습니다. (최신: ${finalLatestRound}회)` 
        : `이미 최신 회차(${finalLatestRound}회)까지 동기화되어 있습니다.`
    };
  } catch (error) {
    console.error('[LottoSync] Error during sync:', error);
    return {
      success: false,
      syncedCount: 0,
      latestRound: 0,
      message: error instanceof Error ? error.message : '동기화 중 오류 발생'
    };
  }
}
