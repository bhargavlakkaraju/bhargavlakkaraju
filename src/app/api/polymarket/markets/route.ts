import { NextRequest, NextResponse } from "next/server";
import { fetchMarkets, fetchEvents, parseOutcomePrices } from "@/lib/polymarket/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const category = searchParams.get("category") || undefined;
    const minVolume = parseFloat(searchParams.get("minVolume") || "0");
    const sortBy = searchParams.get("sortBy") || "volume";

    // Fetch markets from Polymarket
    const markets = await fetchMarkets({
      limit: Math.min(limit, 100),
      offset,
      active: true,
      closed: false,
      order: sortBy === "volume" ? "volume" : sortBy === "liquidity" ? "liquidity" : "volume",
      ascending: false,
    });

    // Parse and enrich market data
    const enrichedMarkets = markets
      .map((market) => {
        const prices = parseOutcomePrices(market);
        return {
          id: market.id,
          question: market.question,
          slug: market.slug,
          endDate: market.endDate,
          yesPrice: prices.yes,
          noPrice: prices.no,
          volume: market.volumeNum || market.volume || 0,
          liquidity: market.liquidityNum || market.liquidity || 0,
          active: market.active,
          closed: market.closed,
          spread: Math.abs(prices.yes + prices.no - 1),
          daysToExpiry: Math.max(
            0,
            (new Date(market.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ),
        };
      })
      .filter((m) => m.volume >= minVolume);

    return NextResponse.json({
      markets: enrichedMarkets,
      total: enrichedMarkets.length,
      offset,
      limit,
    });
  } catch (error) {
    console.error("Error fetching markets:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}
