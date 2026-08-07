import { keccak256, toBytes, type Address, type Hex } from "viem";
import type { Covenant as ChainCovenant } from "@/lib/flare/vault";
import { getPurposeLabel, getAgentLabel } from "@/lib/labels";
import { shortAddr } from "@/lib/utils";

export type CovenantStatus = "active" | "expired" | "depleted" | "inactive";

/** UI-shaped view of an on-chain covenant. Dollars, not cents; a status
 * derived client-side from the raw contract fields, never stored on-chain. */
export interface DisplayCovenant {
  id: string; // "#0", "#1" ...
  covenantId: bigint;
  owner: Address;
  agent: Address;
  agentLabel: string; // local nickname or short address
  totalBudgetUsd: number;
  remainingBudgetUsd: number;
  spentUsd: number;
  maxPerRequestUsd: number;
  expiresAt: Date;
  allowedRecipients: Address[];
  purpose: string; // local label if known, else "purpose #<hash prefix>"
  purposeHash: Hex;
  status: CovenantStatus;
  active: boolean;
}

export function hashPurpose(purpose: string): Hex {
  return keccak256(toBytes(purpose));
}

export function computeStatus(c: ChainCovenant): CovenantStatus {
  if (!c.active) return "inactive";
  if (BigInt(Math.floor(Date.now() / 1000)) >= c.policy.expiry) return "expired";
  if (c.spentUsdCents >= c.policy.usdBudgetTotal) return "depleted";
  return "active";
}

export function toDisplayCovenant(id: bigint, c: ChainCovenant): DisplayCovenant {
  const purposeLabel = getPurposeLabel(c.policy.purposeHash);
  const agentLabel = getAgentLabel(c.agent);
  return {
    id: `#${id.toString()}`,
    covenantId: id,
    owner: c.owner,
    agent: c.agent,
    agentLabel: agentLabel ?? shortAddr(c.agent),
    totalBudgetUsd: Number(c.policy.usdBudgetTotal) / 100,
    remainingBudgetUsd: Math.max(0, Number(c.policy.usdBudgetTotal - c.spentUsdCents) / 100),
    spentUsd: Number(c.spentUsdCents) / 100,
    maxPerRequestUsd: Number(c.policy.usdMaxPerRequest) / 100,
    expiresAt: new Date(Number(c.policy.expiry) * 1000),
    allowedRecipients: c.policy.allowedRecipients,
    purpose: purposeLabel ?? `purpose #${c.policy.purposeHash.slice(2, 8)}`,
    purposeHash: c.policy.purposeHash,
    status: computeStatus(c),
    active: c.active,
  };
}

/** "24 hours" / "7 days" / "in 3 hours" style label for a covenant's expiry. */
export function expiryLabel(expiresAt: Date): string {
  const diffMs = expiresAt.getTime() - Date.now();
  if (diffMs <= 0) return "expired";
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return "expires in <1h";
  if (hours % 24 === 0) {
    const d = hours / 24;
    return `expires in ${d} ${d === 1 ? "day" : "days"}`;
  }
  return `expires in ${hours} ${hours === 1 ? "hour" : "hours"}`;
}
