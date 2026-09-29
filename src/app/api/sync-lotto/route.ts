import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. DB에서 가장 최근에 저장된 회차(Max Round)를 가져옵니다.
    const lastDraw = await prisma.lottoDraw.aggregate({
      _max: { round: true },
    });
    
    let currentRound = (lastDraw._max.round || 0) + 1;
    let syncedCount = 0;
    
    // 2. 동행복권 API 루프 시작 (새로운 회차가 없을 때까지 반복)
    while (true) {
      // 동행복권 공식 오픈 API (회차별 당첨번호 조회)
      const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${currentRound}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // "returnValue"가 "fail"이면 아직 추첨되지 않은 미래의 회차를 의미합니다.
      if (data.returnValue === 'fail') {
        break; 
      }
      
      // 3. 정상적인 당첨 데이터가 있다면 오라클 DB에 저장합니다.
      await prisma.lottoDraw.create({
        data: {
          round: currentRound,
          num1: data.drwtNo1,
          num2: data.drwtNo2,
          num3: data.drwtNo3,
          num4: data.drwtNo4,
          num5: data.drwtNo5,
          num6: data.drwtNo6,
          bonus: data.bnusNo,
        }
      });
      
      syncedCount++;
      currentRound++;
      
      // 안전을 위해 1회 실행 시 최대 10번까지만 동기화하도록 제한 (API 과부하 방지)
      if (syncedCount >= 10) break;
    }
    
    return NextResponse.json({ success: true, message: `${syncedCount}개의 최신 회차가 동기화되었습니다.`, latestRound: currentRound - 1 });
  } catch (error) {
    console.error("Lotto Sync Error:", error);
    return NextResponse.json({ success: false, error: '서버 동기화 오류' }, { status: 500 });
  }
}
