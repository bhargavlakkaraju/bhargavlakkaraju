/**
 * Polymarket Trading Strategy Engine
 *
 * Implements key strategies for prediction market trading:
 * - Kelly Criterion position sizing
 * - Edge detection (mispriced markets)
 * - Risk management
 * - Portfolio optimization
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface TradeSetup {
  marketId: string;
  question: string;
  side: "YES" | "NO";
  currentPrice: number;
  estimatedProbability: number;
  edge: number;
  kellyFraction: number;
  recommendedSize: number;
  expectedValue: number;
  maxLoss: number;
  riskRewardRatio: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  strategy: string;
  reasoning: string;
}

export interface PortfolioState {
  bankroll: number;
  positions: Position[];
  totalInvested: number;
  unrealizedPnl: number;
  realizedPnl: number;
  winRate: number;
  totalTrades: number;
}

export interface Position {
  marketId: string;
  question: string;
  side: "YES" | "NO";
  shares: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  pnlPercent: number;
}

export interface RiskMetrics {
  maxPositionSize: number;
  maxPortfolioExposure: number;
  currentExposure: number;
  exposurePercent: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  diversificationScore: number;
  recommendations: string[];
}

// ─── Kelly Criterion ────────────────────────────────────────────────

/**
 * Full Kelly Criterion: f* = (bp - q) / b
 * where b = odds, p = probability of winning, q = 1-p
 *
 * We use fractional Kelly (typically 0.25-0.5x) to reduce variance.
 */
export function kellyFraction(
  estimatedProbability: number,
  marketPrice: number,
  kellyMultiplier: number = 0.25
): number {
  // In binary prediction markets:
  // If buying YES at price `marketPrice`, payout is $1 if correct
  // b = (1 - marketPrice) / marketPrice (net odds)
  // p = estimatedProbability
  // q = 1 - p
  const b = (1 - marketPrice) / marketPrice;
  const p = estimatedProbability;
  const q = 1 - p;

  const fullKelly = (b * p - q) / b;

  // Never bet more than fractional Kelly, never bet negative
  return Math.max(0, Math.min(fullKelly * kellyMultiplier, 0.15));
}

/**
 * Calculate recommended position size in dollars
 */
export function calculatePositionSize(
  bankroll: number,
  estimatedProbability: number,
  marketPrice: number,
  kellyMultiplier: number = 0.25,
  maxPositionPct: number = 0.10
): { size: number; fraction: number; shares: number } {
  const fraction = kellyFraction(estimatedProbability, marketPrice, kellyMultiplier);
  const kellySize = bankroll * fraction;
  const maxSize = bankroll * maxPositionPct;
  const size = Math.min(kellySize, maxSize);
  const shares = size / marketPrice;

  return {
    size: Math.round(size * 100) / 100,
    fraction: Math.round(fraction * 10000) / 10000,
    shares: Math.round(shares * 100) / 100,
  };
}

// ─── Edge Detection ─────────────────────────────────────────────────

/**
 * Calculate the expected value of a trade
 */
export function expectedValue(
  estimatedProbability: number,
  marketPrice: number,
  side: "YES" | "NO"
): number {
  if (side === "YES") {
    // Buy YES: pay marketPrice, receive $1 if correct
    return estimatedProbability * (1 - marketPrice) - (1 - estimatedProbability) * marketPrice;
  } else {
    // Buy NO: pay (1-marketPrice), receive $1 if correct
    const noPrice = 1 - marketPrice;
    const noProbability = 1 - estimatedProbability;
    return noProbability * (1 - noPrice) - estimatedProbability * noPrice;
  }
}

/**
 * Detect if a market has edge based on spread, volume, and price extremes
 */
