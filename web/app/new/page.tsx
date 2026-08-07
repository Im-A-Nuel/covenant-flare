"use client";

import * as React from "react";
import Link from "next/link";
import type { Address } from "viem";
import { isAddress } from "viem";
import { CovenantMark } from "@/components/covenant-mark";
import { CovenantCard } from "@/components/covenant-card";
import { RunFlow, type RunResult } from "@/components/run-flow";
import { IconCoin, IconLimit, IconClock, IconTarget } from "@/components/icons";
import { useWallet } from "@/lib/wallet";
import { useVaultDeployed, useFtsoPrice } from "@/lib/useCovenants";
import { createCovenantAndGetId } from "@/lib/flare/vault";
import { explorerTx } from "@/lib/flare/chain";
import { hashPurpose, type DisplayCovenant } from "@/lib/covenant-view";
import { setPurposeLabel, setAgentLabel } from "@/lib/labels";
import { shortAddr } from "@/lib/utils";
import { WalletMenu } from "@/components/wallet-menu";
import { useToast } from "@/components/ui/toast";

const STEPS = [
  { title: "Build covenant", sub: "Define spending rules" },
  { title: "Assign task", sub: "Tell the agent what to do" },
  { title: "Agent at work", sub: "Real on-chain settlement" },
  { title: "Audit & proof", sub: "Review the trail" },
];

const DURATIONS: { v: string; hours: number }[] = [
  { v: "1 hour", hours: 1 },
  { v: "24 hours", hours: 24 },
  { v: "7 days", hours: 168 },
];

const DEFAULT_TASK =
  "Analyze whether ETH has short-term risk. Use paid data only if free data is insufficient. Do not exceed the covenant's per-request limit.";

