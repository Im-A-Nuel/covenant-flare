"use client";

import * as React from "react";
import Link from "next/link";
import { CovenantCard } from "@/components/covenant-card";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/ui/count-up";
import { useWallet } from "@/lib/wallet";
import { useCovenants, useAuditLog, useFtsoPrice, useVaultDeployed } from "@/lib/useCovenants";
import { explorerTx } from "@/lib/flare/chain";
import { shortAddr, timeAgo } from "@/lib/utils";

/* ---------- stat card icons (verbatim from Dashboard.html) ---------- */
const STAT_ICONS: Record<string, React.ReactNode> = {
  blue: (
    <>
      <path d="M8.4 5.2C5.2 8 5.2 16 8.4 18.8" />
      <path d="M15.6 5.2C18.8 8 18.8 16 15.6 18.8" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 9.7v4.6" />
      <path d="M13.2 10.6c-.4-.4-.8-.6-1.4-.6-.8 0-1.3.4-1.3 1 0 1.3 2.7.6 2.7 1.9 0 .6-.6 1-1.3 1-.6 0-1-.2-1.4-.6" />
    </>
  ),
  green: (
    <>
      <rect x="4" y="3.6" width="16" height="16.8" rx="3.2" />
      <path d="M10 7.4C8.6 9 8.6 12.4 10 14" />
      <path d="M14 7.4C15.4 9 15.4 12.4 14 14" />
      <circle cx="12" cy="10.7" r="1.15" style={{ fill: "currentColor", stroke: "none" }} />
      <path d="M8.6 17h6.8" />
    </>
  ),
  amber: (
    <>
      <path d="M4.6 16.2a7.4 7.4 0 0 1 14.8 0" />
      <path d="M12 16.2l3.6-3.9" />
      <circle cx="12" cy="16.2" r="1.15" style={{ fill: "currentColor", stroke: "none" }} />
      <path d="M4.7 16.2h1.4M17.9 16.2h1.4M12 8.6v1.4" />
    </>
  ),
  lilac: (
    <>
      <path d="M7.2 4.6C3.8 8 3.8 16 7.2 19.4" />
      <path d="M16.8 4.6C20.2 8 20.2 16 16.8 19.4" />
      <path d="M9.2 12.1l2 2 3.6-4.2" />
    </>
  ),
};

const W = 920;
const H = 270;
const PL = 46;
const PR = 18;
const PT = 20;
const PB = 34;
const IW = W - PL - PR;
const IH = H - PT - PB;

