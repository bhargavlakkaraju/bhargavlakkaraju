import { NextRequest, NextResponse } from "next/server";
import {
  calculateRiskMetrics,
  projectGrowth,
  type PortfolioState,
} from "@/lib/polymarket/strategy";

/**
 * Portfolio API
 * In a production system, this would read from a database.
 * For now, it accepts portfolio state via POST and returns analysis.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bankroll = 68,
      positions = [],
      realizedPnl = 0,
      totalTrades = 0,
      wins = 0,
    } = body;

    const totalInvested = positions.reduce(
      (sum: number, p: any) => sum + p.shares * p.avgPrice,
      0
    );

    const unrealizedPnl = positions.reduce(
      (sum: number, p: any) =>
        sum + p.shares * (p.currentPrice - p.avgPrice),
      0
    );

    const portfolio: PortfolioState = {
      bankroll,
      positions: positions.map((p: any) => ({
        ...p,
        unrealizedPnl: p.shares * (p.currentPrice - p.avgPrice),
        pnlPercent:
          p.avgPrice > 0
            ? ((p.currentPrice - p.avgPrice) / p.avgPrice) * 100
            : 0,
      })),
      totalInvested: Math.round(totalInvested * 100) / 100,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
      realizedPnl,
      winRate: totalTrades > 0 ? wins / totalTrades : 0,
      totalTrades,
    };

    const riskMetrics = calculateRiskMetrics(portfolio);

    // Project growth over 30 days
    const growthProjection = projectGrowth(
      bankroll,
      30,
      3, // 3 trades per day
      0.03, // 3% average edge
      0.55, // 55% win rate
      0.06 // 6% average position size
    );

    return NextResponse.json({
      portfolio,
      riskMetrics,
      growthProjection,
      summary: {
        totalValue: Math.round((bankroll + unrealizedPnl) * 100) / 100,
        availableCash:
          Math.round((bankroll - totalInvested) * 100) / 100,
        totalReturn:
          Math.round(
            ((unrealizedPnl + realizedPnl) / Math.max(bankroll, 1)) *
              10000
          ) / 100,
      },
    });
  } catch (error) {
    console.error("Error processing portfolio:", error);
    return NextResponse.json(
      { error: "Failed to process portfolio" },
      { status: 500 }
    );
  }
}
