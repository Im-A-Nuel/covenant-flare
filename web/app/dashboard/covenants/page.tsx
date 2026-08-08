"use client";

import * as React from "react";
import Link from "next/link";
import { CovenantCard } from "@/components/covenant-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/lib/wallet";
import { useCovenants, useFtsoPrice, useVaultDeployed } from "@/lib/useCovenants";
import type { CovenantStatus } from "@/lib/covenant-view";

type Filter = "all" | CovenantStatus;

const TABS: [Filter, string][] = [
  ["all", "All"],
  ["active", "Active"],
  ["depleted", "Depleted"],
  ["expired", "Expired"],
  ["inactive", "Inactive"],
];

export default function CovenantsPage() {
  const { account, connect, connecting } = useWallet();
  const vaultDeployed = useVaultDeployed();
  const { covenants, loading } = useCovenants(account);
  const { priceWei } = useFtsoPrice();
  const [filter, setFilter] = React.useState<Filter>("all");

  if (!vaultDeployed) {
    return (
      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Manage</div>
          <h1 className="display ph">Covenants</h1>
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
          <div className="crumb">Manage</div>
          <h1 className="display ph">Covenants</h1>
          <p>Connect your wallet to see the covenants you&apos;ve created.</p>
          <button className="connect-cta" onClick={() => void connect()} disabled={connecting}>
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      </div>
    );
  }
  if (loading) return <CovenantsSkeleton />;

  const counts: Record<string, number> = { all: covenants.length };
  (["active", "depleted", "expired", "inactive"] as CovenantStatus[]).forEach(
    (s) => (counts[s] = covenants.filter((c) => c.status === s).length)
  );

  const list = covenants.filter((c) => filter === "all" || c.status === filter);

  return (
    <>
      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Manage</div>
          <h1 className="display ph">Covenants</h1>
          <p>
            Every spending agreement you&apos;ve created, read live from CovenantVault. Funds only
            ever leave through <code>pay()</code>, checked against the policy on-chain.
          </p>
        </div>
        <Link className="btn btn-dark" href="/new">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New covenant
        </Link>
      </div>

      <div className="tabs">
        {TABS.map(([k, l]) => (
          <button key={k} className={k === filter ? "on" : ""} onClick={() => setFilter(k)}>
            {l}
            <span className="tc">{counts[k] || 0}</span>
          </button>
        ))}
      </div>

      <div className="cov-grid">
        {list.length === 0 ? (
          <div className="panel-card empty" style={{ gridColumn: "1/-1" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M4 9h16M9 4v16" />
            </svg>
            <div>No covenants in this state.</div>
          </div>
        ) : (
          list.map((c) => {
            const isActive = c.status === "active";
            return (
              <CovenantCard
                key={c.id}
                covenant={c}
                priceWei={priceWei}
                dim={!isActive}
                footer={
                  isActive ? (
                    <>
                      <Link className="btn btn-ghost btn-sm" href={`/dashboard/console?cov=${c.covenantId}`}>
                        Assign task
                      </Link>
                      <a
                        className="btn btn-ghost btn-sm"
                        href={`https://coston2-explorer.flare.network/address/${c.owner}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View owner
                      </a>
                    </>
                  ) : (
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} disabled>
                      {c.status === "expired" ? "Expired" : c.status === "depleted" ? "Depleted" : "Inactive"}
                    </button>
                  )
                }
              />
            );
          })
        )}
      </div>
    </>
  );
}

function CovenantsSkeleton() {
  return (
    <>
      <div className="page-head">
        <div className="ph-l">
          <Skeleton style={{ width: 70, height: 12, marginBottom: 13 }} />
          <Skeleton style={{ width: 200, height: 32, marginBottom: 10, borderRadius: 10 }} />
          <Skeleton style={{ width: "min(60ch, 100%)", height: 16 }} />
        </div>
      </div>
      <Skeleton style={{ width: 320, height: 42, borderRadius: 12, marginBottom: 24 }} />
      <div className="cov-grid">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} style={{ width: "100%", height: 360, borderRadius: 22 }} />
        ))}
      </div>
    </>
  );
}
