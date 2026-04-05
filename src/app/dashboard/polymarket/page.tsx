"use client";

import { useState, useEffect, useCallback } from "react";
import StatCard from "@/components/ui/StatCard";

interface MarketOpportunity {
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
  score: number;
}

export default function PolymarketScannerPage() {
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bankroll, setBankroll] = useState(68);
  const [filterStrategy, setFilterStrategy] = useState<string>("all");
  const [filterConfidence, setFilterConfidence] = useState<string>("all");

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/polymarket/scanner?bankroll=${bankroll}&limit=100`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOpportunities(data.opportunities || []);
    } catch (err) {
      setError("Failed to scan markets. The Polymarket API may be temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [bankroll]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const filtered = opportunities.filter((opp) => {
    if (filterStrategy !== "all" && opp.strategy !== filterStrategy) return false;
    if (filterConfidence !== "all" && opp.confidence !== filterConfidence) return false;
    return true;
  });

  const strategies = [...new Set(opportunities.map((o) => o.strategy))];
  const totalRecommendedInvestment = filtered.reduce(
    (sum, o) => sum + o.recommendedSize,
    0
  );
  const avgScore =
    filtered.length > 0
      ? Math.round(filtered.reduce((sum, o) => sum + o.score, 0) / filtered.length)
      : 0;
  const highConfCount = filtered.filter((o) => o.confidence === "HIGH").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Market Scanner
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            AI-powered opportunity detection across Polymarket
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <label className="text-sm font-medium text-gray-600">
              Bankroll:
            </label>
            <span className="text-sm text-gray-400">$</span>
            <input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(parseFloat(e.target.value) || 0)}
              className="w-20 border-none bg-transparent text-sm font-semibold text-gray-900 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchOpportunities}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Scanning..." : "Scan Markets"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Opportunities Found"
          value={filtered.length.toString()}
          icon={
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          iconBg="bg-emerald-100"
        />
        <StatCard
          title="High Confidence"
          value={highConfCount.toString()}
          icon={
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Avg Score"
          value={`${avgScore}/100`}
          icon={
            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
          iconBg="bg-purple-100"
        />
        <StatCard
          title="Suggested Deployment"
          value={`$${totalRecommendedInvestment.toFixed(2)}`}
          change={`${((totalRecommendedInvestment / bankroll) * 100).toFixed(0)}% of bankroll`}
          changeType="neutral"
          icon={
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconBg="bg-amber-100"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterStrategy}
          onChange={(e) => setFilterStrategy(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All Strategies</option>
          {strategies.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filterConfidence}
          onChange={(e) => setFilterConfidence(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All Confidence</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Opportunities Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Market
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Side
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Edge
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  EV
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  R:R
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Strategy
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                      Scanning Polymarket for opportunities...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-500">
                    No opportunities found matching your criteria. Try adjusting filters.
                  </td>
                </tr>
              ) : (
                filtered.map((opp, i) => (
                  <tr key={`${opp.marketId}-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                          opp.score >= 70
                            ? "bg-emerald-500"
                            : opp.score >= 40
                            ? "bg-amber-500"
                            : "bg-gray-400"
                        }`}
                      >
                        {opp.score}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {opp.question}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {opp.reasoning}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          opp.side === "YES"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {opp.side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                      {(opp.currentPrice * 100).toFixed(0)}c
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-emerald-600">
                      +{(opp.edge * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                      ${opp.recommendedSize.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-blue-600">
                      {(opp.expectedValue * 100).toFixed(1)}c
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {opp.riskRewardRatio.toFixed(1)}:1
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {opp.strategy}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          opp.confidence === "HIGH"
                            ? "bg-emerald-100 text-emerald-700"
                            : opp.confidence === "MEDIUM"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {opp.confidence}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-medium text-amber-800">
          DISCLAIMER: This scanner provides analysis tools only. All trading involves risk of loss.
          Never invest more than you can afford to lose. Past performance does not indicate future results.
          Do your own research before placing any trades. The $68 to $100K goal in 30 days is extremely
          unrealistic — focus on consistent, risk-managed growth instead.
        </p>
      </div>
    </div>
  );
}
