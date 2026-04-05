"use client";

import { useState, useMemo } from "react";

export default function TradeCalculatorPage() {
  const [bankroll, setBankroll] = useState(68);
  const [marketPrice, setMarketPrice] = useState(0.5);
  const [estimatedProb, setEstimatedProb] = useState(0.55);
  const [kellyMultiplier, setKellyMultiplier] = useState(0.25);

  const calculation = useMemo(() => {
    const price = marketPrice;
    const prob = estimatedProb;

    // Kelly Criterion
    const b = (1 - price) / price; // net odds
    const q = 1 - prob;
    const fullKelly = (b * prob - q) / b;
    const fractionalKelly = Math.max(0, fullKelly * kellyMultiplier);
    const positionSize = Math.min(bankroll * fractionalKelly, bankroll * 0.15);
    const shares = positionSize / price;

    // Expected Value
    const ev = prob * (1 - price) - (1 - prob) * price;

    // Risk metrics
    const maxLoss = positionSize;
    const maxProfit = shares * (1 - price);
    const riskReward = price > 0 ? (1 - price) / price : 0;

    // Break-even probability
    const breakEven = price;

    // Edge
    const edge = prob - price;

    return {
      fullKelly: Math.max(0, fullKelly),
      fractionalKelly,
      positionSize: Math.max(0, positionSize),
      shares: Math.max(0, shares),
      ev,
      maxLoss: Math.max(0, maxLoss),
      maxProfit: Math.max(0, maxProfit),
      riskReward,
      breakEven,
      edge,
      hasEdge: edge > 0,
    };
  }, [bankroll, marketPrice, estimatedProb, kellyMultiplier]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Trade Calculator</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelly Criterion position sizing and expected value calculator
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Input Panel */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Trade Parameters
          </h3>

          <div className="space-y-5">
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Your Bankroll</span>
                <span className="font-mono text-emerald-600">
                  ${bankroll.toFixed(2)}
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="10000"
                step="1"
                value={bankroll}
                onChange={(e) => setBankroll(parseFloat(e.target.value))}
                className="mt-2 w-full accent-emerald-600"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>$1</span>
                <span>$10,000</span>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Market Price (YES)</span>
                <span className="font-mono text-blue-600">
                  {(marketPrice * 100).toFixed(0)}c
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="99"
                step="1"
                value={Math.round(marketPrice * 100)}
                onChange={(e) =>
                  setMarketPrice(parseInt(e.target.value) / 100)
                }
                className="mt-2 w-full accent-blue-600"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>1c</span>
                <span>99c</span>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Your Estimated Probability</span>
                <span className="font-mono text-purple-600">
                  {(estimatedProb * 100).toFixed(0)}%
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="99"
                step="1"
                value={Math.round(estimatedProb * 100)}
                onChange={(e) =>
                  setEstimatedProb(parseInt(e.target.value) / 100)
                }
                className="mt-2 w-full accent-purple-600"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>1%</span>
                <span>99%</span>
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700">
                <span>Kelly Multiplier</span>
                <span className="font-mono text-amber-600">
                  {kellyMultiplier.toFixed(2)}x
                </span>
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={Math.round(kellyMultiplier * 100)}
                onChange={(e) =>
                  setKellyMultiplier(parseInt(e.target.value) / 100)
                }
                className="mt-2 w-full accent-amber-600"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>0.05x (ultra safe)</span>
                <span>1.0x (full Kelly)</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Recommended: 0.25x. Full Kelly is mathematically optimal but
                has extreme variance.
              </p>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {/* Edge Indicator */}
          <div
            className={`rounded-xl border p-6 ${
              calculation.hasEdge
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  calculation.hasEdge
                    ? "bg-emerald-200 text-emerald-700"
                    : "bg-red-200 text-red-700"
                }`}
              >
                {calculation.hasEdge ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <p
                  className={`text-lg font-bold ${
                    calculation.hasEdge ? "text-emerald-800" : "text-red-800"
                  }`}
                >
                  {calculation.hasEdge
                    ? `+${(calculation.edge * 100).toFixed(1)}% Edge`
                    : `${(calculation.edge * 100).toFixed(1)}% Negative Edge`}
                </p>
                <p
                  className={`text-sm ${
                    calculation.hasEdge
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {calculation.hasEdge
                    ? "This trade has positive expected value"
                    : "DO NOT take this trade — negative expected value"}
                </p>
              </div>
            </div>
          </div>

          {/* Position Sizing */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Position Sizing
            </h4>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Recommended Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${calculation.positionSize.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">
                  {((calculation.positionSize / bankroll) * 100).toFixed(1)}%
                  of bankroll
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Shares to Buy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calculation.shares.toFixed(1)}
                </p>
                <p className="text-xs text-gray-400">
                  at {(marketPrice * 100).toFixed(0)}c each
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Full Kelly</span>
                <span className="font-mono text-gray-700">
                  {(calculation.fullKelly * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Fractional Kelly ({kellyMultiplier}x)
                </span>
                <span className="font-mono text-gray-700">
                  {(calculation.fractionalKelly * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* P&L Scenarios */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              P&L Scenarios
            </h4>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-600">
                  If you win
                </p>
                <p className="text-xl font-bold text-emerald-700">
                  +${calculation.maxProfit.toFixed(2)}
                </p>
                <p className="text-xs text-emerald-500">
                  {((calculation.maxProfit / calculation.positionSize) * 100 || 0).toFixed(0)}% return
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-sm font-medium text-red-600">If you lose</p>
                <p className="text-xl font-bold text-red-700">
                  -${calculation.maxLoss.toFixed(2)}
                </p>
                <p className="text-xs text-red-500">100% of position</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Expected Value (per $1)</span>
                <span
                  className={`font-mono font-semibold ${
                    calculation.ev >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {calculation.ev >= 0 ? "+" : ""}
                  {(calculation.ev * 100).toFixed(1)}c
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Risk:Reward Ratio</span>
                <span className="font-mono text-gray-700">
                  1:{calculation.riskReward.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Break-even Probability</span>
                <span className="font-mono text-gray-700">
                  {(calculation.breakEven * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Quick Reference: When to Trade
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h4 className="font-semibold text-emerald-800">Strong Trade</h4>
            <ul className="mt-2 space-y-1 text-sm text-emerald-700">
              <li>Edge &gt; 5%</li>
              <li>High volume (&gt;$50K)</li>
              <li>Your research is solid</li>
              <li>Kelly says bet &gt; 2%</li>
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h4 className="font-semibold text-amber-800">Marginal Trade</h4>
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              <li>Edge 2-5%</li>
              <li>Moderate volume</li>
              <li>Some uncertainty</li>
              <li>Consider half-sizing</li>
            </ul>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h4 className="font-semibold text-red-800">Skip This Trade</h4>
            <ul className="mt-2 space-y-1 text-sm text-red-700">
              <li>Edge &lt; 2% or negative</li>
              <li>Low liquidity</li>
              <li>No research advantage</li>
              <li>Kelly says don&apos;t bet</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
