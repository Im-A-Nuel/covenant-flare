"use client";

import * as React from "react";
import Link from "next/link";
import { CovenantMark } from "@/components/covenant-mark";
import { WalletMenu } from "@/components/wallet-menu";
import { IconBot, IconCoin, IconClock, IconLimit } from "@/components/icons";

/* ---- agent categories marquee ---- */
const CI = ({ children }: { children: React.ReactNode }) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

// One distinct, on-theme line icon per agent category (no blank gradient squares).
const CAT_ICONS: Record<string, React.ReactNode> = {
  "Research agents": <CI><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-3.8-3.8" /></CI>,
  "Trading bots": <CI><path d="M4 14l4-4 3 3 6-7" /><path d="M15 6h4v4" /></CI>,
  "Data pipelines": <CI><circle cx="5" cy="7" r="1.6" /><circle cx="19" cy="16" r="1.6" /><path d="M6.6 7H14a4 4 0 014 4v3.6" /></CI>,
  "DAO operations": <CI><circle cx="9" cy="9" r="3" /><path d="M3.6 19c.3-3 2.7-4.6 5.4-4.6S14.1 16 14.4 19" /><path d="M16 7.2a3 3 0 010 5.6" /></CI>,
  "Inference apps": <CI><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3" /></CI>,
  "Dev tooling": <CI><path d="M9 8l-4 4 4 4M15 8l4 4-4 4" /></CI>,
  "API marketplaces": <CI><rect x="4" y="4" width="7" height="7" rx="1.6" /><rect x="13" y="4" width="7" height="7" rx="1.6" /><rect x="4" y="13" width="7" height="7" rx="1.6" /><rect x="13" y="13" width="7" height="7" rx="1.6" /></CI>,
  "Content agents": <CI><path d="M14 4l6 6M4.5 19.5l.9-3.6L16 5.3l2.7 2.7L8.1 18.6z" /></CI>,
  "Onchain analysts": <CI><path d="M5 19V11M10 19V6M15 19v-8M20 19V8" /></CI>,
  "Autonomous shoppers": <CI><circle cx="9.5" cy="20" r="1.3" /><circle cx="18" cy="20" r="1.3" /><path d="M3 4h2.2l2.4 11h10l1.8-7.5H7" /></CI>,
  "Voice assistants": <CI><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" /></CI>,
  "Monitoring agents": <CI><path d="M3 12h4l2.2-6 3.6 12 2.2-6H21" /></CI>,
};

const cats: [string, string, string][] = [
  ["Research agents", "#dbe7f6", "#2775ca"], ["Trading bots", "#e8e0f6", "#7e57c2"], ["Data pipelines", "#e2efe5", "#2f8f5b"],
  ["DAO operations", "#fbe7dd", "#e07a3f"], ["Inference apps", "#f6e2ea", "#c0496f"], ["Dev tooling", "#e7eaee", "#5b6472"],
  ["API marketplaces", "#e3f0ef", "#2f8f8f"], ["Content agents", "#efeada", "#b08900"], ["Onchain analysts", "#dfe9f4", "#2f6fce"],
  ["Autonomous shoppers", "#f5e3da", "#d2683f"], ["Voice assistants", "#e6e2f3", "#6d5bd0"], ["Monitoring agents", "#e1efe2", "#3a9d6a"],
];

function CatTile({ label, c, accent }: { label: string; c: string; accent: string }) {
  return (
    <div className="cat">
      <span className="sq" style={{ background: `linear-gradient(135deg,${c},#fff)`, color: accent }}>
        {CAT_ICONS[label]}
      </span>
      <span>{label}</span>
    </div>
  );
}

