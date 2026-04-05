/**
 * Polymarket API Client
 * Fetches market data from Polymarket's public CLOB API and Gamma API
 */

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const CLOB_API_BASE = "https://clob.polymarket.com";

export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  category: string;
  markets: PolymarketMarket[];
  volume: number;
  liquidity: number;
  commentCount: number;
  active: boolean;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  endDate: string;
  description: string;
  outcomes: string[];
  outcomePrices: string[];
  volume: number;
  volumeNum: number;
  liquidity: number;
  liquidityNum: number;
  active: boolean;
  closed: boolean;
  acceptingOrders: boolean;
  clobTokenIds: string[];
  bestBid: number;
  bestAsk: number;
  lastTradePrice: number;
  spread: number;
}

export interface OrderBookEntry {
  price: string;
  size: string;
}

export interface OrderBook {
  market: string;
  asset_id: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: string;
}

export interface MarketTrade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: "BUY" | "SELL";
  size: string;
  price: string;
  timestamp: string;
}

/**
 * Fetch active events from Polymarket Gamma API
 */
export async function fetchEvents(params?: {
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  order?: string;
  ascending?: boolean;
  tag?: string;
}): Promise<PolymarketEvent[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.active !== undefined) searchParams.set("active", params.active.toString());
  if (params?.closed !== undefined) searchParams.set("closed", params.closed.toString());
  if (params?.order) searchParams.set("order", params.order);
  if (params?.ascending !== undefined) searchParams.set("ascending", params.ascending.toString());
  if (params?.tag) searchParams.set("tag", params.tag);

  const res = await fetch(`${GAMMA_API_BASE}/events?${searchParams}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch active markets from Polymarket Gamma API
 */
export async function fetchMarkets(params?: {
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  order?: string;
  ascending?: boolean;
}): Promise<PolymarketMarket[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.active !== undefined) searchParams.set("active", params.active.toString());
  if (params?.closed !== undefined) searchParams.set("closed", params.closed.toString());
  if (params?.order) searchParams.set("order", params.order);
  if (params?.ascending !== undefined) searchParams.set("ascending", params.ascending.toString());

  const res = await fetch(`${GAMMA_API_BASE}/markets?${searchParams}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single market by ID or slug
 */
export async function fetchMarket(idOrSlug: string): Promise<PolymarketMarket> {
  const res = await fetch(`${GAMMA_API_BASE}/markets/${idOrSlug}`, {
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error(`Market not found: ${idOrSlug}`);
  return res.json();
}

/**
 * Fetch order book for a specific token from CLOB API
 */
export async function fetchOrderBook(tokenId: string): Promise<OrderBook> {
  const res = await fetch(`${CLOB_API_BASE}/book?token_id=${tokenId}`, {
    next: { revalidate: 10 },
  });

  if (!res.ok) throw new Error(`CLOB API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch recent trades for a market
 */
export async function fetchTrades(conditionId: string): Promise<MarketTrade[]> {
  const res = await fetch(
    `${CLOB_API_BASE}/trades?market=${conditionId}&limit=50`,
    { next: { revalidate: 15 } }
  );

  if (!res.ok) throw new Error(`CLOB API error: ${res.status}`);
  return res.json();
}

/**
 * Parse outcome prices from market data
 */
export function parseOutcomePrices(market: PolymarketMarket): { yes: number; no: number } {
  const prices = market.outcomePrices
    ? (typeof market.outcomePrices === "string"
        ? JSON.parse(market.outcomePrices)
        : market.outcomePrices)
    : [0, 0];

  return {
    yes: parseFloat(prices[0]) || 0,
    no: parseFloat(prices[1]) || 0,
  };
}

/**
 * Calculate spread from order book
 */
export function calculateSpread(orderBook: OrderBook): {
  bidPrice: number;
  askPrice: number;
  spread: number;
  spreadPct: number;
  depth: { bidDepth: number; askDepth: number };
} {
  const bestBid = orderBook.bids.length > 0 ? parseFloat(orderBook.bids[0].price) : 0;
  const bestAsk = orderBook.asks.length > 0 ? parseFloat(orderBook.asks[0].price) : 0;
  const spread = bestAsk - bestBid;
  const midPrice = (bestAsk + bestBid) / 2;
  const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0;

  const bidDepth = orderBook.bids.reduce(
    (sum, b) => sum + parseFloat(b.size) * parseFloat(b.price),
    0
  );
  const askDepth = orderBook.asks.reduce(
    (sum, a) => sum + parseFloat(a.size) * parseFloat(a.price),
    0
  );

  return { bidPrice: bestBid, askPrice: bestAsk, spread, spreadPct, depth: { bidDepth, askDepth } };
}
