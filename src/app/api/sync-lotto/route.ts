import { NextResponse } from 'next/server';
import { syncLatestLotto } from '@/lib/lottoSync';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await syncLatestLotto();
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.message }, { status: 500 });
  }
  return NextResponse.json({
    success: true,
    message: result.message,
    syncedCount: result.syncedCount,
    latestRound: result.latestRound
  });
}
