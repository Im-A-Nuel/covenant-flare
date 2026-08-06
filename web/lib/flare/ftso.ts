import type { FlarePublicClient } from "./chain";
import { CONTRACT_REGISTRY_ABI, FTSO_V2_ABI } from "./abi";
import { CONTRACT_REGISTRY_ADDRESS, FEED_ID_XRP_USD, REGISTRY_NAMES } from "./constants";
import { publicClient } from "./chain";

// FXRP decimals on Coston2, confirmed via `cast call <fxrp> decimals()(uint8)`
// on 2026-08-06 -> 6 (XRPL drop precision, not the usual ERC20 18).
export const FXRP_DECIMALS = 6;

let cachedFtsoV2: `0x${string}` | undefined;

async function getFtsoV2Address(client: FlarePublicClient = publicClient): Promise<`0x${string}`> {
  if (cachedFtsoV2) return cachedFtsoV2;
  const addr = await client.readContract({
    address: CONTRACT_REGISTRY_ADDRESS,
    abi: CONTRACT_REGISTRY_ABI,
    functionName: "getContractAddressByName",
    args: [REGISTRY_NAMES.ftsoV2],
  });
  cachedFtsoV2 = addr;
  return addr;
}

export interface XrpUsdPrice {
  /** USD per 1 whole XRP, 18-decimal fixed point (matches getFeedByIdInWei). */
  priceWei: bigint;
  timestamp: number;
}

/** Live XRP/USD price straight from FTSO v2 on Coston2. */
export async function getXrpUsdPrice(client: FlarePublicClient = publicClient): Promise<XrpUsdPrice> {
  const ftsoV2 = await getFtsoV2Address(client);
  const [priceWei, timestamp] = await client.readContract({
    address: ftsoV2,
    abi: FTSO_V2_ABI,
    functionName: "getFeedByIdInWei",
    args: [FEED_ID_XRP_USD],
  });
  return { priceWei, timestamp: Number(timestamp) };
}

/** Mirrors CovenantVault._fxrpToUsdCents: FXRP (6dp) * price (18dp) / 1e22 = cents. */
export function fxrpToUsdCents(amountFXRP: bigint, priceWei: bigint): bigint {
  return (amountFXRP * priceWei) / 10n ** 22n;
}

/** Inverse conversion for display: how much FXRP is `usdCents` worth right now. */
export function usdCentsToFxrp(usdCents: bigint, priceWei: bigint): bigint {
  if (priceWei === 0n) return 0n;
  return (usdCents * 10n ** 22n) / priceWei;
}

export function formatFxrp(amountFXRP: bigint, dp = 2): string {
  const n = Number(amountFXRP) / 10 ** FXRP_DECIMALS;
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp });
}

export function formatUsdCents(usdCents: bigint, dp = 2): string {
  const n = Number(usdCents) / 100;
  return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

/** The "$3.00 (2.1 FXRP via FTSO)" dual-denomination line required on every covenant card. */
export function formatDualDenomination(usdCents: bigint, priceWei: bigint): string {
  const fxrp = usdCentsToFxrp(usdCents, priceWei);
  return `$${formatUsdCents(usdCents)} (${formatFxrp(fxrp)} FXRP via FTSO)`;
}
