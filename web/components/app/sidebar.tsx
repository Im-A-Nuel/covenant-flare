"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CovenantMark } from "@/components/covenant-mark";
import { useWallet } from "@/lib/wallet";
import { useCovenants } from "@/lib/useCovenants";
import { WalletMenu } from "@/components/wallet-menu";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  count?: number | string;
}

const PlusIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export function Sidebar() {
  const pathname = usePathname();
  const { account } = useWallet();
  const { covenants } = useCovenants(account);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const items: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z" />,
    },
    {
      href: "/dashboard/covenants",
      label: "Covenants",
      icon: (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M4 9h16M9 4v16" />
        </>
      ),
      count: covenants.length,
    },
    {
      href: "/dashboard/console",
      label: "Task Console",
      icon: <path d="M5 7l4 5-4 5M12 17h7" />,
    },
    {
      href: "/dashboard/audit",
      label: "Audit Log",
      icon: (
        <>
          <path d="M6 3h9l4 4v14H6zM14 3v5h5" />
          <path d="M9 13h7M9 17h5" />
        </>
      ),
    },
    {
      href: "/dashboard/services",
      label: "Services",
      icon: (
        <>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
          <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </>
      ),
    },
  ];

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  const navLinks = (onNavigate?: () => void) =>
    items.map((item) => (
      <Link
        key={item.href}
        className={`navitem ${isActive(item.href) ? "active" : ""}`}
        href={item.href}
        onClick={onNavigate}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {item.icon}
        </svg>
        {item.label}
        {item.count !== undefined && item.count !== "" ? (
          <span className="count">{item.count}</span>
        ) : null}
      </Link>
    ));

  return (
    <>
      {/* ===== desktop sidebar ===== */}
      <aside className="side dash-side">
        <Link className="brand" href="/">
          <CovenantMark size={28} className="mark" />
          Covenant
        </Link>
        <div className="side-label">Workspace</div>
        <nav className="nav">{navLinks()}</nav>
        <div className="side-foot">
          <Link className="btn btn-dark" href="/new" style={{ width: "100%" }}>
            {PlusIcon}
            New covenant
          </Link>
          <WalletMenu variant="chip" />
        </div>
      </aside>

      {/* ===== mobile top bar + drawer ===== */}
      <header className={`mnav${menuOpen ? " open" : ""}`}>
        <div className="mnav-bar">
          <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
            <CovenantMark size={26} className="mark" />
            Covenant
          </Link>
          <div className="mnav-right">
            <WalletMenu variant="chip" />
            <button
              type="button"
              className="mnav-burger"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mnav-drawer">
            {navLinks(() => setMenuOpen(false))}
            <Link
              className="btn btn-dark"
              href="/new"
              style={{ width: "100%" }}
              onClick={() => setMenuOpen(false)}
            >
              {PlusIcon}
              New covenant
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
