import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const draws = await prisma.lottoDraw.findMany({
      orderBy: { round: 'desc' }
    });
    
    if (draws.length === 0) {
      return NextResponse.json({ hot: [7, 15, 23, 31, 44], cold: [2, 9, 18, 25, 41] });
    }
    
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 45; i++) counts[i] = 0;
    
    draws.forEach((draw: any) => {
      counts[draw.num1]++;
      counts[draw.num2]++;
      counts[draw.num3]++;
      counts[draw.num4]++;
      counts[draw.num5]++;
      counts[draw.num6]++;
      // Optionally include bonus number, usually not included in standard frequency for main 6, but let's include for completeness or not.
      // counts[draw.bonus]++;
    });
    
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    
    const hotNumbers = sorted.slice(0, 5).map(e => parseInt(e[0]));
    const coldNumbers = sorted.slice(-5).map(e => parseInt(e[0]));
    
    return NextResponse.json({ 
      hot: hotNumbers, 
      cold: coldNumbers, 
      totalDraws: draws.length
    });
  } catch (error) {
    console.error("Stats Error:", error);
    return NextResponse.json({ hot: [7, 15, 23, 31, 44], cold: [2, 9, 18, 25, 41] });
  }
}
