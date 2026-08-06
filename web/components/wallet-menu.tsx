"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/utils";

const DEMO_ADDR = "0x7a…3F2c";

/**
 * Wallet chip / pill that opens a popup with the full address, copy, and
 * connect/disconnect. Used in the landing nav (pill), the dashboard sidebar +
 * mobile top bar, and the wizard sidebar (chip), so it works on every page.
 */
export function WalletMenu({ variant = "chip" }: { variant?: "chip" | "pill" }) {
  const { account, connect, disconnect, connecting, wallets } = useWallet();
  const [open, setOpen] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Open the wallet chooser instead of connecting straight to the default wallet.
  const startConnect = React.useCallback(() => {
    setOpen(false);
    setPicking(true);
  }, []);

  const pick = React.useCallback(
    (detail?: { provider: Parameters<typeof connect>[0] }) => {
      setPicking(false);
      void connect(detail?.provider);
    },
    [connect]
  );

  const connected = !!account;
  const shown = connected ? shortAddr(account) : DEMO_ADDR;

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function copy() {
    try {
      navigator.clipboard?.writeText(account ?? DEMO_ADDR);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  const trigger =
    variant === "pill" && !connected ? (
      // landing pill, not connected → opens the wallet chooser
      <button type="button" className="btn btn-dark wallet-btn" onClick={startConnect}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M3 7.5A2.5 2.5 0 015.5 5H18a1 1 0 011 1v1.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
          <rect x="3" y="7" width="18" height="12" rx="2.5" stroke="#fff" strokeWidth="1.7" />
          <circle cx="16.5" cy="13" r="1.5" fill="#fff" />
        </svg>
        <span>{connecting ? "Connecting…" : "Connect Wallet"}</span>
      </button>
    ) : variant === "pill" ? (
      <button
        type="button"
        className="btn btn-dark wallet-btn connected"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="wdot" />
        <span>{shown}</span>
      </button>
    ) : (
      <button
        type="button"
        className="wallet"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="wdot" />
        <span className="wmeta">
          <b>{shown}</b>
          <small>Coston2 Testnet</small>
        </span>
        <span className="wnet">Flare</span>
      </button>
    );

  return (
    <div className="wallet-menu" ref={ref}>
      {trigger}
      {open && (
        <div className="wallet-pop" role="menu">
          <div className="wallet-pop-top">
            <span className="wdot" />
            <div className="wallet-pop-id">
              <span className="wallet-pop-label">{connected ? "Connected" : "Demo wallet"}</span>
              <span className="wallet-pop-addr mono">{connected ? account : DEMO_ADDR}</span>
            </div>
          </div>
          <div className="wallet-pop-meta">Coston2 Testnet · Flare</div>
          <div className="wallet-pop-actions">
            <button type="button" className="wallet-pop-btn" onClick={copy}>
              {copied ? "Copied ✓" : "Copy address"}
            </button>
            {connected ? (
              <button
                type="button"
                className="wallet-pop-btn danger"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
              >
                Disconnect
              </button>
            ) : (
              <button type="button" className="wallet-pop-btn primary" onClick={startConnect}>
                Connect wallet
              </button>
            )}
          </div>
        </div>
      )}

      {picking && typeof document !== "undefined" && createPortal(
        <div className="wpick-backdrop" onClick={() => setPicking(false)}>
          <div className="wpick" role="dialog" aria-label="Choose a wallet" onClick={(e) => e.stopPropagation()}>
            <div className="wpick-head">
              <b>Choose a wallet</b>
              <button type="button" className="wpick-x" aria-label="Close" onClick={() => setPicking(false)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {wallets.length > 0 ? (
              wallets.map((w) => (
                <button key={w.info.uuid} type="button" className="wpick-item" onClick={() => pick(w)}>
                  <span className="wpick-ic" style={{ backgroundImage: `url(${w.info.icon})` }} />
                  <span>{w.info.name}</span>
                </button>
              ))
            ) : (
              <>
                <button type="button" className="wpick-item" onClick={() => pick()}>
                  <span className="wpick-ic generic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="7" width="18" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
                      <circle cx="16.5" cy="13" r="1.5" fill="currentColor" />
                    </svg>
                  </span>
                  <span>Browser wallet</span>
                </button>
                <a className="wpick-install" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
                  No wallet? Install MetaMask →
                </a>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