const ArrowRight = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckNum = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function NewCovenantPage() {
  const { account, correctChain } = useWallet();
  const vaultDeployed = useVaultDeployed();
  const { priceWei } = useFtsoPrice();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = React.useState(0);
  const [maxStep, setMaxStep] = React.useState(0);
  const [anim, setAnim] = React.useState(true);

  const goStep = React.useCallback((n: number) => {
    setMaxStep((m) => Math.max(m, n));
    setCurrentStep(n);
    setAnim(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /* ---------- builder form state ---------- */
  const [agentLabel, setAgentLabelInput] = React.useState("Research Agent");
  const [agentAddr, setAgentAddr] = React.useState("");
  const [budget, setBudget] = React.useState("3");
  const [duration, setDuration] = React.useState("24 hours");
  const [maxPer, setMaxPer] = React.useState("0.5");
  const [recipients, setRecipients] = React.useState<string[]>([]);
  const [recipientInput, setRecipientInput] = React.useState("");
  const [purpose, setPurpose] = React.useState("research-data-purchase");

  React.useEffect(() => {
    if (account && !agentAddr) setAgentAddr(account);
  }, [account, agentAddr]);

  const budgetNum = parseFloat(budget) || 0;
  const maxNum = parseFloat(maxPer) || 0;
  const durationHours = DURATIONS.find((d) => d.v === duration)?.hours ?? 24;

  function addRecipient() {
    const addr = recipientInput.trim();
    if (!isAddress(addr, { strict: false })) {
      toast("Not a valid address", "error");
      return;
    }
    if (recipients.some((r) => r.toLowerCase() === addr.toLowerCase())) {
      toast("Already added", "error");
      return;
    }
    setRecipients((prev) => [...prev, addr]);
    setRecipientInput("");
  }
  function removeRecipient(addr: string) {
    setRecipients((prev) => prev.filter((r) => r !== addr));
  }

  const [created, setCreated] = React.useState<DisplayCovenant | null>(null);
  const [createTxHash, setCreateTxHash] = React.useState<string | null>(null);
  const [task, setTask] = React.useState(DEFAULT_TASK);
  const [runResult, setRunResult] = React.useState<RunResult | null>(null);
  const [signing, setSigning] = React.useState(false);

  async function submitCovenant() {
    if (!account) {
      toast("Connect a wallet first", "error");
      return;
    }
    if (!isAddress(agentAddr, { strict: false })) {
      toast("Agent must be a valid address", "error");
      return;
    }
    if (!recipients.length) {
      toast("Add at least one allowed recipient", "error");
      return;
    }
    if (budgetNum <= 0 || maxNum <= 0) {
      toast("Budget and max-per-request must be greater than zero", "error");
      return;
    }
    setSigning(true);
    try {
      const expiry = BigInt(Math.floor(Date.now() / 1000) + durationHours * 3600);
      const purposeHash = hashPurpose(purpose);
      const { txHash, covenantId } = await createCovenantAndGetId(account, agentAddr as Address, {
        usdBudgetTotal: BigInt(Math.round(budgetNum * 100)),
        usdMaxPerRequest: BigInt(Math.round(maxNum * 100)),
        expiry,
        allowedRecipients: recipients as Address[],
        purposeHash,
      });

      setPurposeLabel(purposeHash, purpose);
      if (agentLabel.trim()) setAgentLabel(agentAddr, agentLabel.trim());

      const covenant: DisplayCovenant = {
        id: `#${covenantId.toString()}`,
        covenantId,
        owner: account,
        agent: agentAddr as Address,
        agentLabel: agentLabel.trim() || agentAddr,
        totalBudgetUsd: budgetNum,
        remainingBudgetUsd: budgetNum,
        spentUsd: 0,
        maxPerRequestUsd: maxNum,
        expiresAt: new Date(Number(expiry) * 1000),
        allowedRecipients: recipients as Address[],
        purpose,
        purposeHash,
        status: "active",
        active: true,
      };
      setCreated(covenant);
      setCreateTxHash(txHash);
      toast(`Covenant ${covenant.id} created on-chain`);
      goStep(1);
    } catch (e) {
      toast(extractError(e), "error");
    } finally {
      setSigning(false);
    }
  }

  const previewCovenant: DisplayCovenant = created ?? {
    id: "#preview",
    covenantId: 0n,
    owner: (account ?? "0x0000000000000000000000000000000000000000") as Address,
    agent: (isAddress(agentAddr, { strict: false }) ? agentAddr : "0x0000000000000000000000000000000000000000") as Address,
    agentLabel: agentLabel || "Agent",
    totalBudgetUsd: budgetNum,
    remainingBudgetUsd: budgetNum,
    spentUsd: 0,
    maxPerRequestUsd: maxNum,
    expiresAt: new Date(Date.now() + durationHours * 3600_000),
    allowedRecipients: recipients as Address[],
    purpose: purpose || "not set",
    purposeHash: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
    status: "active",
    active: true,
  };

  const runCovenant = created ?? previewCovenant;
  const [showPreview, setShowPreview] = React.useState(false);

  const panelClass = (i: number) => `panel${currentStep === i ? " on" : ""}${currentStep === i && anim ? " anim" : ""}`;

  if (!vaultDeployed) {
    return (
      <div className="app wizard">
        <main className="main">
          <div className="page-head">
            <div className="ph-l">
              <div className="crumb">Step 1 · Covenant Builder</div>
              <h1 className="display ph">CovenantVault isn&apos;t deployed yet</h1>
              <p>
                Set <code>NEXT_PUBLIC_VAULT_ADDRESS</code> after running{" "}
                <code>contracts/script/Deploy.s.sol</code> against Coston2, then reload this page.
              </p>
              <Link className="btn btn-dark" href="/" style={{ marginTop: 16 }}>
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app wizard">
      {/* ============ SIDEBAR ============ */}
      <aside className="side">
        <Link className="brand" href="/">
          <CovenantMark size={28} className="mark" />
          Covenant
        </Link>
        <div className="side-label">Set up your agent</div>
        <ul className="steps">
          {STEPS.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            const unlocked = i <= maxStep || i === 0;
            const locked = !unlocked;
            return (
              <li
                key={i}
                className={`step${active ? " active" : ""}${done ? " done" : ""}${locked ? " locked" : ""}`}
                style={{ cursor: unlocked ? "pointer" : "default" }}
                onClick={() => {
                  if (unlocked) goStep(i);
                }}
              >
                <span className="num">{done ? CheckNum : i + 1}</span>
                <span className="stitle">
                  {s.title}
                  <small>{s.sub}</small>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="side-foot">
          <WalletMenu variant="chip" />
          <Link className="back-home" href="/">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to home
          </Link>
        </div>
      </aside>

      {/* ============ MAIN ============ */}
      <main className="main">
        {/* ---------- STEP 1: BUILDER ---------- */}
        <section className={panelClass(0)}>
          <div className="page-head">
            <div className="ph-l">
              <div className="crumb">Step 1 · Covenant Builder</div>
              <h1 className="display ph">Define what your <i>a</i>gent can spend</h1>
              <p>
                Set the budget, time window, per-request ceiling and allowed recipients. This is a
                real transaction on Coston2 -- the policy is enforced by CovenantVault, not this UI.
              </p>
            </div>
          </div>

          <div className="builder">
            <div className="form-card">
              <div className="fg">
                <label>Agent nickname <span className="hint">local label only, not stored on-chain</span></label>
                <input className="input" value={agentLabel} onChange={(e) => setAgentLabelInput(e.target.value)} />
              </div>
              <div className="fg">
                <label>Agent address <span className="hint">only this address can call pay()</span></label>
                <input className="input mono" value={agentAddr} onChange={(e) => setAgentAddr(e.target.value)} placeholder="0x..." />
              </div>
              <div className="two">
                <div className="fg">
                  <label>Token</label>
                  <input className="input" value="FXRP" readOnly />
                </div>
                <div className="fg">
                  <label>Total budget</label>
                  <div className="amount">
                    <input className="input" type="number" value={budget} min="0" step="0.25" onChange={(e) => setBudget(e.target.value)} />
                    <span className="unit">USD</span>
                  </div>
                </div>
              </div>
              <div className="fg">
                <label>Duration <span className="hint">how long the covenant stays active</span></label>
                <div className="seg">
                  {DURATIONS.map((d) => (
                    <button key={d.v} className={duration === d.v ? "on" : ""} onClick={() => setDuration(d.v)}>
                      {d.v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fg">
                <label>Max payment per request</label>
                <div className="amount">
                  <input className="input" type="number" value={maxPer} min="0" step="0.05" onChange={(e) => setMaxPer(e.target.value)} />
                  <span className="unit">USD</span>
                </div>
              </div>
              <div className="fg">
                <label>Allowed recipients <span className="hint">addresses the agent can pay</span></label>
                <div className="two">
                  <input
                    className="input mono"
                    value={recipientInput}
                    placeholder="0x..."
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addRecipient()}
                  />
                  <button className="btn btn-ghost" onClick={addRecipient} type="button">
                    Add
                  </button>
                </div>
                {recipients.length > 0 && (
                  <div className="chips" style={{ marginTop: 10, justifyContent: "flex-start" }}>
                    {recipients.map((r) => (
                      <button key={r} className="chip chip-removable mono" onClick={() => removeRecipient(r)} title={`${r} -- click to remove`}>
                        {shortAddr(r)} ✕
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="fg">
                <label>Purpose <span className="hint">local label, hashed on-chain</span></label>
                <input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
              </div>

              <div className="form-actions">
                <button className="btn btn-dark" onClick={submitCovenant} disabled={signing || !correctChain}>
                  {signing ? "Confirming…" : "Create covenant"}
                  {ArrowRight}
                </button>
                <span className="note">
                  Calls CovenantVault.createCovenant() on Coston2. Budget and expiry are enforced
                  on-chain. Your FXRP stays in the vault until an agent pays out of it.
                </span>
              </div>
            </div>

            <div className="preview">
              <div className="pv-label">Live preview</div>
              <CovenantCard covenant={previewCovenant} priceWei={priceWei} dim={false} />
            </div>

            <button type="button" className="preview-fab" aria-label="Live preview" onClick={() => setShowPreview(true)}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2.6" stroke="#fff" strokeWidth="1.7" />
              </svg>
              <span>Live preview</span>
            </button>
            {showPreview && (
              <div className="preview-modal" onClick={() => setShowPreview(false)}>
                <div className="preview-sheet" onClick={(e) => e.stopPropagation()}>
                  <div className="preview-sheet-head">
                    <span className="pv-label" style={{ margin: 0 }}>Live preview</span>
                    <button type="button" className="preview-close" aria-label="Close" onClick={() => setShowPreview(false)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <CovenantCard covenant={previewCovenant} priceWei={priceWei} dim={false} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ---------- STEP 2: TASK CONSOLE ---------- */}
        <section className={panelClass(1)}>
          <div className="page-head">
            <div className="ph-l">
              <div className="crumb">Step 2 · Task Console</div>
              <h1 className="display ph">Give your <i>a</i>gent a task</h1>
              <p>Describe the job in plain language. The agent plans, then pays inside the covenant if it needs to.</p>
            </div>
          </div>

          <div className="console">
            <div className="task-card">
              <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: 10 }}>
                Task for {runCovenant.agentLabel}
              </label>
              <textarea className="ta" value={task} onChange={(e) => setTask(e.target.value)} />
              <div className="examples">
                {["Summarize today's ETH sentiment", "Compare BTC vs ETH volatility", "Check gas trends this week"].map((ex) => (
                  <button key={ex} className="ex" onClick={() => setTask(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
              <div className="form-actions">
                <button className="btn btn-dark" onClick={() => { setRunResult(null); goStep(2); }}>
                  Run agent
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M6 4l13 8-13 8V4z" fill="#fff" /></svg>
                </button>
                <button className="btn btn-ghost" onClick={() => goStep(0)}>
                  Edit covenant
                </button>
              </div>
            </div>

            <aside className="guard">
              <h4>Active covenant</h4>
              <div className="grow"><span className="gi"><IconCoin /></span> Budget<span className="gv">${runCovenant.totalBudgetUsd.toFixed(2)}</span></div>
              <div className="grow"><span className="gi"><IconLimit /></span> Max / request<span className="gv">${runCovenant.maxPerRequestUsd.toFixed(2)}</span></div>
              <div className="grow"><span className="gi"><IconClock /></span> Window<span className="gv">{duration}</span></div>
              <div className="grow"><span className="gi"><IconTarget /></span> Purpose<span className="gv" style={{ fontSize: "12.5px" }}>{runCovenant.purpose}</span></div>
            </aside>
          </div>
        </section>

        {/* ---------- STEP 3: RUN ---------- */}
        <section className={panelClass(2)}>
          <div className="page-head">
            <div className="ph-l">
              <div className="crumb">Step 3 · Agent at work</div>
              <h1 className="display ph">Working <i>w</i>ithin the covenant</h1>
              <p>The agent plans, hits a paid endpoint, and CovenantVault checks the payment on-chain before a single FXRP moves.</p>
            </div>
          </div>
          <div className="run">
            {currentStep === 2 && <RunFlow covenant={runCovenant} task={task} priceWei={priceWei} onDone={(r) => setRunResult(r)} />}
            {runResult && (
              <div className="run-actions in">
                <button className="btn btn-dark" onClick={() => goStep(3)}>
                  View audit &amp; proof
                  {ArrowRight}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ---------- STEP 4: AUDIT ---------- */}
        <section className={panelClass(3)}>
          <div className="page-head">
            <div className="ph-l">
              <div className="crumb">Step 4 · Audit &amp; proof</div>
              <h1 className="display ph">Every move, <i>a</i>ccounted for</h1>
              <p>One real transaction, fully explained: outcome, cost, permission used and on-chain proof.</p>
            </div>
          </div>

          <div className="audit-wrap">
            <div>
              <div className="report">
                <div className="rep-h">
                  <span className={`ri ${runResult?.blocked ? "red" : "green"}`} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {runResult?.blocked ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M17 7L7 17" stroke="#cf4b3e" strokeWidth="2.4" strokeLinecap="round" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#2f8f5b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </span>
                  <h3>{runResult?.blocked ? "Payment reverted" : "Task complete"}</h3>
                  <span className={`pill ${runResult?.blocked ? "blocked" : "active"}`} style={{ marginLeft: "auto" }}>
                    {runResult?.blocked ? "Reverted" : "Settled"}
                  </span>
                </div>
                {runResult?.blocked ? (
                  <p className="verdict display">
                    CovenantVault <b>reverted</b> the transaction: {runResult.blockReason}. No FXRP moved.
                  </p>
                ) : runResult?.report ? (
                  <div className="verdict-report">{runResult.report}</div>
                ) : (
                  <p className="verdict display">Task in progress…</p>
                )}
                <div className="kv">
                  <span className="k">Task</span>
                  <span className="v">{task.length > 80 ? task.slice(0, 80) + "…" : task}</span>
                  <span className="k">Payment</span>
                  <span className="v">{runResult?.blocked ? "$0.00 (reverted)" : `$${(runResult?.priceUsd ?? 0).toFixed(2)}`}</span>
                  <span className="k">Permission used</span>
                  <span className="v">Covenant {runCovenant.id}</span>
                  <span className="k">Recipient</span>
                  <span className="v mono">{runResult?.recipient ?? "—"}</span>
                  <span className="k">Tx hash</span>
                  <span className="v mono">
                    {runResult?.txHash ? (
                      <a href={explorerTx(runResult.txHash)} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                        {runResult.txHash.slice(0, 10)}…
                      </a>
                    ) : (
                      "none"
                    )}
                  </span>
                  <span className="k">Remaining budget</span>
                  <span className="v">${(runResult?.remainingUsd ?? runCovenant.totalBudgetUsd).toFixed(2)}</span>
                </div>
              </div>
              <div className="audit-actions">
                <Link className="btn btn-dark" href="/dashboard">
                  Go to dashboard
                  {ArrowRight}
                </Link>
                <button className="btn btn-ghost" onClick={() => { setRunResult(null); goStep(1); }}>
                  Run another task
                </button>
              </div>
            </div>

            <aside className="timeline">
              <h4>Audit trail</h4>
              <ul className="tl">
                {createTxHash && (
                  <li>
                    <b>Covenant created</b>
                    <small>
                      <a href={explorerTx(createTxHash)} target="_blank" rel="noreferrer">
                        {createTxHash.slice(0, 10)}…
                      </a>
                    </small>
                  </li>
                )}
                <li><b>Task received</b><small>&quot;{task.length > 60 ? task.slice(0, 60) + "…" : task}&quot;</small></li>
                <li><b>402 Payment Required</b><small>market-api.demo</small></li>
                {runResult?.blocked ? (
                  <li><b>Reverted on-chain</b><small>{runResult.blockReason}</small></li>
                ) : (
                  <li>
                    <b>Settled on-chain</b>
                    <small>
                      {runResult?.txHash && (
                        <a href={explorerTx(runResult.txHash)} target="_blank" rel="noreferrer">
                          {runResult.txHash.slice(0, 10)}…
                        </a>
                      )}
                    </small>
                  </li>
                )}
              </ul>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

function extractError(err: unknown): string {
  const e = err as { shortMessage?: string; message?: string; cause?: { reason?: string; shortMessage?: string } };
  return e.cause?.reason || e.shortMessage || e.cause?.shortMessage || e.message || "Transaction failed";
}
