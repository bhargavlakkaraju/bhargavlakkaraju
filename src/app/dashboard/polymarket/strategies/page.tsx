"use client";

export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Strategy Guide</h1>
        <p className="mt-1 text-sm text-gray-500">
          Proven strategies for growing your Polymarket account
        </p>
      </div>

      {/* Reality Check */}
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-bold text-red-800">
          Reality Check: $68 to $100K
        </h2>
        <p className="mt-2 text-sm text-red-700">
          Going from $68 to $100K in 30 days requires a 1,470x return. This is{" "}
          <strong>not realistic with any strategy</strong>. For reference:
        </p>
        <ul className="mt-2 space-y-1 text-sm text-red-700">
          <li>
            * The best hedge fund managers in history average 30-40%{" "}
            <strong>per year</strong>
          </li>
          <li>
            * A 1,470x return in 30 days requires ~27% daily compound returns
          </li>
          <li>
            * Attempting this will almost certainly result in losing your $68
          </li>
        </ul>
        <p className="mt-3 text-sm font-semibold text-red-800">
          Realistic 30-day targets with disciplined trading: $68 → $80-120
          (18-76% return). Even that requires skill and favorable conditions.
        </p>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Strategy 1 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                1. Near-Resolution Value
              </h3>
              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                Recommended for Small Bankrolls
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <p>
              <strong>How it works:</strong> Buy YES contracts at 90-97c on
              markets that are almost certainly going to resolve YES. These
              markets are near their resolution date and have strong
              fundamentals.
            </p>
            <p>
              <strong>Edge:</strong> Markets often slightly underprice
              near-certainties due to time value and liquidity preferences.
              You capture 3-10c per share with high probability.
            </p>
            <p>
              <strong>Example:</strong> &ldquo;Will the Sun rise tomorrow?&rdquo; is at 96c.
              Buy 70 shares for $67.20. If it resolves YES, you make $2.80
              (4.2% return in 1 day).
            </p>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500">KEY METRICS</p>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Win Rate:</span>{" "}
                  <span className="font-semibold">85-95%</span>
                </div>
                <div>
                  <span className="text-gray-400">Avg Return:</span>{" "}
                  <span className="font-semibold">3-7%</span>
                </div>
                <div>
                  <span className="text-gray-400">Risk:</span>{" "}
                  <span className="font-semibold text-emerald-600">Low</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              <strong>Danger:</strong> If the &ldquo;certain&rdquo; event doesn&apos;t happen, you
              lose almost everything you invested. Always verify fundamentals.
            </p>
          </div>
        </div>

        {/* Strategy 2 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                2. News-Driven Trading
              </h3>
              <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                Highest Alpha Potential
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <p>
              <strong>How it works:</strong> Monitor breaking news and trade
              markets before prices fully adjust. Speed is everything — you
              need to see news and act within minutes.
            </p>
            <p>
              <strong>Edge:</strong> Markets can take 5-30 minutes to fully
              price in new information. If you&apos;re faster than the crowd, you
              capture the price movement.
            </p>
            <p>
              <strong>Tools needed:</strong> Twitter/X lists, news alerts,
              RSS feeds, push notifications from major news sources. Focus on
              specific topics where you have domain expertise.
            </p>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500">KEY METRICS</p>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Win Rate:</span>{" "}
                  <span className="font-semibold">55-65%</span>
                </div>
                <div>
                  <span className="text-gray-400">Avg Return:</span>{" "}
                  <span className="font-semibold">10-50%</span>
                </div>
                <div>
                  <span className="text-gray-400">Risk:</span>{" "}
                  <span className="font-semibold text-amber-600">Medium</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              <strong>Danger:</strong> Acting on incomplete information or
              rumors can lead to losses. Verify before trading. Fake news
              traps are common.
            </p>
          </div>
        </div>

        {/* Strategy 3 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-3L16.5 18m0 0L12 13.5M16.5 18V4.5" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                3. Spread Capture / Market Making
              </h3>
              <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                Consistent Small Gains
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <p>
              <strong>How it works:</strong> Place limit orders on both sides
              of a market (buy YES at 48c, sell YES at 52c). When both orders
              fill, you pocket the spread.
            </p>
            <p>
              <strong>Edge:</strong> You profit from the bid-ask spread
              without needing to predict the outcome. Works best on markets
              with wide spreads (&gt;4c) and regular trading activity.
            </p>
            <p>
              <strong>Important:</strong> Use Polymarket&apos;s limit order system.
              Never use market orders for this strategy. Monitor positions
              closely and adjust.
            </p>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500">KEY METRICS</p>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Win Rate:</span>{" "}
                  <span className="font-semibold">70-80%</span>
                </div>
                <div>
                  <span className="text-gray-400">Avg Return:</span>{" "}
                  <span className="font-semibold">1-4%</span>
                </div>
                <div>
                  <span className="text-gray-400">Risk:</span>{" "}
                  <span className="font-semibold text-emerald-600">Low</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              <strong>Danger:</strong> Inventory risk — if the market moves
              sharply while you hold one side, you can get caught. Use stop
              losses.
            </p>
          </div>
        </div>

        {/* Strategy 4 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                4. Arbitrage Across Related Markets
              </h3>
              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                Risk-Free (When Available)
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <p>
              <strong>How it works:</strong> Find related markets where prices
              are inconsistent. E.g., if &ldquo;Party A wins election&rdquo; + &ldquo;Party B
              wins election&rdquo; sum to less than $1, buy both for guaranteed
              profit.
            </p>
            <p>
              <strong>Edge:</strong> Pure mathematical arbitrage — you profit
              regardless of outcome. These opportunities are rare and usually
              small, but risk-free when found.
            </p>
            <p>
              <strong>Where to look:</strong> Multi-outcome markets (elections
              with 3+ candidates), related event groups, YES+NO pairs
              summing to less than $1.
            </p>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500">KEY METRICS</p>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Win Rate:</span>{" "}
                  <span className="font-semibold">~100%</span>
                </div>
                <div>
                  <span className="text-gray-400">Avg Return:</span>{" "}
                  <span className="font-semibold">0.5-3%</span>
                </div>
                <div>
                  <span className="text-gray-400">Risk:</span>{" "}
                  <span className="font-semibold text-emerald-600">
                    Very Low
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              <strong>Danger:</strong> Execution risk — if one leg fills and
              the other doesn&apos;t, you have an unhedged position. Use limit
              orders carefully.
            </p>
          </div>
        </div>
      </div>

      {/* Bankroll Management Rules */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-bold text-gray-900">
          The #1 Rule: Bankroll Management
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Most Polymarket traders lose money because of poor position sizing,
          not bad predictions. Follow these rules religiously:
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              1
            </span>
            <div>
              <p className="font-semibold text-gray-900">
                Never risk more than 10% on a single trade
              </p>
              <p className="text-sm text-gray-500">
                With $68, your max position is $6.80. This means you survive
                10 consecutive losses.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              2
            </span>
            <div>
              <p className="font-semibold text-gray-900">
                Use Kelly Criterion (at 0.25x)
              </p>
              <p className="text-sm text-gray-500">
                Let math size your positions. Quarter Kelly gives 75% of
                optimal growth with far less variance.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              3
            </span>
            <div>
              <p className="font-semibold text-gray-900">
                Keep max 50% of bankroll invested at any time
              </p>
              <p className="text-sm text-gray-500">
                Always have dry powder for new opportunities. With $68, never
                have more than $34 in open positions.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              4
            </span>
            <div>
              <p className="font-semibold text-gray-900">
                Diversify across 5-10 markets
              </p>
              <p className="text-sm text-gray-500">
                Don&apos;t put all eggs in one basket. Spread across different
                categories and timeframes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              5
            </span>
            <div>
              <p className="font-semibold text-gray-900">
                Only trade when you have edge
              </p>
              <p className="text-sm text-gray-500">
                If you don&apos;t know why you have an information advantage, you
                don&apos;t have one. Skip the trade.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Routine */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-bold text-gray-900">
          Suggested Daily Routine
        </h2>
        <div className="mt-4 space-y-4">
          <div className="flex gap-4">
            <div className="flex h-8 w-16 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
              9 AM
            </div>
            <p className="text-sm text-gray-700">
              <strong>Morning Scan:</strong> Check the Market Scanner for
              overnight opportunities. Review news that might affect your
              open positions.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex h-8 w-16 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
              12 PM
            </div>
            <p className="text-sm text-gray-700">
              <strong>Midday Review:</strong> Check position P&L. Adjust or
              close positions that have hit targets. Look for new setups.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex h-8 w-16 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
              6 PM
            </div>
            <p className="text-sm text-gray-700">
              <strong>Evening Analysis:</strong> Review the day&apos;s trades. Log
              wins/losses in Portfolio tracker. Identify tomorrow&apos;s targets.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex h-8 w-16 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-semibold text-emerald-600">
              Always
            </div>
            <p className="text-sm text-gray-700">
              <strong>Breaking News:</strong> Have Twitter/X alerts set up
              for topics you trade. When news breaks, check Polymarket
              immediately for mispriced markets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