export function detectMarketOpportunities(
  markets: Array<{
    id: string;
    question: string;
    yesPrice: number;
    noPrice: number;
    volume: number;
    liquidity: number;
    endDate: string;
    spread?: number;
  }>,
  bankroll: number
): TradeSetup[] {
  const setups: TradeSetup[] = [];

  for (const market of markets) {
    // Skip illiquid markets
    if (market.volume < 1000 || market.liquidity < 500) continue;

    // Skip markets expiring very soon (< 1 day) or too far out (> 90 days)
    const daysToExpiry = (new Date(market.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysToExpiry < 1 || daysToExpiry > 90) continue;

    // Strategy 1: Extreme prices (near 0 or 1) often have edge
    if (market.yesPrice >= 0.90 && market.yesPrice <= 0.97) {
      const edge = analyzeHighProbabilityMarket(market.yesPrice, market.volume, daysToExpiry);
      if (edge) {
        const position = calculatePositionSize(bankroll, edge.estimatedProb, market.yesPrice);
        if (position.size > 0.5) {
          setups.push({
            marketId: market.id,
            question: market.question,
            side: "YES",
            currentPrice: market.yesPrice,
            estimatedProbability: edge.estimatedProb,
            edge: edge.estimatedProb - market.yesPrice,
            kellyFraction: position.fraction,
            recommendedSize: position.size,
            expectedValue: expectedValue(edge.estimatedProb, market.yesPrice, "YES"),
            maxLoss: position.size,
            riskRewardRatio: (1 - market.yesPrice) / market.yesPrice,
            confidence: edge.confidence,
            strategy: "High Probability Lean",
            reasoning: edge.reasoning,
          });
        }
      }
    }

    // Strategy 2: Cheap longshots (YES price 0.03-0.15) with decent volume
    if (market.yesPrice >= 0.03 && market.yesPrice <= 0.15 && market.volume >= 5000) {
      const position = calculatePositionSize(bankroll, market.yesPrice * 1.5, market.yesPrice, 0.15, 0.05);
      if (position.size > 0.5) {
        setups.push({
          marketId: market.id,
          question: market.question,
          side: "YES",
          currentPrice: market.yesPrice,
          estimatedProbability: market.yesPrice * 1.5,
          edge: market.yesPrice * 0.5,
          kellyFraction: position.fraction,
          recommendedSize: position.size,
          expectedValue: expectedValue(market.yesPrice * 1.5, market.yesPrice, "YES"),
          maxLoss: position.size,
          riskRewardRatio: (1 - market.yesPrice) / market.yesPrice,
          confidence: "LOW",
          strategy: "Longshot Value",
          reasoning: `Low-priced contract at ${(market.yesPrice * 100).toFixed(0)}c with ${market.volume.toLocaleString()} volume. High reward-to-risk ratio of ${((1 - market.yesPrice) / market.yesPrice).toFixed(1)}:1. Small position size recommended.`,
        });
      }
    }

    // Strategy 3: Wide spread markets (market making opportunity)
    if (market.spread && market.spread > 0.04 && market.liquidity >= 1000) {
      setups.push({
        marketId: market.id,
        question: market.question,
        side: market.yesPrice < 0.5 ? "YES" : "NO",
        currentPrice: market.yesPrice,
        estimatedProbability: market.yesPrice,
        edge: market.spread / 2,
        kellyFraction: 0,
        recommendedSize: Math.min(bankroll * 0.05, market.liquidity * 0.01),
        expectedValue: market.spread / 2,
        maxLoss: Math.min(bankroll * 0.05, market.liquidity * 0.01),
        riskRewardRatio: 1,
        confidence: "MEDIUM",
        strategy: "Spread Capture",
        reasoning: `Wide spread of ${(market.spread * 100).toFixed(1)}c. Place limit orders to capture spread. Lower risk but requires active management.`,
      });
    }

    // Strategy 4: Mean reversion on 50/50 markets with high volume
    if (market.yesPrice >= 0.40 && market.yesPrice <= 0.60 && market.volume >= 50000) {
      const position = calculatePositionSize(bankroll, 0.50, market.yesPrice, 0.20, 0.08);
      if (Math.abs(market.yesPrice - 0.50) > 0.03 && position.size > 0.5) {
        const side: "YES" | "NO" = market.yesPrice < 0.47 ? "YES" : "NO";
        const price = side === "YES" ? market.yesPrice : 1 - market.yesPrice;
        setups.push({
          marketId: market.id,
          question: market.question,
          side,
          currentPrice: price,
          estimatedProbability: 0.50,
          edge: 0.50 - price,
          kellyFraction: position.fraction,
          recommendedSize: position.size,
          expectedValue: expectedValue(0.50, price, side),
          maxLoss: position.size,
          riskRewardRatio: (1 - price) / price,
          confidence: "MEDIUM",
          strategy: "Mean Reversion",
          reasoning: `High-volume market at ${(market.yesPrice * 100).toFixed(0)}c. Mean reversion play toward 50c on a coin-flip market. Position sized conservatively.`,
        });
      }
    }
  }

  // Sort by expected value descending
  return setups.sort((a, b) => b.expectedValue - a.expectedValue);
}

function analyzeHighProbabilityMarket(
  yesPrice: number,
  volume: number,
  daysToExpiry: number
): { estimatedProb: number; confidence: "LOW" | "MEDIUM" | "HIGH"; reasoning: string } | null {
  // High-probability markets near resolution often offer small but reliable edge
  // The closer to expiry with maintained high price = more reliable
  let confidence: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let estimatedProb = yesPrice;
  let reasoning = "";

  if (daysToExpiry <= 7 && yesPrice >= 0.93 && volume >= 10000) {
    estimatedProb = Math.min(yesPrice + 0.02, 0.99);
    confidence = "HIGH";
    reasoning = `Near-expiry market (${daysToExpiry.toFixed(0)}d) with strong YES at ${(yesPrice * 100).toFixed(0)}c and high volume. Small edge likely as market resolves.`;
  } else if (daysToExpiry <= 30 && yesPrice >= 0.90 && volume >= 5000) {
    estimatedProb = yesPrice + 0.015;
    confidence = "MEDIUM";
    reasoning = `Mid-term market with YES at ${(yesPrice * 100).toFixed(0)}c. Moderate edge if fundamentals support the high probability.`;
  } else {
    return null;
  }

  return { estimatedProb, confidence, reasoning };
}

// ─── Risk Management ────────────────────────────────────────────────

/**
 * Calculate portfolio risk metrics
 */
export function calculateRiskMetrics(
  portfolio: PortfolioState,
  maxExposurePct: number = 0.50
): RiskMetrics {
  const maxPortfolioExposure = portfolio.bankroll * maxExposurePct;
  const currentExposure = portfolio.totalInvested;
  const exposurePercent = portfolio.bankroll > 0 ? currentExposure / portfolio.bankroll : 0;

  let riskLevel: RiskMetrics["riskLevel"] = "LOW";
  if (exposurePercent > 0.7) riskLevel = "CRITICAL";
  else if (exposurePercent > 0.5) riskLevel = "HIGH";
  else if (exposurePercent > 0.3) riskLevel = "MODERATE";

  // Diversification: measure concentration across positions
  const positionWeights = portfolio.positions.map(
    (p) => (p.shares * p.avgPrice) / Math.max(currentExposure, 1)
  );
  const herfindahl = positionWeights.reduce((sum, w) => sum + w * w, 0);
  const diversificationScore =
    portfolio.positions.length > 0
      ? Math.round((1 - herfindahl) * 100)
      : 0;

  const recommendations: string[] = [];

  if (riskLevel === "CRITICAL") {
    recommendations.push("REDUCE positions immediately. You are over-exposed.");
  }
  if (riskLevel === "HIGH") {
    recommendations.push("Consider taking profits on winning positions.");
  }
  if (diversificationScore < 30 && portfolio.positions.length > 0) {
    recommendations.push("Portfolio is too concentrated. Spread across more markets.");
  }
  if (portfolio.positions.length > 0 && portfolio.positions.length < 3) {
    recommendations.push("Add more positions (5-10 ideal) to reduce single-market risk.");
  }
  if (portfolio.bankroll < 20) {
    recommendations.push("Bankroll is critically low. Only take highest-confidence setups.");
  }
  if (portfolio.winRate < 0.45 && portfolio.totalTrades >= 10) {
    recommendations.push("Win rate below 45%. Review strategy and reduce position sizes.");
  }

  return {
    maxPositionSize: Math.round(portfolio.bankroll * 0.10 * 100) / 100,
    maxPortfolioExposure: Math.round(maxPortfolioExposure * 100) / 100,
    currentExposure: Math.round(currentExposure * 100) / 100,
    exposurePercent: Math.round(exposurePercent * 100),
    riskLevel,
    diversificationScore,
    recommendations,
  };
}

// ─── Strategy Scoring ───────────────────────────────────────────────

/**
 * Score a potential trade from 0-100
 */
export function scoreTradeSetup(setup: TradeSetup): number {
  let score = 0;

  // Edge component (0-40 points)
  const edgePct = setup.edge * 100;
  score += Math.min(edgePct * 8, 40);

  // Expected value component (0-25 points)
  const ev = setup.expectedValue * 100;
  score += Math.min(ev * 5, 25);

  // Risk-reward component (0-20 points)
  score += Math.min(setup.riskRewardRatio * 4, 20);

  // Confidence component (0-15 points)
  if (setup.confidence === "HIGH") score += 15;
  else if (setup.confidence === "MEDIUM") score += 8;
  else score += 3;

  return Math.round(Math.min(score, 100));
}

// ─── Growth Projections ─────────────────────────────────────────────

/**
 * Project portfolio growth under different scenarios
 */
export function projectGrowth(
  startingBankroll: number,
  days: number,
  tradesPerDay: number,
  avgEdge: number,
  winRate: number,
  avgPositionPct: number
): Array<{ day: number; conservative: number; moderate: number; aggressive: number }> {
  const projections = [];
  let conservative = startingBankroll;
  let moderate = startingBankroll;
  let aggressive = startingBankroll;

  for (let d = 0; d <= days; d++) {
    projections.push({
      day: d,
      conservative: Math.round(conservative * 100) / 100,
      moderate: Math.round(moderate * 100) / 100,
      aggressive: Math.round(aggressive * 100) / 100,
    });

    if (d < days) {
      // Conservative: half Kelly, fewer trades
      const consReturn = tradesPerDay * 0.5 * avgEdge * avgPositionPct * 0.5;
      conservative *= 1 + consReturn;

      // Moderate: quarter Kelly, normal trades
      const modReturn = tradesPerDay * avgEdge * avgPositionPct;
      moderate *= 1 + modReturn;

      // Aggressive: higher kelly, more trades (higher variance)
      const aggReturn = tradesPerDay * 1.5 * avgEdge * avgPositionPct * 1.5;
      aggressive *= 1 + aggReturn;
    }
  }

  return projections;
}
