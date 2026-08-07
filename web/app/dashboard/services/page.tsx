import { SERVICES } from "@/lib/services";

export default function ServicesPage() {
  return (
    <>
      <div className="page-head">
        <div className="ph-l">
          <div className="crumb">Registry</div>
          <h1 className="display ph">x402 services</h1>
          <p>
            The services your agents can reach. A covenant&apos;s real allow-list is on-chain
            addresses (allowedRecipients) -- this catalog is for choosing who to add.
          </p>
        </div>
      </div>

      <div className="note-card">
        <span className="ni">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="#2775ca" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" stroke="#2775ca" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p>
          <b>Verification is the first firewall.</b> An agent can only pay an address that&apos;s in
          its covenant&apos;s allowedRecipients. Unverified services are shown here for transparency
          but can never be charged unless their payout address is explicitly added.
        </p>
      </div>

      <div className="svc-grid" id="grid">
        {SERVICES.map((s) => (
          <div key={s.name} className={`svc-card ${s.verified ? "" : "unverified"}`}>
            <div className="svc-top">
              <span className="svc-logo" style={{ background: s.color }}>
                {s.name[0].toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="svc-name">
                  {s.name}
                  {s.verified ? (
                    <span className="verified-badge">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12.5l4.2 4.2L19 7" stroke="#2f8f5b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="blocked-badge">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        <path d="M7 7l10 10M17 7L7 17" stroke="#cf4b3e" strokeWidth="2.6" strokeLinecap="round" />
                      </svg>
                      Blocked
                    </span>
                  )}
                </div>
                <div className="svc-cat">{s.cat}</div>
              </div>
            </div>
            <p className="svc-desc">{s.desc}</p>
            <div className="svc-meta">
              <div className="m">
                <span className="ml">Price range</span>
                <span className="mv">${s.price}</span>
              </div>
              <div className="m">
                <span className="ml">Calls (30d)</span>
                <span className="mv">{s.calls}</span>
              </div>
              <div className="m">
                <span className="ml">Status</span>
                <span className="mv" style={{ color: s.verified ? "var(--ok)" : "var(--block)" }}>
                  {s.verified ? "Allowed" : "Not allowed"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
