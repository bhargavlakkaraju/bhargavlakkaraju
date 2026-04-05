import { NextRequest, NextResponse } from "next/server";
import { fetchMarkets, parseOutcomePrices } from "@/lib/polymarket/client";
import { detectMarketOpportunities, scoreTradeSetup } from "@/lib/polymarket/strategy";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bankroll = parseFloat(searchParams.get("bankroll") || "68");
    const limit = parseInt(searchParams.get("limit") || "100");

    // Fetch active markets
    const markets = await fetchMarkets({
      limit,
      active: true,
      closed: false,
      order: "volume",
      ascending: false,
    });

    // Parse into format for edge detection
    const parsedMarkets = markets.map((m) => {
      const prices = parseOutcomePrices(m);
      return {
        id: m.id,
        question: m.question,
        yesPrice: prices.yes,
        noPrice: prices.no,
        volume: m.volumeNum || m.volume || 0,
        liquidity: m.liquidityNum || m.liquidity || 0,
        endDate: m.endDate,
        spread: m.spread || Math.abs(prices.yes + prices.no - 1),
      };
    });

    // Run edge detection
    const opportunities = detectMarketOpportunities(parsedMarkets, bankroll);

    // Score and sort
    const scoredOpportunities = opportunities.map((opp) => ({
      ...opp,
      score: scoreTradeSetup(opp),
    }));

    scoredOpportunities.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      opportunities: scoredOpportunities,
      total: scoredOpportunities.length,
      bankroll,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error scanning markets:", error);
    return NextResponse.json(
      { error: "Failed to scan markets" },
      { status: 500 }
    );
  }
}
