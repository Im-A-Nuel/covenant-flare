import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type EIP1193Provider,
} from "viem";
import { flareTestnet } from "viem/chains"; // this is Coston2 (chain id 114) despite the name

import { COSTON2_RPC_URL } from "./constants";

export const CHAIN = flareTestnet;

const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL && process.env.NEXT_PUBLIC_RPC_URL.length > 0
    ? process.env.NEXT_PUBLIC_RPC_URL
    : COSTON2_RPC_URL;

// No PublicClient cast here (unlike v1's Base Sepolia client): that cast
// worked around an OP-stack-specific getBlock() type widening that doesn't
// apply to flareTestnet, and erasing the client's generics broke type
// inference for multi-value readContract() calls (FTSO reads, covenant reads).
export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL),
});

export type FlarePublicClient = typeof publicClient;

// The provider the user explicitly picked in the wallet chooser (EIP-6963).
// When set, it overrides auto-detection so every request goes to that wallet.
let chosenProvider: EIP1193Provider | undefined;
export function setInjectedProvider(p: EIP1193Provider | undefined) {
  chosenProvider = p;
}

export function getInjected(): EIP1193Provider | undefined {
  if (chosenProvider) return chosenProvider;
  if (typeof window === "undefined") return undefined;
  // Prefer MetaMask if multiple providers are injected -- MetaMask is still a
  // fine EOA wallet for Flare, this project just no longer uses its Delegation
  // Toolkit / Smart Account layer.
  const eth = (window as unknown as { ethereum?: EIP1193Provider & { providers?: EIP1193Provider[]; isMetaMask?: boolean } }).ethereum;
  if (!eth) return undefined;
  if (eth.providers?.length) {
    return eth.providers.find((p) => (p as { isMetaMask?: boolean }).isMetaMask) ?? eth.providers[0];
  }
  return eth;
}

export function getWalletClient(account: Address) {
  const provider = getInjected();
  if (!provider) throw new Error("No injected wallet found. Install MetaMask or another EIP-1193 wallet.");
  return createWalletClient({
    account,
    chain: CHAIN,
    transport: custom(provider),
  });
}

export const EXPLORER = "https://coston2-explorer.flare.network";
export const explorerTx = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const explorerAddr = (addr: string) => `${EXPLORER}/address/${addr}`;
