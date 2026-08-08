"use client";

import { useWallet } from "@/lib/wallet";

/** Shown whenever a wallet is connected but on the wrong chain. Covenant only
 * works on Coston2 -- CovenantVault, FTSO and FXRP all live there. */
export function NetworkBanner() {
  const { account, correctChain, switchChain } = useWallet();
  if (!account || correctChain) return null;

  return (
    <div className="network-banner">
      <span>
        Wrong network -- Covenant only works on <b>Flare Coston2 Testnet</b>.
      </span>
      <button className="network-banner-btn" onClick={() => void switchChain()}>
        Switch to Coston2
      </button>
    </div>
  );
}
