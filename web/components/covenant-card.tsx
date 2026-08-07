import * as React from "react";
import type { DisplayCovenant } from "@/lib/covenant-view";
import { expiryLabel } from "@/lib/covenant-view";
import { formatDualDenomination } from "@/lib/flare/ftso";
import { shortAddr } from "@/lib/utils";
import { CovenantMark } from "@/components/covenant-mark";

const STATUS_LABEL: Record<DisplayCovenant["status"], string> = {
  active: "Active",
  depleted: "Budget depleted",
  expired: "Expired",
  inactive: "Inactive",
};

const GRADS = ["cg-blue", "cg-mint", "cg-peach", "cg-lilac", "cg-sky"] as const;
function gradClass(c: DisplayCovenant): string {
  const key = `${c.id}${c.agent}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return GRADS[h % GRADS.length];
}

export function CovenantCard({
  covenant,
  priceWei,
  footer,
  dim,
}: {
  covenant: DisplayCovenant;
  /** Live XRP/USD price (18-decimal wei) for the dual-denomination line. Omit while it's still loading. */
  priceWei?: bigint;
  footer?: React.ReactNode;
  dim?: boolean;
}) {
  const c = covenant;
  const isActive = c.status === "active";
  const isDim = dim ?? !isActive;
  const pct = c.totalBudgetUsd ? Math.round((c.remainingBudgetUsd / c.totalBudgetUsd) * 100) : 0;
  const barClass = c.status === "depleted" ? "warn" : isActive ? "" : "flat";
  const remainingCents = BigInt(Math.round(c.remainingBudgetUsd * 100));
  const shownRecipients = c.allowedRecipients.slice(0, 3);
  const extraRecipients = c.allowedRecipients.length - shownRecipients.length;

  return (
    <div className={`cov-card${isDim ? " dim" : ""}`}>
      <div className={`cov-top ${gradClass(c)}`}>
        <div className="cov-top-row">
          <div className="cov-id">
            <CovenantMark size={15} /> Covenant&nbsp;{c.id}
          </div>
          <span className={`pill ${c.status} ${isActive ? "dot" : ""}`}>
            {STATUS_LABEL[c.status]}
          </span>
        </div>
        <p className="cov-agent">
          {c.agentLabel}
          <small>{c.purpose}</small>
        </p>
      </div>
      <div className="cov-body">
        <div className="budget">
          <div className="budget-top">
            <span className="muted">Budget</span>
            <b>
              ${c.remainingBudgetUsd.toFixed(2)} / ${c.totalBudgetUsd.toFixed(2)}
            </b>
          </div>
          <div className="bar">
            <i className={barClass} style={{ width: `${pct}%` }} />
          </div>
          {priceWei != null && (
            <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
              {formatDualDenomination(remainingCents, priceWei)} remaining
            </div>
          )}
        </div>
        <div className="crow">
          <span className="k">Max / request</span>
          <span className="v">${c.maxPerRequestUsd.toFixed(2)}</span>
        </div>
        <div className="crow">
          <span className="k">Window</span>
          <span className="v">{expiryLabel(c.expiresAt)}</span>
        </div>
        <div className="crow">
          <span className="k">Allowed</span>
          <span className="chips">
            {shownRecipients.map((r) => (
              <span className="chip mono" key={r}>
                {shortAddr(r)}
              </span>
            ))}
            {extraRecipients > 0 && <span className="chip">+{extraRecipients} more</span>}
            {c.allowedRecipients.length === 0 && <span className="chip">none set</span>}
          </span>
        </div>
      </div>
      {footer != null && <div className="cov-foot">{footer}</div>}
    </div>
  );
}
