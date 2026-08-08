"use client";

import * as React from "react";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo, shortAddr } from "@/lib/utils";
import { explorerTx } from "@/lib/flare/chain";
import { useAuditLog, useVaultDeployed, type AuditEvent } from "@/lib/useCovenants";

type Filter = "all" | "payment" | "covenant_created";

export default function AuditPage() {
  const vaultDeployed = useVaultDeployed();
  const { events, loading, error, refetch } = useAuditLog();
  const { toast } = useToast();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  if (!vaultDeployed) {
    return (
      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Accountability</div>
          <h1 className="display ph">Audit log</h1>
          <p>
            CovenantVault isn&apos;t deployed yet. Set <code>NEXT_PUBLIC_VAULT_ADDRESS</code> after
            deploying, then reload.
          </p>
        </div>
      </div>
    );
  }
  if (loading) return <AuditSkeleton />;

  const counts = {
    all: events.length,
    payment: events.filter((e) => e.kind === "payment").length,
    covenant_created: events.filter((e) => e.kind === "covenant_created").length,
  };
  const list = events.filter((e) => filter === "all" || e.kind === filter);

  function exportLog() {
    try {
      const blob = new Blob(
        [JSON.stringify(events, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "covenant-audit-log.json";
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exported ${events.length} on-chain events`);
    } catch {
      toast("Could not export the audit log", "error");
    }
  }

  const tabs: [Filter, string][] = [
    ["all", "All"],
    ["payment", "Payments"],
    ["covenant_created", "Covenants created"],
  ];

  return (
    <>
      <style>{`
        .lrow{grid-template-columns:2.2fr 1.1fr 0.9fr 1fr 1fr;}
        .detail{padding:0 22px;max-height:0;overflow:hidden;transition:max-height .3s ease;background:#fcfcfb;border-bottom:1px solid var(--line-2);}
        .detail.open{max-height:200px;}
        .detail-in{padding:18px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:14px 30px;font-size:13.5px;}
        .detail-in .k{color:var(--muted);display:block;margin-bottom:2px;font-size:12.5px;}
        .detail-in .v{font-weight:600;}
        .lrow .ex-toggle{display:flex;align-items:center;justify-content:flex-end;gap:8px;color:var(--muted);font-size:12.5px;}
        .lrow .chev{transition:transform .2s;}
        .lrow.open .chev{transform:rotate(180deg);}
        .clickable{cursor:pointer;}
        @media(max-width:720px){
          .lrow.head{display:none;}
          .lrow{grid-template-columns:1fr;gap:6px;padding:14px 16px;}
          .lrow .ex-toggle{justify-content:flex-start;}
          .detail{padding:0 16px;}
          .detail.open{max-height:600px;}
          .detail-in{grid-template-columns:1fr;gap:12px;}
        }
      `}</style>

      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Accountability</div>
          <h1 className="display ph">Audit log</h1>
          <p>
            Every covenant created and every payment settled, read directly from CovenantVault&apos;s
            events on Coston2. This is not a database -- if it&apos;s not on-chain, it&apos;s not here.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={exportLog}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 4v11M8 11l4 4 4-4M5 19h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Export
        </button>
      </div>

      <div className="tabs">
        {tabs.map(([k, l]) => (
          <button key={k} className={k === filter ? "on" : ""} onClick={() => setFilter(k)}>
            {l}
            <span className="tc">{counts[k]}</span>
          </button>
        ))}
      </div>

      <div className="panel-card">
        <div className="lrow head">
          <span>Event</span>
          <span>Covenant</span>
          <span>Amount</span>
          <span>Kind</span>
          <span style={{ textAlign: "right" }}>Time</span>
        </div>
        <div>
          {error ? (
            <div style={{ padding: "32px 22px", fontSize: 13.5 }}>
              <div style={{ color: "var(--block)", fontWeight: 600, marginBottom: 6 }}>
                Could not load the on-chain event log.
              </div>
              <div style={{ color: "var(--muted)", marginBottom: 12 }}>{error}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => void refetch()}>
                Retry
              </button>
            </div>
          ) : list.length === 0 ? (
            <div style={{ padding: "32px 22px", color: "var(--muted)", fontSize: 13.5 }}>
              No events yet.
            </div>
          ) : (
            list.map((e) => (
              <Row
                key={e.transactionHash + e.kind}
                e={e}
                open={!!open[e.transactionHash + e.kind]}
                onToggle={() => setOpen((o) => ({ ...o, [e.transactionHash + e.kind]: !o[e.transactionHash + e.kind] }))}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function Row({ e, open, onToggle }: { e: AuditEvent; open: boolean; onToggle: () => void }) {
  const isPayment = e.kind === "payment";
  const time = e.timestamp ? timeAgo(new Date(e.timestamp * 1000).toISOString()) : "";

  return (
    <>
      <div className={`lrow clickable${open ? " open" : ""}`} onClick={onToggle}>
        <div className="who">
          <span className={`feed-ic ${isPayment ? "ok" : "block"}`} style={{ width: 34, height: 34 }}>
            {isPayment ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12.5l4.2 4.2L19 7" stroke="#2f8f5b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="#2775ca" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <span style={{ minWidth: 0, display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
            <span className="nm">{isPayment ? e.payment!.memo || "Payment" : "Covenant created"}</span>
            <span className="sub">
              {isPayment ? `to ${shortAddr(e.payment!.recipient)}` : `agent ${shortAddr(e.created!.agent)}`}
            </span>
          </span>
        </div>
        <div>
          <span className="chip">#{e.covenantId.toString()}</span>
        </div>
        <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {isPayment ? `$${(Number(e.payment!.usdCents) / 100).toFixed(2)}` : "—"}
        </div>
        <div>
          <span className={`pill ${isPayment ? "active" : "expired"}`}>{isPayment ? "Payment" : "Created"}</span>
        </div>
        <div className="ex-toggle">
          {time}
          <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div className={`detail${open ? " open" : ""}`}>
        <div className="detail-in">
          <div>
            <span className="k">Covenant</span>
            <span className="v">#{e.covenantId.toString()}</span>
          </div>
          {isPayment ? (
            <>
              <div>
                <span className="k">Recipient</span>
                <span className="v mono">{e.payment!.recipient}</span>
              </div>
              <div>
                <span className="k">Amount (FXRP)</span>
                <span className="v">{(Number(e.payment!.amountFXRP) / 1e6).toFixed(4)} FXRP</span>
              </div>
              <div>
                <span className="k">Memo</span>
                <span className="v">{e.payment!.memo || "—"}</span>
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="k">Owner</span>
                <span className="v mono">{e.created!.owner}</span>
              </div>
              <div>
                <span className="k">Agent</span>
                <span className="v mono">{e.created!.agent}</span>
              </div>
            </>
          )}
          <div>
            <span className="k">Transaction</span>
            <a
              className="v mono"
              href={explorerTx(e.transactionHash)}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
              onClick={(ev) => ev.stopPropagation()}
            >
              {shortAddr(e.transactionHash, 6)}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function AuditSkeleton() {
  return (
    <>
      <div className="page-head">
        <div className="ph-l">
          <Skeleton style={{ width: 120, height: 12, marginBottom: 13 }} />
          <Skeleton style={{ width: 180, height: 32, marginBottom: 10, borderRadius: 10 }} />
          <Skeleton style={{ width: "min(64ch, 100%)", height: 16 }} />
        </div>
      </div>
      <Skeleton style={{ width: 220, height: 42, borderRadius: 12, marginBottom: 24 }} />
      <div className="panel-card" style={{ padding: "8px 22px" }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "center", padding: "16px 0", borderBottom: i < 5 ? "1px solid var(--line-2)" : "none" }}>
            <Skeleton style={{ width: 34, height: 34, borderRadius: 10 }} />
            <div style={{ flex: 1 }}>
              <Skeleton style={{ width: "55%", height: 14, marginBottom: 7 }} />
              <Skeleton style={{ width: "35%", height: 12 }} />
            </div>
            <Skeleton style={{ width: 80, height: 24, borderRadius: 999 }} />
          </div>
        ))}
      </div>
    </>
  );
}
