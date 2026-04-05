"use client";

import { useState, useEffect } from "react";
import StatCard from "@/components/ui/StatCard";

interface Position {
  marketId: string;
  question: string;
  side: "YES" | "NO";
  shares: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  pnlPercent: number;
}

interface RiskMetrics {
  maxPositionSize: number;
  maxPortfolioExposure: number;
  currentExposure: number;
  exposurePercent: number;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  diversificationScore: number;
  recommendations: string[];
}

interface GrowthProjection {
  day: number;
  conservative: number;
  moderate: number;
  aggressive: number;
}

export default function PortfolioPage() {
  const [bankroll, setBankroll] = useState(68);
  const [positions, setPositions] = useState<Position[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [growthProjection, setGrowthProjection] = useState<GrowthProjection[]>(
    []
  );
  const [totalValue, setTotalValue] = useState(68);
  const [realizedPnl, setRealizedPnl] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [wins, setWins] = useState(0);

  // New position form
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [newPosition, setNewPosition] = useState({
    question: "",
    side: "YES" as "YES" | "NO",
    shares: 0,
    avgPrice: 0.5,
    currentPrice: 0.5,
  });

  useEffect(() => {
    fetchPortfolioAnalysis();
  }, [bankroll, positions, realizedPnl, totalTrades, wins]);

  async function fetchPortfolioAnalysis() {
    try {
      const res = await fetch("/api/polymarket/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankroll,
          positions,
          realizedPnl,
          totalTrades,
          wins,
        }),
      });
      const data = await res.json();
      setRiskMetrics(data.riskMetrics);
      setGrowthProjection(data.growthProjection || []);
      setTotalValue(data.summary?.totalValue || bankroll);
    } catch {
      // silently handle
    }
  }

  function addPosition() {
    if (!newPosition.question || newPosition.shares <= 0) return;
    const pos: Position = {
      marketId: `manual-${Date.now()}`,
      ...newPosition,
      unrealizedPnl:
        newPosition.shares *
        (newPosition.currentPrice - newPosition.avgPrice),
      pnlPercent:
        newPosition.avgPrice > 0
          ? ((newPosition.currentPrice - newPosition.avgPrice) /
              newPosition.avgPrice) *
            100
          : 0,
    };
    setPositions([...positions, pos]);
    setShowAddPosition(false);
    setNewPosition({
      question: "",
      side: "YES",
      shares: 0,
      avgPrice: 0.5,
      currentPrice: 0.5,
    });
  }

  function removePosition(index: number) {
    const pos = positions[index];
    setRealizedPnl(realizedPnl + pos.unrealizedPnl);
    setTotalTrades(totalTrades + 1);
    if (pos.unrealizedPnl >= 0) setWins(wins + 1);
    setPositions(positions.filter((_, i) => i !== index));
  }

  const unrealizedPnl = positions.reduce(
    (sum, p) => sum + p.unrealizedPnl,
    0
  );

  // Growth projection milestones
  const day30 = growthProjection.find((g) => g.day === 30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Portfolio</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track positions, P&L, and risk exposure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <label className="text-sm font-medium text-gray-600">
              Starting Bankroll:
            </label>
            <span className="text-sm text-gray-400">$</span>
            <input
              type="number"
              value={bankroll}
              onChange={(e) =>
                setBankroll(parseFloat(e.target.value) || 0)
              }
              className="w-20 border-none bg-transparent text-sm font-semibold text-gray-900 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowAddPosition(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Add Position
          </button>
        </div>
      </div>

      {/* Portfolio Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Portfolio Value"
          value={`$${totalValue.toFixed(2)}`}
          icon={
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
          iconBg="bg-emerald-100"
        />
        <StatCard
          title="Unrealized P&L"
          value={`${unrealizedPnl >= 0 ? "+" : ""}$${unrealizedPnl.toFixed(2)}`}
          changeType={unrealizedPnl >= 0 ? "positive" : "negative"}
          icon={
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          }
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Realized P&L"
          value={`${realizedPnl >= 0 ? "+" : ""}$${realizedPnl.toFixed(2)}`}
          change={`${totalTrades} trades | ${totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(0) : 0}% win rate`}
          changeType={realizedPnl >= 0 ? "positive" : "negative"}
          icon={
            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
            </svg>
          }
          iconBg="bg-purple-100"
        />
        <StatCard
          title="Risk Level"
          value={riskMetrics?.riskLevel || "LOW"}
          change={`${riskMetrics?.exposurePercent || 0}% exposed`}
          changeType={
            riskMetrics?.riskLevel === "LOW"
              ? "positive"
              : riskMetrics?.riskLevel === "CRITICAL"
              ? "negative"
              : "neutral"
          }
          icon={
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
          iconBg="bg-amber-100"
        />
      </div>

      {/* Risk Recommendations */}
      {riskMetrics && riskMetrics.recommendations.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-800">
            Risk Recommendations
          </h3>
          <ul className="mt-2 space-y-1">
            {riskMetrics.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                <span className="mt-0.5 text-amber-500">*</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add Position Modal */}
      {showAddPosition && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Add Position
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Market Question
              </label>
              <input
                type="text"
                value={newPosition.question}
                onChange={(e) =>
                  setNewPosition({ ...newPosition, question: e.target.value })
                }
                placeholder="Will X happen by Y?"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Side
              </label>
              <select
                value={newPosition.side}
                onChange={(e) =>
                  setNewPosition({
                    ...newPosition,
                    side: e.target.value as "YES" | "NO",
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="YES">YES</option>
                <option value="NO">NO</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Shares
              </label>
              <input
                type="number"
                step="0.01"
                value={newPosition.shares || ""}
                onChange={(e) =>
                  setNewPosition({
                    ...newPosition,
                    shares: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Avg Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.99"
                value={newPosition.avgPrice || ""}
                onChange={(e) =>
                  setNewPosition({
                    ...newPosition,
                    avgPrice: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={addPosition}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddPosition(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Positions Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Open Positions
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Market
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Side
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Shares
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Avg Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Current
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  P&L
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {positions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No open positions. Use the Market Scanner to find
                    opportunities and add positions here to track them.
                  </td>
                </tr>
              ) : (
                positions.map((pos, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="max-w-xs px-6 py-4 text-sm font-medium text-gray-900">
                      <p className="truncate">{pos.question}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          pos.side === "YES"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {pos.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">
                      {pos.shares.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">
                      {(pos.avgPrice * 100).toFixed(0)}c
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-900">
                      {(pos.currentPrice * 100).toFixed(0)}c
                    </td>
                    <td
                      className={`px-6 py-4 font-mono text-sm font-semibold ${
                        pos.unrealizedPnl >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {pos.unrealizedPnl >= 0 ? "+" : ""}$
                      {pos.unrealizedPnl.toFixed(2)} (
                      {pos.pnlPercent.toFixed(1)}%)
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => removePosition(i)}
                        className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 30-Day Growth Projection */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900">
          30-Day Growth Projection
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Based on 3 trades/day, 3% avg edge, 55% win rate
        </p>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">Conservative</p>
            <p className="mt-1 text-xl font-bold text-gray-700">
              ${day30?.conservative.toFixed(2) || "—"}
            </p>
            <p className="text-xs text-gray-400">
              {day30
                ? `+${(((day30.conservative - bankroll) / bankroll) * 100).toFixed(0)}%`
                : ""}
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-600">Moderate</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">
              ${day30?.moderate.toFixed(2) || "—"}
            </p>
            <p className="text-xs text-emerald-500">
              {day30
                ? `+${(((day30.moderate - bankroll) / bankroll) * 100).toFixed(0)}%`
                : ""}
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-600">Aggressive</p>
            <p className="mt-1 text-xl font-bold text-amber-700">
              ${day30?.aggressive.toFixed(2) || "—"}
            </p>
            <p className="text-xs text-amber-500">
              {day30
                ? `+${(((day30.aggressive - bankroll) / bankroll) * 100).toFixed(0)}%`
                : ""}
            </p>
          </div>
        </div>

        {/* Simple chart visualization */}
        {growthProjection.length > 0 && (
          <div className="mt-6">
            <div className="flex items-end gap-1" style={{ height: 120 }}>
              {growthProjection
                .filter((_, i) => i % 3 === 0 || i === 30)
                .map((g, i) => {
                  const maxVal = day30?.aggressive || bankroll * 2;
                  const height = Math.max(
                    (g.moderate / maxVal) * 100,
                    5
                  );
                  return (
                    <div
                      key={i}
                      className="group relative flex-1"
                    >
                      <div
                        className="w-full rounded-t bg-emerald-400 transition-all hover:bg-emerald-500"
                        style={{ height: `${height}%` }}
                      />
                      <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white group-hover:block">
                        Day {g.day}: ${g.moderate.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-400">
              <span>Day 0</span>
              <span>Day 15</span>
              <span>Day 30</span>
            </div>
          </div>
        )}
      </div>

      {/* Risk Limits */}
      {riskMetrics && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900">Risk Limits</h3>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">Max Position Size</p>
              <p className="text-lg font-bold text-gray-900">
                ${riskMetrics.maxPositionSize.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400">10% of bankroll</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Max Total Exposure</p>
              <p className="text-lg font-bold text-gray-900">
                ${riskMetrics.maxPortfolioExposure.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400">50% of bankroll</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Exposure</p>
              <p className="text-lg font-bold text-gray-900">
                ${riskMetrics.currentExposure.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400">
                {riskMetrics.exposurePercent}% utilized
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Diversification</p>
              <p className="text-lg font-bold text-gray-900">
                {riskMetrics.diversificationScore}/100
              </p>
              <p className="text-xs text-gray-400">Higher is better</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