/* ---- floating icon+text cards on final CTA ---- */
type FlyIcon = React.ReactNode;
const Svg = ({ children, extra }: { children: React.ReactNode; extra?: Record<string, string> }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...extra}>
    {children}
  </svg>
);
const ic = {
  coin: (
    <Svg>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v10M14.4 8.6C13.8 7.9 13 7.5 12 7.5c-1.6 0-2.8.9-2.8 2.1 0 2.7 5.8 1.3 5.8 4.3 0 1.2-1.2 2.1-2.8 2.1-1 0-1.9-.4-2.5-1.1" />
    </Svg>
  ),
  clock: (
    <Svg>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Svg>
  ),
  check: (
    <Svg extra={{ strokeWidth: "2" }}>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </Svg>
  ),
  tag: (
    <Svg>
      <path d="M3 12l8.5-8.5H18a1.5 1.5 0 011.5 1.5V11L11 19.5z" />
      <circle cx="14.7" cy="9.3" r="1.2" />
    </Svg>
  ),
  seal: (
    <svg width="25" height="25" viewBox="0 0 30 30" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12.4 6.5C8.6 9 8.6 21 12.4 23.5" />
      <path d="M17.6 6.5C21.4 9 21.4 21 17.6 23.5" />
      <circle cx="15" cy="15" r="2.8" style={{ fill: "currentColor" }} />
    </svg>
  ),
  verified: (
    <Svg>
      <path d="M12 3.2l2 1.5 2.5-.2.9 2.3 2.1 1.3-.7 2.4.7 2.4-2.1 1.3-.9 2.3-2.5-.2L12 20.8 10 19.3l-2.5.2-.9-2.3L4.5 16l.7-2.4-.7-2.4 2.1-1.3.9-2.3 2.5.2z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  ),
};
type Fly = { l?: string; rg?: string; y: string; r: number; bg: string; col: string; ic: FlyIcon; t: string };
const fly: Fly[] = [
  { l: "8%", y: "15%", r: -6, bg: "#dbe7f6", col: "#2775ca", ic: ic.coin, t: "$3.00 budget" },
  { rg: "7%", y: "12%", r: 5, bg: "#e8e0f6", col: "#7e57c2", ic: ic.clock, t: "24h window" },
  { l: "4%", y: "58%", r: 4, bg: "#e2efe5", col: "#2f8f5b", ic: ic.check, t: "Payment approved" },
  { rg: "5%", y: "55%", r: -5, bg: "#fbe7dd", col: "#e07a3f", ic: ic.tag, t: "0.25 / request" },
  { l: "16%", y: "82%", r: 6, bg: "#f6e2ea", col: "#0c0c0d", ic: ic.seal, t: "Covenant #001" },
  { rg: "14%", y: "82%", r: -4, bg: "#e3f0ef", col: "#2f8f8f", ic: ic.verified, t: "Verified service" },
];

const FAQ_ITEMS: [string, string][] = [
  ["Does Covenant hold or custody my funds?", "Your FXRP sits in the CovenantVault contract you deposited into, an on-chain vault, not us. Every payment out of it is checked against your policy inside the contract itself, on Flare, before it can execute."],
  ["What exactly can an agent spend on?", "Only what your covenant allows: the recipients you list, under the total budget and per-request limits you set, and only until the covenant's expiry. Everything else reverts on-chain."],
  ["What happens when a payment breaks the policy?", "The CovenantVault contract reverts the transaction before any FXRP moves, with the failing check named in the revert reason. There's no off-chain step to bypass."],
  ["Can I revoke a covenant or change the budget?", "Not yet. A covenant runs until its budget is spent or its expiry timestamp passes. Revocation and budget top-ups are on the roadmap."],
  ["Which chains and standards does it use?", "Covenant runs on Flare. Budgets are denominated in USD and priced live via FTSO v2, settlement is in FXRP via FAssets, and x402 handles the paid-service handshake. Policy evaluation is designed to run inside Flare Confidential Compute (FCC) on Songbird, shipping as a roadmap item."],
  ["Do I need real funds to try it?", "No. Covenant runs on Flare's Coston2 testnet. Get C2FLR gas and testnet FXRP from the Coston2 faucet, connect a wallet, and every payment either executes on-chain with a real FTSO price check or reverts with a clear reason."],
];

/* ---- proof avatars: real agent icons (research, bot, trading), not letters ---- */
const AV = ({ children }: { children: React.ReactNode }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const AVATARS: { bg: string; icon: React.ReactNode }[] = [
  { bg: "linear-gradient(135deg,#2775ca,#4f97e0)", icon: <AV><circle cx="11" cy="11" r="5.4" /><path d="M19 19l-3.4-3.4" /></AV> },
  { bg: "linear-gradient(135deg,#f3b9c8,#f6c9b6)", icon: <AV><rect x="5.5" y="8.5" width="13" height="9.5" rx="3" /><path d="M12 8.5V5.7" /><circle cx="12" cy="4.6" r=".5" fill="#fff" stroke="none" /><path d="M9.8 13h.01M14.2 13h.01" /></AV> },
  { bg: "linear-gradient(135deg,#bcd0ad,#8fb37c)", icon: <AV><path d="M5 15l4-4 3 3 6-7" /><path d="M16 7h4v4" /></AV> },
];

const NAV_SECTIONS = ["why", "who", "features", "reserve"] as const;

/**
 * First-load intro: the Covenant mark centered with light orbiting around it,
 * then the whole overlay fades + lifts away to reveal the landing. Self-removing
 * and honors prefers-reduced-motion (skips straight to the page).
 */
function Intro() {
  const [done, setDone] = React.useState(false); // start exit fade
  const [gone, setGone] = React.useState(false); // unmount

  React.useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setGone(true);
      return;
    }
    document.body.classList.add("intro-lock");
    const t1 = setTimeout(() => setDone(true), 2000); // begin fade-out
    const t2 = setTimeout(() => {
      setGone(true);
      document.body.classList.remove("intro-lock");
    }, 2750); // unmount after fade
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.classList.remove("intro-lock");
    };
  }, []);

  if (gone) return null;
  return (
    <div className={`intro${done ? " done" : ""}`} aria-hidden="true">
      <div className="intro-stage">
        <span className="intro-glow" />
        <span className="intro-ring" />
        <span className="intro-ring r2" />
        <span className="intro-logo">
          <CovenantMark size={66} />
        </span>
      </div>
      <span className="intro-word">Covenant</span>
    </div>
  );
}

