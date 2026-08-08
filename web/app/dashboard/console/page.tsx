"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { useCovenants, useFtsoPrice, useVaultDeployed } from "@/lib/useCovenants";
import { RunFlow, type RunResult } from "@/components/run-flow";
import { IconCoin, IconLimit, IconClock, IconTarget, IconCheck } from "@/components/icons";
import { expiryLabel, type DisplayCovenant } from "@/lib/covenant-view";
import { shortAddr } from "@/lib/utils";

const DEFAULT_TASK =
  "Analyze whether ETH has short-term risk. Use paid data only if free data is insufficient. Do not spend more than the covenant's per-request limit.";

const EXAMPLES = ["Summarize today's ETH sentiment", "Compare BTC vs ETH volatility", "Check gas trends this week"];

function ConsolePage() {
  const searchParams = useSearchParams();
  const { account, connect, connecting } = useWallet();
  const vaultDeployed = useVaultDeployed();
  const { covenants } = useCovenants(account);
  const { priceWei } = useFtsoPrice();

  const active = React.useMemo(() => covenants.filter((c) => c.status === "active"), [covenants]);

  const pre = searchParams.get("cov");
  const [selId, setSelId] = React.useState<string | null>(null);

  const sel: DisplayCovenant | undefined = React.useMemo(() => {
    if (selId) return active.find((c) => c.id === selId) ?? active[0];
    if (pre) {
      const match = active.find((c) => c.covenantId.toString() === pre);
      if (match) return match;
    }
    return active[0];
  }, [active, selId, pre]);

  const [task, setTask] = React.useState(DEFAULT_TASK);
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [result, setResult] = React.useState<RunResult | null>(null);
  const [actionsIn, setActionsIn] = React.useState(false);

  const run = () => {
    if (!sel) return;
    setRunning(true);
    setDone(false);
    setResult(null);
    setActionsIn(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setRunning(false);
    setDone(false);
    setActionsIn(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDone = (r: RunResult) => {
    setResult(r);
    setDone(true);
  };

  React.useEffect(() => {
    if (!done) return;
    const id = requestAnimationFrame(() => setActionsIn(true));
    return () => cancelAnimationFrame(id);
  }, [done]);

  if (!vaultDeployed) {
    return (
      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Run</div>
          <h1 className="display ph">Task Console</h1>
          <p>
            CovenantVault isn&apos;t deployed yet. Set <code>NEXT_PUBLIC_VAULT_ADDRESS</code> after
            deploying, then reload.
          </p>
        </div>
      </div>
    );
  }
  if (!account) {
    return (
      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Run</div>
          <h1 className="display ph">Task Console</h1>
          <p>Connect your wallet to pick a covenant and run a task.</p>
          <button className="connect-cta" onClick={() => void connect()} disabled={connecting}>
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Run</div>
          <h1 className="display ph">Task Console</h1>
          <p>
            Pick an active covenant, describe the job, and watch the agent plan, hit a paid endpoint,
            and settle for real on-chain -- or get reverted by policy.
          </p>
        </div>
      </div>

      {!running && (
        <div className="console">
          <div className="task-card">
            <label className="label">Covenant</label>
            {active.length === 0 ? (
              <div className="panel-card empty" style={{ padding: 20 }}>
                <div>No active covenants yet.</div>
                <Link className="btn btn-dark btn-sm" href="/new" style={{ marginTop: 10 }}>
                  Create one
                </Link>
              </div>
            ) : (
              <div className="cov-select">
                {active.map((c) => (
                  <button key={c.id} className={`cov-opt ${c === sel ? "sel" : ""}`} onClick={() => setSelId(c.id)}>
                    <span className="av" style={{ background: "#2775ca" }}>
                      {c.agentLabel.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="co-meta">
                      <b>{c.agentLabel}</b>
                      <small>
                        Covenant {c.id} · {c.purpose}
                      </small>
                    </span>
                    <span className="co-bal">
                      ${c.remainingBudgetUsd.toFixed(2)}
                      <small>of ${c.totalBudgetUsd.toFixed(2)}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <label className="label">Task</label>
            <textarea className="ta" value={task} onChange={(e) => setTask(e.target.value)} />
            <div className="examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} className="ex" onClick={() => setTask(ex)}>
                  {ex}
                </button>
              ))}
            </div>
            <div className="form-actions">
              <button className="btn btn-dark" onClick={run} disabled={!sel}>
                Run agent
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M6 4l13 8-13 8V4z" fill="#fff" />
                </svg>
              </button>
              <span className="muted" style={{ fontSize: "12.5px" }}>
                Settlement is a real CovenantVault.pay() call. It either succeeds on-chain or reverts.
              </span>
            </div>
          </div>

          <aside className="guard">
            {sel && (
              <>
                <h4>Active covenant · {sel.id}</h4>
                <div className="grow"><span className="gi"><IconCoin /></span> Budget left<span className="gv">${sel.remainingBudgetUsd.toFixed(2)}</span></div>
                <div className="grow"><span className="gi"><IconLimit /></span> Max / request<span className="gv">${sel.maxPerRequestUsd.toFixed(2)}</span></div>
                <div className="grow"><span className="gi"><IconClock /></span> Window<span className="gv">{expiryLabel(sel.expiresAt)}</span></div>
                <div className="grow"><span className="gi"><IconTarget /></span> Purpose<span className="gv" style={{ fontSize: "12px" }}>{sel.purpose}</span></div>
                <div className="grow">
                  <span className="gi"><IconCheck /></span> Allowed
                  <span className="gv" style={{ fontSize: "12px" }}>
                    {sel.allowedRecipients.length ? sel.allowedRecipients.map((r) => shortAddr(r)).join(", ") : "none set"}
                  </span>
                </div>
                {account.toLowerCase() !== sel.agent.toLowerCase() && (
                  <div className="grow" style={{ fontSize: 11.5, color: "var(--warn)", marginTop: 8 }}>
                    Connected wallet is not this covenant&apos;s agent -- pay() will revert with &quot;not covenant agent&quot;.
                  </div>
                )}
              </>
            )}
          </aside>
        </div>
      )}

      {running && sel && (
        <div className="run">
          <RunFlow covenant={sel} task={task} priceWei={priceWei} onDone={handleDone} />
          {done && result && (
            <div className={`rcard ${actionsIn ? "in" : ""}`}>
              <div className="rhead">
                <span className={`ri ${result.blocked ? "red" : "green"}`}>
                  {result.blocked ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <div>
                  <h3>{result.blocked ? "Payment blocked" : "Task complete"}</h3>
                  <div className="rsub">{result.blocked ? result.blockReason : `Remaining budget $${result.remainingUsd.toFixed(2)}`}</div>
                </div>
              </div>
              {result.report && <div className="verdict-report">{result.report}</div>}
            </div>
          )}
          {done && (
            <div className={`run-actions ${actionsIn ? "in" : ""}`}>
              <Link className="btn btn-dark" href="/dashboard/audit">
                View in audit log
              </Link>
              <button className="btn btn-ghost" onClick={reset}>
                Run another task
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ConsolePage />
    </Suspense>
  );
}