function smooth(p: number[][]): string {
  if (p.length < 2) return "";
  let d = "M" + p[0][0].toFixed(1) + "," + p[0][1].toFixed(1);
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] || p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Dashboard() {
  const { account } = useWallet();
  const vaultDeployed = useVaultDeployed();
  const { covenants, loading: covLoading } = useCovenants(account);
  const { events, loading: auditLoading } = useAuditLog();
  const { priceWei } = useFtsoPrice();

  const ready = !covLoading && !auditLoading;

  if (!vaultDeployed) return <VaultNotDeployed />;
  if (!account) return <ConnectWalletPrompt />;
  if (!ready) return <DashboardSkeleton />;

  const active = covenants.filter((c) => c.status === "active");
  const remaining = active.reduce((s, c) => s + c.remainingBudgetUsd, 0);
  const payments = events.filter((e) => e.kind === "payment");

  const nowSec = Math.floor(Date.now() / 1000);
  const spent24h = payments
    .filter((e) => e.payment && nowSec - e.payment.timestamp < 86_400)
    .reduce((s, e) => s + Number(e.payment!.usdCents) / 100, 0);

  // Real last-7-days spend, bucketed by each PaymentExecuted event's block timestamp.
  const dayBuckets: number[] = Array.from({ length: 7 }, () => 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const e of payments) {
    if (!e.payment) continue;
    const day = new Date(e.payment.timestamp * 1000);
    day.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - day.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays < 7) {
      dayBuckets[6 - diffDays] += Number(e.payment.usdCents) / 100;
    }
  }
  const chartLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return DAY_LABELS[d.getDay()];
  });
  const yMax = Math.max(1, ...dayBuckets) * 1.25;
  const cx = (i: number) => PL + IW * (i / 6);
  const cy = (v: number) => PT + IH * (1 - v / yMax);
  const pts = dayBuckets.map((v, i) => [cx(i), cy(v)]);
  const line = smooth(pts);
  const area = line ? line + ` L${cx(6).toFixed(1)},${(PT + IH).toFixed(1)} L${PL},${(PT + IH).toFixed(1)} Z` : "";
  const gy = [0, yMax / 2, yMax];

  const stats: { c: keyof typeof STAT_ICONS; v: React.ReactNode; l: string; sub: React.ReactNode }[] = [
    {
      c: "blue",
      v: (
        <>
          $<CountUp end={remaining} decimals={2} />
        </>
      ),
      l: "budget remaining",
      sub: `across ${active.length} active covenants`,
    },
    {
      c: "green",
      v: <CountUp end={active.length} />,
      l: "active covenants",
      sub: (
        <>
          <b>{covenants.length}</b> total
        </>
      ),
    },
    {
      c: "amber",
      v: (
        <>
          $<CountUp end={spent24h} decimals={2} />
        </>
      ),
      l: "spent · last 24h",
      sub: "read from PaymentExecuted events",
    },
    {
      c: "lilac",
      v: <CountUp end={payments.length} />,
      l: "payments settled",
      sub: `across ${covenants.length} covenants`,
    },
  ];

  const approvedWeek = dayBuckets.reduce((s, v) => s + v, 0);
  const peak = Math.max(0, ...dayBuckets);
  const feed = payments.slice(0, 4);

  return (
    <>
      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Workspace</div>
          <h1 className="display ph">Welcome back</h1>
          <p>
            {active.length} covenant{active.length === 1 ? " is" : "s are"} active. Every number on
            this page is read directly from CovenantVault on Coston2, not a database.
          </p>
        </div>
        <Link className="btn btn-dark" href="/new">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New covenant
        </Link>
      </div>

      <div className="stats">
        {stats.map((s, i) => (
          <div className="stat" key={i}>
            <div className={`si ${s.c}`}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {STAT_ICONS[s.c]}
              </svg>
            </div>
            <div className="sv">{s.v}</div>
            <div className="sl">
              {s.l} · {s.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-head">
          <div>
            <h2>Spending under covenant</h2>
            <p>Real settled payments over the last 7 days, read from on-chain events.</p>
          </div>
          <div className="chart-legend">
            <span className="lg">
              <span className="sw"></span> Approved spend (USD)
            </span>
          </div>
        </div>
        <div>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} preserveAspectRatio="none" fontFamily="'Hanken Grotesk',sans-serif">
            <defs>
              <linearGradient id="cgrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2775ca" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#2775ca" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {gy.map((v) => (
              <React.Fragment key={v}>
                <line x1={PL} y1={cy(v).toFixed(1)} x2={W - PR} y2={cy(v).toFixed(1)} stroke="#f0f0f0" strokeWidth="1" />
                <text x={PL - 10} y={(cy(v) + 4).toFixed(1)} textAnchor="end" fontSize="12" fill="#a9a9af" fontFamily="'Hanken Grotesk',sans-serif">
                  ${v.toFixed(2)}
                </text>
              </React.Fragment>
            ))}
            {area && <path d={area} fill="url(#cgrad)" />}
            {line && <path d={line} fill="none" stroke="#2775ca" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
            {dayBuckets.map((v, i) => (
              <circle key={`dot-${i}`} cx={cx(i).toFixed(1)} cy={cy(v).toFixed(1)} r="3.4" fill="#fff" stroke="#2775ca" strokeWidth="2" />
            ))}
            {chartLabels.map((label, i) => (
              <text key={`xl-${i}`} x={cx(i).toFixed(1)} y={H - 12} textAnchor="middle" fontSize="12.5" fill="#8d8d93" fontFamily="'Hanken Grotesk',sans-serif">
                {label}
              </text>
            ))}
          </svg>
        </div>
        <div className="chart-metrics">
          <div className="cm">
            <span className="cml">Approved this week</span>
            <span className="cmv">${approvedWeek.toFixed(2)}</span>
          </div>
          <div className="cm">
            <span className="cml">Peak day</span>
            <span className="cmv">${peak.toFixed(2)}</span>
          </div>
          <div className="cm">
            <span className="cml">Total payments</span>
            <span className="cmv">{payments.length}</span>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="section">
          <div className="section-head">
            <h2>Active covenants</h2>
            <Link href="/dashboard/covenants">Manage all →</Link>
          </div>
          <div className="cov-mini-grid">
            {active.length === 0 ? (
              <div className="panel-card empty">
                <div>No active covenants yet.</div>
                <Link className="btn btn-dark btn-sm" href="/new" style={{ marginTop: 10 }}>
                  Create one
                </Link>
              </div>
            ) : (
              active.slice(0, 2).map((c) => (
                <CovenantCard
                  key={c.id}
                  covenant={c}
                  priceWei={priceWei}
                  footer={
                    <>
                      <Link className="btn btn-ghost btn-sm" href={`/dashboard/console?cov=${c.covenantId}`}>
                        Assign task
                      </Link>
                      <Link className="btn btn-ghost btn-sm" href="/dashboard/covenants">
                        Details
                      </Link>
                    </>
                  }
                />
              ))
            )}
          </div>
        </div>
        <div className="section">
          <div className="section-head">
            <h2>Recent activity</h2>
            <Link href="/dashboard/audit">Full log →</Link>
          </div>
          <div className="panel-card" style={{ padding: "4px 20px" }}>
            {feed.length === 0 ? (
              <div style={{ padding: "24px 0", color: "var(--muted)", fontSize: 13.5 }}>
                No payments settled yet.
              </div>
            ) : (
              <div className="feed">
                {feed.map((e) => (
                  <a
                    key={e.transactionHash}
                    className="feed-row"
                    href={explorerTx(e.transactionHash)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className="feed-ic ok">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12.5l4.2 4.2L19 7" stroke="#2f8f5b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="feed-main">
                      <b>{e.payment!.memo || "Payment"}</b>
                      <div className="fm-sub">
                        to {shortAddr(e.payment!.recipient)} · Covenant #{e.covenantId.toString()} ·{" "}
                        {timeAgo(new Date(e.payment!.timestamp * 1000).toISOString())}
                      </div>
                    </div>
                    <div className="feed-amt">${(Number(e.payment!.usdCents) / 100).toFixed(2)}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function VaultNotDeployed() {
  return (
    <div className="page-head">
      <div className="ph-l">
        <div className="crumb">Workspace</div>
        <h1 className="display ph">CovenantVault isn&apos;t deployed yet</h1>
        <p>
          Set <code>NEXT_PUBLIC_VAULT_ADDRESS</code> after running{" "}
          <code>contracts/script/Deploy.s.sol</code> against Coston2, then reload.
        </p>
      </div>
    </div>
  );
}

function ConnectWalletPrompt() {
  return (
    <div className="page-head">
      <div className="ph-l">
        <div className="crumb">Workspace</div>
        <h1 className="display ph">Connect a wallet</h1>
        <p>Connect your wallet to see your covenants, read directly from CovenantVault on Coston2.</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="page-head">
        <div className="ph-l">
          <Skeleton style={{ width: 90, height: 12, marginBottom: 13 }} />
          <Skeleton style={{ width: 220, height: 32, marginBottom: 10, borderRadius: 10 }} />
          <Skeleton style={{ width: "min(56ch, 100%)", height: 16 }} />
        </div>
      </div>
      <div className="stats">
        {[0, 1, 2, 3].map((i) => (
          <div className="stat" key={i}>
            <Skeleton style={{ width: 38, height: 38, borderRadius: 11, marginBottom: 18 }} />
            <Skeleton style={{ width: 96, height: 26, marginBottom: 9, borderRadius: 7 }} />
            <Skeleton style={{ width: "80%", height: 13 }} />
          </div>
        ))}
      </div>
      <div className="chart-card">
        <Skeleton style={{ width: 200, height: 18, marginBottom: 8 }} />
        <Skeleton style={{ width: 280, height: 13, marginBottom: 20 }} />
        <Skeleton style={{ width: "100%", height: 200, borderRadius: 14 }} />
      </div>
      <div className="dash-grid">
        <div className="section">
          <Skeleton style={{ width: 150, height: 18, marginBottom: 16 }} />
          <div className="cov-mini-grid">
            <Skeleton style={{ width: "100%", height: 300, borderRadius: 22 }} />
          </div>
        </div>
        <div className="section">
          <Skeleton style={{ width: 130, height: 18, marginBottom: 16 }} />
          <div className="panel-card" style={{ padding: 16 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 0" }}>
                <Skeleton style={{ width: 36, height: 36, borderRadius: 10 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton style={{ width: "70%", height: 13, marginBottom: 7 }} />
                  <Skeleton style={{ width: "45%", height: 11 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