export default function Landing() {
  const [view, setView] = React.useState<"user" | "agent">("user");
  const [openFaq, setOpenFaq] = React.useState(0);
  const [activeNav, setActiveNav] = React.useState<string>("why");

  // nav active state — scrollspy by position so the highlight matches the
  // section actually shown (the old intersection band mis-fired on the short
  // #who heading and highlighted Features instead).
  React.useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const probe = window.scrollY + 120; // just below the 92px sticky-nav padding
      let current: string = NAV_SECTIONS[0];
      for (const id of NAV_SECTIONS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top - 1 <= probe) current = id;
      }
      // at the very bottom, force the last section active (its top never reaches probe)
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        current = NAV_SECTIONS[NAV_SECTIONS.length - 1];
      }
      setActiveNav(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Reveal elements as they scroll into view, and hide them again when they
  // leave (bidirectional). The observer toggles `.in` on every crossing.
  React.useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".landing .reveal"));
    if (!els.length) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.target.classList.toggle("in", e.isIntersecting));
      },
      { threshold: 0.15, rootMargin: "-6% 0px -16% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Bento cards live behind a display:none tab toggle, so the observer can't
  // see the inactive tab. On an actual tab switch (not first mount), force the
  // now-visible cards revealed so a hidden tab never leaves a card stuck.
  const firstView = React.useRef(true);
  React.useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    document
      .querySelectorAll(`.landing .bento[data-view="${view}"] .reveal`)
      .forEach((el) => el.classList.add("in"));
  }, [view]);

  return (
    <div className="landing">
      <Intro />
      {/* ============ NAV ============ */}
      <header className="nav">
        <div className="wrap nav-inner">
          <a className="brand" href="#top">
            <CovenantMark size={30} className="mark" />
            Covenant
          </a>
          <div className="nav-div" />
          <nav className="links">
            <a href="#why" className={activeNav === "why" ? "active" : undefined}>Why Covenant</a>
            <a href="#who" className={activeNav === "who" ? "active" : undefined}>Who it&apos;s for</a>
            <a href="#features" className={activeNav === "features" ? "active" : undefined}>Features</a>
            <a href="#reserve" className={activeNav === "reserve" ? "active" : undefined}>FAQ</a>
            <a href="https://github.com/Im-A-Nuel/covenant-flare/tree/main/docs" target="_blank" rel="noreferrer">Docs</a>
          </nav>
          <Link className="btn btn-ghost nav-app" href="/dashboard" aria-label="Open app">
            <span className="nav-app-label">Open app</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <WalletMenu variant="pill" />
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="hero" id="top">
        <div className="wrap hero-grid">
          <div className="hero-copy reveal">
            <div className="badge"><span className="dot" /> x402 payments on Flare · Private beta</div>
            <h1 className="display hero-h">Let <i>a</i>gents p<i>a</i>y. But only und<i>e</i>r cov<i>e</i>nant.</h1>
            <p className="hero-sub">Grant limited spending permissions to autonomous AI agents (budget, duration, allowed services, purpose), all enforced before a single payment ever executes.</p>
            <div className="hero-cta">
              <Link className="btn btn-dark btn-lg" href="/new">
                Get Started{" "}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <a className="btn btn-ghost btn-lg" href="#features">See how it works</a>
            </div>
            <div className="proof">
              <div className="avatars">
                {AVATARS.map((a, i) => (
                  <span key={i} style={{ background: a.bg }}>{a.icon}</span>
                ))}
              </div>
              <span><b>Policy-bound</b> x402 payments, enforced on-chain on Flare</span>
            </div>
          </div>

          <div className="hero-visual reveal" style={{ "--rd": ".12s" } as React.CSSProperties}>
            <div className="cov-card">
              <div className="cov-top">
                <div className="cov-top-row">
                  <div className="cov-id">
                    <CovenantMark size={16} />
                    Covenant&nbsp;#001
                  </div>
                  <span className="pill-status">Active</span>
                </div>
                <p className="cov-agent">Research Agent<span className="muted">Enforced on-chain by CovenantVault</span></p>
              </div>
              <div className="cov-body">
                <div className="budget">
                  <div className="budget-top"><span className="muted">Budget remaining</span><span className="v">$2.75 / $3.00 <span className="muted">(2.64 FXRP via FTSO)</span></span></div>
                  <div className="bar"><i /></div>
                </div>
                <div className="crow"><span className="k">Max per request</span><span className="v">$0.50</span></div>
                <div className="crow"><span className="k">Duration</span><span className="v">24 hours</span></div>
                <div className="crow"><span className="k">Purpose</span><span className="v">research-data-purchase</span></div>
                <div className="crow"><span className="k">Allowed</span><span className="chips"><span className="chip">venice.ai</span><span className="chip">market-api</span></span></div>
              </div>
            </div>
            <div className="float-card">
              <div className="fc-top">
                <div className="fc-ic">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#2f8f5b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div><div className="fc-title">Payment approved</div><div className="fc-sub">verified-market-api.demo</div></div>
              </div>
              <div className="fc-line"><span>ETH sentiment report</span><span className="mono">$0.25 (0.24 FXRP)</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <div className="trust">
        <div className="wrap trust-inner reveal">
          <span className="lbl">Composed for the agent economy</span>
          <b>Flare FTSO v2</b>
          <b>FXRP / FAssets</b>
          <b>x402 Payments</b>
          <b>Venice AI</b>
          <b>On-Chain Policy Vault</b>
        </div>
      </div>

      {/* ============ WHY ============ */}
      <section className="sec" id="why">
        <div className="wrap">
          <div className="sec-head reveal">
            <h2 className="display sec-h">B<i>e</i>cause giving an agent your wall<i>e</i>t shouldn&apos;t be <i>a</i>ll or nothing</h2>
            <p>We&apos;ve watched agents overspend, pay the wrong service, and double-charge. So we built the boundary that should have existed first.</p>
          </div>
          <div className="why-cards">
            <div className="why-card reveal">
              <div className="fx fx1" aria-hidden="true">
                <b className="orb o1" /><b className="orb o2" /><b className="orb o3" /><b className="orb o4" />
                <i className="seal-ring" />
                <span className="seal"><svg width="22" height="22" viewBox="0 0 30 30" fill="none"><path d="M12.4 6.5C8.6 9 8.6 21 12.4 23.5" stroke="#0c0c0d" strokeWidth="1.8" strokeLinecap="round" /><path d="M17.6 6.5C21.4 9 21.4 21 17.6 23.5" stroke="#0c0c0d" strokeWidth="1.8" strokeLinecap="round" /><circle cx="15" cy="15" r="2.8" fill="#0c0c0d" /></svg></span>
              </div>
              <h3>One Covenant for Everything</h3>
              <p>Budget, duration, allowed services, max-per-request and purpose, defined once in a single signed agreement.</p>
            </div>
            <div className="why-card reveal" style={{ "--rd": ".1s" } as React.CSSProperties}>
              <div className="fx fx2" aria-hidden="true">
                <div className="track2">
                  <span className="gate" />
                  <span className="scan" />
                  <span className="coin">$</span>
                  <span className="tick2"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                </div>
              </div>
              <h3>Spend Within the Rules</h3>
              <p>Every x402 request is checked against your policy (price, service, purpose, duplicates) before it can execute.</p>
            </div>
            <div className="why-card reveal" style={{ "--rd": ".2s" } as React.CSSProperties}>
              <div className="fx fx3" aria-hidden="true">
                <div className="log">
                  <div className="logrow l1"><span className="lt"><svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span><i className="lb" /></div>
                  <div className="logrow l2"><span className="lt"><svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span><i className="lb" /></div>
                  <div className="logrow l3"><span className="lt"><svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></span><i className="lb" /></div>
                </div>
              </div>
              <h3>A Trail You Can Trust</h3>
              <p>Every action logged with reason, cost, permission used, and transaction proof. No payment is ever a mystery.</p>
            </div>
          </div>

          <h3 className="display cats-title reveal reveal-fade" id="who">F<i>o</i>r every kind <i>o</i>f <i>a</i>gent</h3>
        </div>

        <div className="marquee reveal">
          <div className="track a">
            {[...cats, ...cats].map(([label, c, accent], i) => <CatTile key={`a${i}`} label={label} c={c} accent={accent} />)}
          </div>
          <div className="track b">
            {(() => {
              const rev = [...cats].reverse();
              return [...rev, ...rev].map(([label, c, accent], i) => <CatTile key={`b${i}`} label={label} c={c} accent={accent} />);
            })()}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="feat" id="features">
        <div className="wrap sec">
          <h2 className="display reveal">We h<i>a</i>ndle the bound<i>a</i>ries, your <i>a</i>gent does the work</h2>
          <p className="lead reveal" style={{ "--rd": ".08s" } as React.CSSProperties}>Whether you&apos;re setting the rules or running the task, every step is designed to stay inside the covenant.</p>
          <div className="toggle reveal">
            <button className={view === "user" ? "on" : undefined} onClick={() => setView("user")}>For the user</button>
            <button className={view === "agent" ? "on" : undefined} onClick={() => setView("agent")}>For the agent</button>
          </div>

          {/* USER VIEW */}
          <div className="bento" data-view="user" style={{ display: view === "user" ? "grid" : "none" }}>
            <div className="bcard reveal b-grey">
              <h3>Covenant Builder</h3>
              <p>Set the agent, token, budget, duration, limits and purpose. Sign once.</p>
              <div className="stage">
                <div className="phone">
                  <div className="notch" />
                  <div className="ph-statbar"><span>9:41</span><span>＋ New Covenant</span></div>
                  <div className="ui-row"><span className="uic"><IconBot /></span><span className="uik">Agent</span><span className="uiv">Research Agent</span></div>
                  <div className="ui-row"><span className="uic"><IconCoin /></span><span className="uik">Budget</span><span className="uiv">$3.00</span></div>
                  <div className="ui-row"><span className="uic"><IconClock /></span><span className="uik">Duration</span><span className="uiv">24 hours</span></div>
                  <div className="ui-row"><span className="uic"><IconLimit /></span><span className="uik">Max / request</span><span className="uiv">$0.50</span></div>
                </div>
              </div>
            </div>
            <div className="bcard reveal b-lilac">
              <h3>Policy Decision Panel</h3>
              <p>Watch each request approved, blocked, or escalated, in real time.</p>
              <div className="stage">
                <div className="decision">
                  <div className="dec-h"><b>$0.25 · ETH sentiment</b><span className="badge-ok">Approved</span></div>
                  <div className="check"><span className="tick">✓</span> Price under $0.50 limit</div>
                  <div className="check"><span className="tick">✓</span> Service verified</div>
                  <div className="check"><span className="tick">✓</span> Purpose matches covenant</div>
                  <div className="check"><span className="tick">✓</span> No duplicate payment</div>
                </div>
              </div>
            </div>
            <div className="bcard reveal b-mint">
              <h3>Status at a Glance</h3>
              <p>Every covenant's state -- active, depleted or expired -- computed live from CovenantVault, not a database.</p>
              <div className="stage">
                <div className="decision" style={{ boxShadow: "0 14px 30px -22px rgba(0,0,0,.2)" }}>
                  <div className="arow-wrap">
                    <div className="audit" style={{ margin: 0, boxShadow: "none", padding: "4px 0" }}>
                      <div className="arow"><span className="k">Covenant #001</span><span className="v" style={{ color: "#2f8f5b" }}>Active</span></div>
                      <div className="arow"><span className="k">Covenant #002</span><span className="v" style={{ color: "#b08900" }}>Budget depleted</span></div>
                      <div className="arow"><span className="k">Covenant #003</span><span className="v" style={{ color: "#9a9a9a" }}>Expired</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bcard reveal b-peach">
              <h3>Audit Dashboard</h3>
              <p>Reason, cost, service, permission and tx hash for every move the agent made.</p>
              <div className="stage">
                <div className="audit">
                  <div className="arow"><span className="k">Task</span><span className="v">ETH risk analysis</span></div>
                  <div className="arow"><span className="k">Payment</span><span className="v">$0.25</span></div>
                  <div className="arow"><span className="k">Permission</span><span className="v">Covenant #001</span></div>
                  <div className="arow"><span className="k">Tx hash</span><span className="v mono">0x8f…a31c</span></div>
                  <div className="arow"><span className="k">Remaining</span><span className="v">$2.75</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* AGENT VIEW */}
          <div className="bento" data-view="agent" style={{ display: view === "agent" ? "grid" : "none" }}>
            <div className="bcard reveal b-lilac">
              <h3>Task Console</h3>
              <p>Receive a plain-language task and turn it into a plan within policy.</p>
              <div className="stage">
                <div className="phone">
                  <div className="notch" />
                  <div className="ph-statbar"><span>9:41</span><span>Agent · planning</span></div>
                  <div className="ui-row"><span className="uik">“Analyze ETH risk. Use paid data only if needed.”</span></div>
                  <div className="ui-row"><span className="uic">1</span><span className="uik">Check free data first</span></div>
                  <div className="ui-row"><span className="uic">2</span><span className="uik">Request sentiment report</span></div>
                  <div className="ui-row"><span className="uic">3</span><span className="uik">Pay if under $0.50</span></div>
                </div>
              </div>
            </div>
            <div className="bcard reveal b-grey">
              <h3>x402 Request Handler</h3>
              <p>Parse the 402 Payment Required response and extract payment metadata.</p>
              <div className="stage">
                <div className="decision">
                  <div className="dec-h"><b className="mono" style={{ color: "#b08900" }}>402 Payment Required</b></div>
                  <div className="check"><span className="uik">Resource</span><span style={{ marginLeft: "auto", fontWeight: 600 }}>ETH sentiment report</span></div>
                  <div className="check"><span className="uik">Price</span><span style={{ marginLeft: "auto", fontWeight: 600 }}>$0.25</span></div>
                  <div className="check"><span className="uik">Pay to</span><span className="mono" style={{ marginLeft: "auto", fontWeight: 600 }}>0x4a…e9</span></div>
                </div>
              </div>
            </div>
            <div className="bcard reveal b-peach">
              <h3>On-Chain Settlement</h3>
              <p>The covenant vault checks the FTSO price and policy, then settles in FXRP. No off-chain trust required.</p>
              <div className="stage">
                <div className="decision">
                  <div className="dec-h"><b>Executing payment</b><span className="badge-ok">Settled</span></div>
                  <div className="check"><span className="tick">✓</span> FTSO price check passed</div>
                  <div className="check"><span className="tick">✓</span> CovenantVault.pay() executed</div>
                  <div className="check"><span className="tick">✓</span> $0.25 (0.24 FXRP) sent</div>
                </div>
              </div>
            </div>
            <div className="bcard reveal b-mint">
              <h3>Final Report</h3>
              <p>Use the paid resource to generate the answer, then hand back the receipt.</p>
              <div className="stage">
                <div className="audit">
                  <div className="arow"><span className="k">Output</span><span className="v">ETH: short-term risk ↑</span></div>
                  <div className="arow"><span className="k">Source</span><span className="v">Paid sentiment data</span></div>
                  <div className="arow"><span className="k">Cost</span><span className="v">$0.25</span></div>
                  <div className="arow"><span className="k">Status</span><span className="v" style={{ color: "#2f8f5b" }}>Completed</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ RESERVE ============ */}
      <section className="sec" id="reserve">
        <div className="wrap faq-wrap">
          <h2 className="display reveal">Quick <i>a</i>nswers bef<i>o</i>re you start</h2>
            <dl className="faq reveal">
              {FAQ_ITEMS.map(([q, a], i) => (
                <React.Fragment key={i}>
                  <dt
                    className={openFaq === i ? "open" : undefined}
                    onClick={() => setOpenFaq((cur) => (cur === i ? -1 : i))}
                  >
                    {q}
                  </dt>
                  <dd className={openFaq === i ? "open" : undefined}>
                    <div className="inner">{a}</div>
                  </dd>
                </React.Fragment>
              ))}
          </dl>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="cta">
        <div className="scatter">
          {fly.map((f, i) => (
            <div
              key={i}
              className="fly"
              style={{
                ...(f.l ? { left: f.l } : { right: f.rg }),
                top: f.y,
                ["--r" as string]: `${f.r}deg`,
                animationDelay: `${(i * 0.45).toFixed(2)}s`,
                animationDuration: `${(5 + i * 0.4).toFixed(1)}s`,
              } as React.CSSProperties}
            >
              <span className="fi" style={{ background: f.bg, color: f.col }}>{f.ic}</span>
              {f.t}
            </div>
          ))}
        </div>
        <div className="wrap">
          <div className="cta-logo reveal">
            <CovenantMark size={30} />
          </div>
          <h2 className="display reveal">R<i>e</i>ady to let your <i>a</i>gents p<i>a</i>y, saf<i>e</i>ly?</h2>
          <p className="reveal" style={{ "--rd": ".08s" } as React.CSSProperties}>It runs on Flare&apos;s Coston2 testnet today. Connect your wallet, create a covenant, and let your agent pay, safely.</p>
          <div className="cta-actions reveal" style={{ "--rd": ".12s" } as React.CSSProperties}>
            <Link className="btn btn-dark btn-lg" href="/new">
              Get Started{" "}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
          <div className="proof">
            <div className="avatars">
              {AVATARS.slice(0, 2).map((a, i) => (
                <span key={i} style={{ background: a.bg }}>{a.icon}</span>
              ))}
            </div>
            <span>The safety layer for self-paying AI agents</span>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer>
        <div className="wrap">
          <div className="foot-grid reveal">
            <div className="foot-brand">
              <CovenantMark size={34} className="mark" />
              <p className="foot-note">Covenant controls how agents spend. The safety layer for the autonomous agent economy. <a href="#top">Built for the Flare Summer Signal hackathon.</a></p>
            </div>
            <div className="foot-col">
              <h4>Sitemap</h4>
              <a href="#why">Why Covenant</a>
              <a href="#who">Who it&apos;s for</a>
              <a href="#features">Features</a>
              <a href="#reserve">FAQ</a>
            </div>
            <div className="foot-col">
              <h4>Product</h4>
              <Link href="/dashboard">Open the app</Link>
              <Link href="/new">Create a covenant</Link>
              <a href="https://github.com/Im-A-Nuel/covenant-flare/tree/main/docs" target="_blank" rel="noreferrer">Documentation</a>
              <a href="https://github.com/Im-A-Nuel/covenant-flare" target="_blank" rel="noreferrer">GitHub</a>
            </div>
          </div>
          <div className="foot-bottom reveal">
            <span>© 2026 Covenant. Let agents pay, but only under covenant.</span>
            <div className="foot-social">
              <a href="https://github.com/Im-A-Nuel/covenant-flare" target="_blank" rel="noreferrer" aria-label="GitHub"><svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 00-3 19.5c.5.1.7-.2.7-.5v-2c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6 0-.6 0-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1 2.9.8.1-.6.3-1 .6-1.3-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7 0-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 015 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.8-4.6 5 .3.3.6.9.6 1.8v2.7c0 .3.2.6.7.5A10 10 0 0012 2z" /></svg></a>
              <a href="https://github.com/Im-A-Nuel/covenant-flare/tree/main/docs" target="_blank" rel="noreferrer" aria-label="Documentation"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M5 4.5A1.5 1.5 0 016.5 3H18v15H6.5A1.5 1.5 0 005 19.5V4.5z" /><path d="M5 19.5A1.5 1.5 0 016.5 18H18v3H6.5A1.5 1.5 0 015 19.5z" /></svg></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
