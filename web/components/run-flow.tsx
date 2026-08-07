"use client";

import * as React from "react";
import type { DisplayCovenant } from "@/lib/covenant-view";
import { useWallet } from "@/lib/wallet";
import { planTask } from "@/lib/venice";
import { requestPaidData, settleAndDeliver } from "@/lib/x402";
import { generateReport } from "@/lib/venice";
import { payFromCovenant } from "@/lib/flare/vault";
import { usdCentsToFxrp, formatFxrp } from "@/lib/flare/ftso";
import { explorerTx } from "@/lib/flare/chain";
import { shortAddr } from "@/lib/utils";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RunResult {
  priceUsd: number;
  remainingUsd: number;
  service: string;
  recipient?: string;
  txHash?: string;
  report?: string;
  blocked?: boolean;
  blockReason?: string;
}

type Stage = "plan" | "x402" | "policy" | "settle" | "done";

interface PlanState {
  steps: string[];
  revealed: number;
  status: "amber" | "green";
  statusText: string;
  source: string;
  mode: "real" | "mock";
}

function planSource(meta?: { model: string; mode: string }): { source: string; mode: "real" | "mock" } {
  if (!meta || meta.mode !== "real") return { source: "fallback planner", mode: "mock" };
  if (/claude/i.test(meta.model)) return { source: "Claude", mode: "real" };
  if (/llama|venice/i.test(meta.model)) return { source: "Venice AI", mode: "real" };
  return { source: meta.model, mode: "real" };
}

interface X402State {
  service: string;
  resource: string;
  priceUsd: number;
  payTo: string;
}

interface Check {
  label: string;
  detail: string;
  ok: boolean;
}

interface PolicyState {
  checks: Check[];
  revealed: number;
  status: "amber" | "green" | "red";
  statusText: string;
  showDecision: boolean;
  wouldApprove: boolean;
}

interface SettleState {
  status: "amber" | "green" | "red";
  statusText: string;
  done: boolean;
  ok: boolean;
  priceUsd: number;
  amountFXRP: bigint;
  recipient: string;
  txHash?: string;
  reason?: string;
}

const REFERENCE_PLAN = (cov: DisplayCovenant, service: string): string[] => [
  "Check free market data first",
  `If insufficient, request paid data from ${service}`,
  `Verify price is under the $${cov.maxPerRequestUsd.toFixed(2)} per-request limit`,
  "Summarize findings into a clear answer",
];

const checkSvg = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.2 4.2L19 7" stroke="#2f8f5b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const crossSvg = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10M17 7L7 17" stroke="#cf4b3e" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);
const approveIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const blockIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10M17 7L7 17" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

function DecisionCard({ wouldApprove, show }: { wouldApprove: boolean; show: boolean }) {
  return (
    <div className={`decision ${wouldApprove ? "" : "blocked"}`} style={{ display: show ? "flex" : "none" }}>
      <span className="di">{wouldApprove ? approveIcon : blockIcon}</span>
      <div>
        <b>{wouldApprove ? "Preview: would approve" : "Preview: would block"}</b>
        <div className="dsub">
          {wouldApprove
            ? "All checks pass against current covenant state. Submitting the real on-chain payment next."
            : "A covenant rule would fail. Submitting anyway -- the contract's revert is the real proof."}
        </div>
      </div>
    </div>
  );
}

/** Real on-chain price/recipient/budget checks, mirroring PolicyLib exactly.
 * This is a client-side PREVIEW for the animated checklist -- the actual
 * enforcement happens inside CovenantVault.pay() a moment later. */
