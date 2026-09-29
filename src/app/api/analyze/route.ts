import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const draws = await prisma.lottoDraw.findMany({
      orderBy: { round: 'desc' }
    });
    
    if (draws.length === 0) {
      return NextResponse.json({ error: "No data available in DB" }, { status: 404 });
    }
    
    // Simulate complex DB heavy processing (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const counts: Record<number, number> = {};
    const lastSeen: Record<number, number> = {};
    const weights: Record<number, number> = {};
    
    for (let i = 1; i <= 45; i++) {
      counts[i] = 0;
      lastSeen[i] = -1; // -1 means never seen
      weights[i] = 1.0; // base weight
    }
    
    const totalDraws = draws.length;
    
    // Calculate frequency and last seen (낙수)
    draws.forEach((draw: any, index: number) => {
      const nums = [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5, draw.num6];
      nums.forEach(num => {
        counts[num]++;
        // Since draws are ordered descending (latest first), the first time we see a number is its most recent appearance.
        if (lastSeen[num] === -1) {
          lastSeen[num] = index; // index is effectively the "낙수" (0 = in the latest draw, 1 = 1 draw ago, etc.)
        }
      });
    });
    
    // Calculate final precise weights
    // Rules:
    // 1. Mean Reversion (낙수): If a number hasn't appeared in over 10 draws, highly boost its weight.
    // 2. Frequency: Give a slight boost to historically hot numbers, but stronger boost to overdue numbers.
    for (let i = 1; i <= 45; i++) {
      const overdue = lastSeen[i];
      let overdueBonus = 0;
      
      if (overdue > 15) overdueBonus = 3.0;
      else if (overdue > 10) overdueBonus = 2.0;
      else if (overdue > 5) overdueBonus = 1.2;
      else overdueBonus = 0.8; // recently appeared numbers have slightly lower chance (Mean Reversion)
      
      const frequencyBonus = counts[i] / totalDraws; // raw percentage (usually around 13-14%)
      
      // Final precision weight formula
      weights[i] = (1.0 + overdueBonus) * (1.0 + frequencyBonus * 10);
    }
    
    // Normalize weights to percentages for visualization
    const maxWeight = Math.max(...Object.values(weights));
    for (let i = 1; i <= 45; i++) {
      weights[i] = parseFloat(((weights[i] / maxWeight) * 100).toFixed(2));
    }
    
    return NextResponse.json({ 
      success: true,
      totalDrawsAnalyzed: totalDraws,
      weights: weights,
      overdueStats: lastSeen,
      frequencyStats: counts,
      message: "Deep Analysis Completed Successfully."
    });
    
  } catch (error) {
    console.error("Deep Analyze Error:", error);
    return NextResponse.json({ error: "Failed to perform deep analysis" }, { status: 500 });
  }
}
