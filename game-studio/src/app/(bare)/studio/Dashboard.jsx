'use client';

// Studio analytics dashboard: the numbers that decide what to build and tune next.
// Auth: STUDIO_TOKEN (entered once, kept in this browser).
import { useCallback, useEffect, useState } from 'react';

const TOKEN_KEY = 'ra:studio-token';

function Tile({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-panel p-4 ring-1 ring-line">
      <div className="text-xs font-bold uppercase tracking-wider text-white/50">{label}</div>
      <div className="mt-1 font-display text-3xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/50">{sub}</div>}
    </div>
  );
}

function BarChart({ title, rows, field }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...rows.map((r) => r[field]));
  return (
    <div className="rounded-2xl bg-panel p-4 ring-1 ring-line">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-bold text-white">{title}</div>
        <div className="text-sm text-white/70">{hover ? `${hover.day}: ${hover[field].toLocaleString()}` : `peak ${max.toLocaleString()}`}</div>
      </div>
      <div className="flex h-36 items-end gap-[2px] border-b border-white/15" onMouseLeave={() => setHover(null)}>
        {rows.map((r) => (
          <div key={r.day} className="group flex h-full flex-1 items-end" onMouseEnter={() => setHover(r)} title={`${r.day}: ${r[field]}`}>
            <div
              className={`w-full rounded-t-[4px] ${hover && hover.day === r.day ? 'bg-[#67e8f9]' : 'bg-aqua'}`}
              style={{ height: `${Math.max(r[field] ? 2 : 0, (r[field] / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-white/40">
        <span>{rows[0]?.day}</span>
        <span>{rows[rows.length - 1]?.day}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [token, setToken] = useState('');
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(
    async (t = token) => {
      setErr('');
      try {
        const r = await fetch(`/api/stats?days=${days}`, { headers: t ? { authorization: `Bearer ${t}` } : {} });
        if (r.status === 401) throw new Error('Wrong or missing studio token.');
        if (!r.ok) throw new Error(`Error ${r.status}`);
        setData(await r.json());
      } catch (e) {
        setErr(e.message);
      }
    },
    [token, days],
  );

  useEffect(() => {
    let t = '';
    try {
      t = localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      /* ignore */
    }
    setToken(t);
    load(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const n = (v) => (v || 0).toLocaleString();
  const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '-');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">📊 Studio dashboard</h1>
        {data && <span className="chip">store: {data.store}</span>}
        <div className="ml-auto flex gap-1 rounded-full bg-panel p-1 ring-1 ring-line">
          {[7, 14, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`rounded-full px-3 py-1 text-sm font-bold ${days === d ? 'bg-white text-ink' : 'text-white/60'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {err && (
        <form
          className="mt-6 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              localStorage.setItem(TOKEN_KEY, token);
            } catch {
              /* ignore */
            }
            load(token);
          }}
        >
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="STUDIO_TOKEN"
            className="flex-1 rounded-xl bg-panel px-3 py-2 ring-1 ring-line"
          />
          <button className="btn-pink py-2">Unlock</button>
          <p className="basis-full text-sm text-pink">{err}</p>
        </form>
      )}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            <Tile label="Unique visitors" value={n(data.uniqueVisitors)} sub={`${data.range.days} days`} />
            <Tile label="Page views" value={n(data.totals.pageViews)} />
            <Tile label="Runs played" value={n(data.totals.runs)} sub={`${data.uniqueVisitors ? (data.totals.runs / data.uniqueVisitors).toFixed(1) : 0} per visitor`} />
            <Tile label="Shares" value={n(data.totals.shares)} sub={`${pct(data.totals.challengeOpens, data.totals.shares)} opened back`} />
            <Tile label="Ads shown" value={n(data.totals.interstitials + data.totals.rewarded)} sub={`${n(data.totals.rewarded)} rewarded`} />
            <Tile label="Subscribers" value={n(data.subscribers)} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <BarChart title="Daily active visitors" rows={data.series} field="dau" />
            <BarChart title="Runs per day" rows={data.series} field="runs" />
          </div>

          <h2 className="mt-8 font-display text-xl font-bold">Games (sorted by runs)</h2>
          <p className="text-sm text-white/50">
            Runs/player is the “one more try” score. Low start rate = weak first impression; low runs/player = tune difficulty; high share rate = feature it.
          </p>
          <div className="mt-3 overflow-x-auto rounded-2xl ring-1 ring-line">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50">
                <tr>
                  {['Game', 'Players', 'Loads', 'Start rate', 'Runs', 'Runs/player', 'Avg run', 'Restarts', 'Revives', 'Shares', 'Share rate', 'Ads'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-right first:text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.games.map((g) => (
                  <tr key={g.slug} className="border-t border-line text-right tabular-nums">
                    <td className="px-3 py-2 text-left font-bold">{g.title}</td>
                    <td className="px-3 py-2">{n(g.players)}</td>
                    <td className="px-3 py-2">{n(g.loads)}</td>
                    <td className="px-3 py-2">{g.startRate}%</td>
                    <td className="px-3 py-2">{n(g.runs)}</td>
                    <td className="px-3 py-2 font-bold text-white">{g.runsPerPlayer}</td>
                    <td className="px-3 py-2">{g.avgRunSec}s</td>
                    <td className="px-3 py-2">{n(g.restarts)}</td>
                    <td className="px-3 py-2">
                      {n(g.revives)}/{n(g.reviveOffers)}
                    </td>
                    <td className="px-3 py-2">{n(g.shares)}</td>
                    <td className="px-3 py-2">{g.shareRate}%</td>
                    <td className="px-3 py-2">{n(g.interstitials + g.rewarded)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl bg-panel p-4 ring-1 ring-line">
              <div className="mb-2 font-bold">🧪 Experiments</div>
              {Object.keys(data.experiments).length === 0 && <p className="text-sm text-white/50">No data yet.</p>}
              {Object.entries(data.experiments).map(([name, variants]) => (
                <div key={name} className="mb-3">
                  <div className="text-sm font-bold text-aqua">{name}</div>
                  <table className="w-full text-xs tabular-nums">
                    <thead className="text-white/40">
                      <tr>
                        <th className="text-left">variant</th>
                        <th className="text-right">runs</th>
                        <th className="text-right">restart/run</th>
                        <th className="text-right">share/run</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(variants).map(([v, ev]) => (
                        <tr key={v}>
                          <td>{v}</td>
                          <td className="text-right">{n(ev.game_over)}</td>
                          <td className="text-right">{pct(ev.restart, ev.game_over)}</td>
                          <td className="text-right">{pct(ev.share_click, ev.game_over)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-panel p-4 ring-1 ring-line">
              <div className="mb-2 font-bold">🌍 Top referrers</div>
              {data.referrers.length === 0 && <p className="text-sm text-white/50">No data yet.</p>}
              {data.referrers.map(([h, c]) => (
                <div key={h} className="flex justify-between border-b border-line py-1 text-sm">
                  <span className="truncate">{h}</span>
                  <span className="tabular-nums text-white/70">{n(c)}</span>
                </div>
              ))}
              <div className="mb-2 mt-4 font-bold">📣 Campaigns (utm)</div>
              {data.sources.map(([h, c]) => (
                <div key={h} className="flex justify-between border-b border-line py-1 text-sm">
                  <span className="truncate">{h}</span>
                  <span className="tabular-nums text-white/70">{n(c)}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl bg-panel p-4 ring-1 ring-line">
              <div className="mb-2 font-bold">🔁 Returning activity by account age</div>
              <p className="mb-2 text-xs text-white/50">Daily first-activity counts, bucketed by days since the visitor was first seen.</p>
              {Object.entries(data.retention).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-line py-1 text-sm">
                  <span>{k.replace('d', 'day ').replace('_', '-').replace('p', '+')}</span>
                  <span className="tabular-nums text-white/70">{n(v)}</span>
                </div>
              ))}
              <div className="mb-2 mt-4 font-bold">📤 Share channels</div>
              {Object.entries(data.shareChannels).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-line py-1 text-sm">
                  <span>{k}</span>
                  <span className="tabular-nums text-white/70">{n(v)}</span>
                </div>
              ))}
              <a className="mt-4 inline-block text-sm text-aqua underline" href={`/api/stats?export=subs&token=${encodeURIComponent(token)}`}>
                Export subscribers
              </a>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[280px_1fr]">
            <div className="rounded-2xl bg-panel p-4 ring-1 ring-line">
              <div className="mb-2 font-bold">⭐ Plus (ad-free pass)</div>
              <div className="font-display text-3xl font-bold">{n(data.plus?.sales || 0)}</div>
              <div className="text-xs text-white/50">passes sold, all time</div>
              {Object.entries(data.plus || {})
                .filter(([k]) => k.startsWith('cents_'))
                .map(([k, v]) => (
                  <div key={k} className="mt-2 text-sm text-white/70">
                    {(v / 100).toFixed(2)} {k.slice(6).toUpperCase()} gross
                  </div>
                ))}
            </div>
            <div className="rounded-2xl bg-panel p-4 ring-1 ring-line">
              <div className="mb-2 flex items-baseline justify-between">
                <div className="font-bold">📣 Advertiser & sponsor enquiries</div>
                <a className="text-sm text-aqua underline" href={`/api/stats?export=leads&token=${encodeURIComponent(token)}`}>
                  Export all
                </a>
              </div>
              {!data.leads?.length && <p className="text-sm text-white/50">No enquiries yet. Share the /advertise page with brands and agencies.</p>}
              {data.leads?.map((l, i) => (
                <div key={i} className="border-b border-line py-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-bold">
                      {l.name}
                      {l.company ? ` · ${l.company}` : ''}
                    </span>
                    <span className="text-white/50">{l.at?.slice(0, 10)}</span>
                  </div>
                  <div className="text-white/70">
                    <a className="text-aqua underline" href={`mailto:${l.email}`}>
                      {l.email}
                    </a>{' '}
                    · {l.interest} · {l.budget}
                  </div>
                  {l.message && <div className="mt-1 text-white/60">{l.message}</div>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