function previewChecks(cov: DisplayCovenant, recipient: string, priceUsd: number): Check[] {
  const recipientOk = cov.allowedRecipients.some((r) => r.toLowerCase() === recipient.toLowerCase());
  const perRequestOk = priceUsd <= cov.maxPerRequestUsd;
  const budgetOk = cov.spentUsd + priceUsd <= cov.totalBudgetUsd;
  const notExpired = Date.now() < cov.expiresAt.getTime();
  return [
    { label: "Recipient allowed", detail: recipientOk ? shortAddr(recipient) : `${shortAddr(recipient)} not in allowedRecipients`, ok: recipientOk },
    { label: "Under max-per-request", detail: `$${priceUsd.toFixed(2)} ${perRequestOk ? "≤" : ">"} $${cov.maxPerRequestUsd.toFixed(2)}`, ok: perRequestOk },
    { label: "Within total budget", detail: `$${(cov.spentUsd + priceUsd).toFixed(2)} ${budgetOk ? "≤" : ">"} $${cov.totalBudgetUsd.toFixed(2)}`, ok: budgetOk },
    { label: "Covenant not expired", detail: notExpired ? "within window" : "expired", ok: notExpired },
  ];
}

export function RunFlow({
  covenant,
  task,
  priceWei,
  onDone,
}: {
  covenant: DisplayCovenant;
  task: string;
  priceWei?: bigint;
  onDone?: (r: RunResult) => void;
}) {
  const { account } = useWallet();

  const [plan, setPlan] = React.useState<PlanState | null>(null);
  const [x402, setX402] = React.useState<X402State | null>(null);
  const [policy, setPolicy] = React.useState<PolicyState | null>(null);
  const [settle, setSettle] = React.useState<SettleState | null>(null);

  const planCardRef = React.useRef<HTMLDivElement>(null);
  const x402CardRef = React.useRef<HTMLDivElement>(null);
  const policyCardRef = React.useRef<HTMLDivElement>(null);
  const settleCardRef = React.useRef<HTMLDivElement>(null);
  useRevealOnMount(planCardRef, plan != null);
  useRevealOnMount(x402CardRef, x402 != null);
  useRevealOnMount(policyCardRef, policy != null);
  useRevealOnMount(settleCardRef, settle != null);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      const cov = covenant;
      const recipient = cov.allowedRecipients[0];

      // ---------- 1. PLAN ----------
      const fallbackService = "market-api.demo";
      let planSteps = REFERENCE_PLAN(cov, fallbackService);
      let planMeta: Awaited<ReturnType<typeof planTask>> | null = null;
      try {
        planMeta = await planTask(task, { maxPerRequestUsd: cov.maxPerRequestUsd, purpose: cov.purpose });
        if (planMeta.plan.steps?.length) planSteps = planMeta.plan.steps;
      } catch {
        /* keep reference steps */
      }
      if (!alive) return;
      const src = planSource(planMeta?.meta);
      setPlan({ steps: planSteps, revealed: 0, status: "amber", statusText: "Planning", source: src.source, mode: src.mode });
      await sleep(450);
      for (let i = 0; i < planSteps.length; i++) {
        if (!alive) return;
        setPlan((p) => (p ? { ...p, revealed: i + 1 } : p));
        await sleep(340);
      }
      if (!alive) return;
      setPlan((p) => (p ? { ...p, status: "green", statusText: "Planned" } : p));
      await sleep(360);

      // ---------- 2. 402 (narrative -- quotes a price, real settlement targets the covenant's own recipient) ----------
      let priceUsd = 0.25;
      let service = fallbackService;
      let resource = "ETH sentiment report";
      let endpoint: string | undefined;
      try {
        const res = await requestPaidData();
        if (res.status === "paywall") {
          priceUsd = res.payment.priceUsd;
          service = res.payment.service;
          resource = res.payment.resource;
          endpoint = res.endpoint;
        }
      } catch {
        /* keep reference values */
      }
      if (!alive) return;
      if (!recipient) {
        // No allowed recipient on this covenant -- nothing to pay. Stop here honestly.
        setStage2Done();
        if (alive) onDone?.({ priceUsd: 0, remainingUsd: cov.remainingBudgetUsd, service, blocked: true, blockReason: "Covenant has no allowedRecipients" });
        return;
      }
      setX402({ service, resource, priceUsd, payTo: recipient });
      await sleep(700);

      // ---------- 3. POLICY PREVIEW ----------
      const checks = previewChecks(cov, recipient, priceUsd);
      const wouldApprove = checks.every((c) => c.ok);
      if (!alive) return;
      setPolicy({ checks, revealed: 0, status: "amber", statusText: "Checking", showDecision: false, wouldApprove });
      await sleep(400);
      for (let i = 0; i < checks.length; i++) {
        if (!alive) return;
        setPolicy((p) => (p ? { ...p, revealed: i + 1 } : p));
        await sleep(300);
      }
      if (!alive) return;
      setPolicy((p) => (p ? { ...p, status: wouldApprove ? "green" : "red", statusText: wouldApprove ? "Preview passed" : "Preview failed", showDecision: true } : p));
      await sleep(500);

      // ---------- 4. SETTLE (always attempt the real tx -- the contract's outcome is the truth) ----------
      const amountFXRP = priceWei ? usdCentsToFxrp(BigInt(Math.round(priceUsd * 100)), priceWei) : 0n;
      setSettle({ status: "amber", statusText: "Sending…", done: false, ok: false, priceUsd, amountFXRP, recipient });

      let txHash: string | undefined;
      let ok = false;
      let reason: string | undefined;
      if (!account) {
        reason = "No wallet connected -- connect the agent's wallet to settle for real.";
      } else {
        try {
          txHash = await payFromCovenant(account, cov.covenantId, recipient as `0x${string}`, amountFXRP, task.slice(0, 60));
          ok = true;
        } catch (e) {
          reason = extractRevertReason(e);
        }
      }
      if (!alive) return;
      setSettle((s) => (s ? { ...s, status: ok ? "green" : "red", statusText: ok ? "Settled" : "Reverted", done: true, ok, txHash, reason } : s));

      let delivery: Awaited<ReturnType<typeof settleAndDeliver>> | null = null;
      if (ok && endpoint && txHash) {
        try {
          delivery = await settleAndDeliver(endpoint, txHash);
        } catch {
          /* optional */
        }
      }

      let report: string | undefined;
      if (ok) {
        try {
          const paidData = delivery?.resource ? JSON.stringify(delivery.resource) : null;
          const r = await generateReport(task, paidData, { agentLabel: cov.agentLabel });
          report = r.report;
        } catch {
          /* optional */
        }
      }
      if (!alive) return;

      const remainingUsd = ok ? Math.max(0, cov.remainingBudgetUsd - priceUsd) : cov.remainingBudgetUsd;
      onDone?.({ priceUsd, remainingUsd, service, recipient, txHash, report, blocked: !ok, blockReason: reason });
    })();

    function setStage2Done() {
      setPolicy(null);
    }

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {plan && (
        <div className="rcard" ref={planCardRef}>
          <div className="rhead">
            <span className="ri blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="#2775ca" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3" stroke="#2775ca" strokeWidth="1.7" />
              </svg>
            </span>
            <div>
              <h3>{covenant.agentLabel} · plan</h3>
              <div className="rsub">
                Generated by {plan.source} <span className={`settle-badge ${plan.mode === "real" ? "real" : "sim"}`}>{plan.mode}</span>
              </div>
            </div>
            <span className={`rstat pstat ${plan.status}`}>{plan.statusText}</span>
          </div>
          <ul className="plan">
            {plan.steps.map((step, i) => (
              <li key={i} className={i < plan.revealed ? "in" : ""}>
                <span className="pn">{i + 1}</span> {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {x402 && (
        <div className="rcard" ref={x402CardRef}>
          <div className="rhead">
            <span className="ri amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="6" width="18" height="12" rx="2" stroke="#b08900" strokeWidth="1.7" />
                <path d="M3 10h18" stroke="#b08900" strokeWidth="1.7" />
              </svg>
            </span>
            <div>
              <h3>402 Payment Required</h3>
              <div className="rsub">Free data insufficient · paid resource needed</div>
            </div>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "#b08900" }}>HTTP 402</span>
          </div>
          <div className="x402">
            <div className="xrow"><span className="k">Service</span><span className="v">{x402.service}</span></div>
            <div className="xrow"><span className="k">Resource</span><span className="v">{x402.resource}</span></div>
            <div className="xrow"><span className="k">Price</span><span className="v">${x402.priceUsd.toFixed(2)}</span></div>
            <div className="xrow"><span className="k">Pay to (covenant recipient)</span><span className="v mono">{shortAddr(x402.payTo)}</span></div>
          </div>
        </div>
      )}

      {policy && (
        <div className="rcard" ref={policyCardRef}>
          <div className="rhead">
            <span className="ri grey">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="#0c0c0d" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h3>Policy preview</h3>
              <div className="rsub">Against Covenant {covenant.id} · confirmed on-chain next</div>
            </div>
            <span className={`rstat pstat ${policy.status}`}>{policy.statusText}</span>
          </div>
          <ul className="checks">
            {policy.checks.map((c, i) => {
              const evaluated = i < policy.revealed;
              const cls = evaluated ? (c.ok ? "ok" : "fail") : "";
              return (
                <li key={i} className={cls}>
                  <span className="ck">{evaluated ? (c.ok ? checkSvg : crossSvg) : <span className="spin" />}</span>
                  {c.label}
                  <span className="cv">{c.detail}</span>
                </li>
              );
            })}
          </ul>
          <DecisionCard wouldApprove={policy.wouldApprove} show={policy.showDecision} />
        </div>
      )}

      {settle && (
        <div className="rcard" ref={settleCardRef}>
          <div className="rhead">
            <span className={`ri ${settle.ok ? "green" : settle.done ? "red" : "green"}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                {settle.done && settle.ok && <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
            </span>
            <div>
              <h3>CovenantVault.pay()</h3>
              <div className="rsub">Real on-chain call · Coston2</div>
            </div>
            <span className={`rstat pstat ${settle.status}`}>{settle.statusText}</span>
          </div>
          {!settle.done ? (
            <div className="pay-line">
              <span className="ck" style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="spin" />
              </span>{" "}
              Sending {formatFxrp(settle.amountFXRP)} FXRP (${settle.priceUsd.toFixed(2)}) to {shortAddr(settle.recipient)}
            </div>
          ) : settle.ok ? (
            <div className="pay-line">
              <span className="ck ok" style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(47,143,91,.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>{checkSvg}</span>{" "}
              Sent {formatFxrp(settle.amountFXRP)} FXRP · tx{" "}
              {settle.txHash && (
                <a className="mono" href={explorerTx(settle.txHash)} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: "var(--accent)" }}>
                  {shortAddr(settle.txHash, 6)}
                </a>
              )}
              <span className="settle-badge real">on-chain · verified</span>
            </div>
          ) : (
            <div className="pay-line">
              <span className="ck" style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(207,75,62,.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>{crossSvg}</span>{" "}
              Reverted: {settle.reason || "transaction failed"}
              <span className="settle-badge sim">no funds moved</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** Best-effort extraction of a readable revert reason from a viem contract-call error. */
function extractRevertReason(err: unknown): string {
  const e = err as { shortMessage?: string; message?: string; cause?: { reason?: string; shortMessage?: string } };
  return e.cause?.reason || e.shortMessage || e.cause?.shortMessage || e.message || "unknown error";
}

function useRevealOnMount(ref: React.RefObject<HTMLDivElement | null>, present: boolean) {
  React.useEffect(() => {
    if (!present) return;
    const el = ref.current;
    if (!el) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
    return () => cancelAnimationFrame(id);
  }, [ref, present]);
}
