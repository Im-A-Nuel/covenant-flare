import { decodeEventLog, parseEventLogs, type Address, type Hex, type Log } from "viem";
import { COVENANT_VAULT_ABI, CONTRACT_REGISTRY_ABI, ERC20_ABI } from "./abi";
import { CONTRACT_REGISTRY_ADDRESS, REGISTRY_NAMES } from "./constants";
import { publicClient, getWalletClient, type FlarePublicClient } from "./chain";

/**
 * CovenantVault address on Coston2. Not filled in yet -- the contract hasn't
 * been deployed. Every write call below will throw a clear error until
 * NEXT_PUBLIC_VAULT_ADDRESS is set post-deploy. Reads that don't touch the
 * vault (FTSO price, FXRP token resolution) work today.
 */
export const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS ?? "") as Address;

function requireVaultAddress(): Address {
  if (!VAULT_ADDRESS) {
    throw new Error(
      "CovenantVault is not deployed yet -- set NEXT_PUBLIC_VAULT_ADDRESS after running contracts/script/Deploy.s.sol"
    );
  }
  return VAULT_ADDRESS;
}

export interface Policy {
  usdBudgetTotal: bigint; // integer cents
  usdMaxPerRequest: bigint; // integer cents
  expiry: bigint; // unix seconds
  allowedRecipients: Address[];
  purposeHash: Hex;
}

export interface Covenant {
  owner: Address;
  agent: Address;
  policy: Policy;
  spentUsdCents: bigint;
  active: boolean;
}

let cachedFxrpToken: Address | undefined;

/** Resolve FXRP via AssetManagerFXRP.fAsset() -- see contracts/src/CovenantVault.sol constructor for why this isn't hardcoded. */
export async function getFxrpTokenAddress(client: FlarePublicClient = publicClient): Promise<Address> {
  if (cachedFxrpToken) return cachedFxrpToken;
  const assetManager = await client.readContract({
    address: CONTRACT_REGISTRY_ADDRESS,
    abi: CONTRACT_REGISTRY_ABI,
    functionName: "getContractAddressByName",
    args: [REGISTRY_NAMES.assetManagerFXRP],
  });
  const fAsset = await client.readContract({
    address: assetManager,
    abi: [
      {
        type: "function",
        name: "fAsset",
        inputs: [],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
      },
    ] as const,
    functionName: "fAsset",
  });
  cachedFxrpToken = fAsset;
  return fAsset;
}

export async function getFxrpBalance(owner: Address, client: FlarePublicClient = publicClient): Promise<bigint> {
  const token = await getFxrpTokenAddress(client);
  return client.readContract({ address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [owner] });
}

export async function getVaultBalance(owner: Address, client: FlarePublicClient = publicClient): Promise<bigint> {
  return client.readContract({
    address: requireVaultAddress(),
    abi: COVENANT_VAULT_ABI,
    functionName: "balanceFXRP",
    args: [owner],
  });
}

export async function getCovenant(covenantId: bigint, client: FlarePublicClient = publicClient): Promise<Covenant> {
  const [owner, agent, policy, spentUsdCents, active] = await client.readContract({
    address: requireVaultAddress(),
    abi: COVENANT_VAULT_ABI,
    functionName: "covenants",
    args: [covenantId],
  });
  return {
    owner,
    agent,
    spentUsdCents,
    active,
    policy: {
      usdBudgetTotal: policy.usdBudgetTotal,
      usdMaxPerRequest: policy.usdMaxPerRequest,
      expiry: policy.expiry,
      allowedRecipients: [...policy.allowedRecipients],
      purposeHash: policy.purposeHash,
    },
  };
}

export async function getNextCovenantId(client: FlarePublicClient = publicClient): Promise<bigint> {
  return client.readContract({
    address: requireVaultAddress(),
    abi: COVENANT_VAULT_ABI,
    functionName: "nextCovenantId",
  });
}

/** Every covenant owned by the connected user, read directly off-chain state (no indexer). */
export async function listCovenants(owner: Address, client: FlarePublicClient = publicClient): Promise<Array<Covenant & { id: bigint }>> {
  const count = await getNextCovenantId(client);
  const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i));
  const all = await Promise.all(ids.map(async (id) => ({ id, ...(await getCovenant(id, client)) })));
  return all.filter((c) => c.owner.toLowerCase() === owner.toLowerCase());
}

// ---- Writes ----

export async function approveFxrp(owner: Address, amountFXRP: bigint): Promise<Hex> {
  const token = await getFxrpTokenAddress();
  const walletClient = getWalletClient(owner);
  return walletClient.writeContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [requireVaultAddress(), amountFXRP],
  });
}

export async function getFxrpAllowance(owner: Address, client: FlarePublicClient = publicClient): Promise<bigint> {
  const token = await getFxrpTokenAddress(client);
  return client.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, requireVaultAddress()],
  });
}

export async function depositFxrp(owner: Address, amountFXRP: bigint): Promise<Hex> {
  const walletClient = getWalletClient(owner);
  return walletClient.writeContract({
    address: requireVaultAddress(),
    abi: COVENANT_VAULT_ABI,
    functionName: "deposit",
    args: [amountFXRP],
  });
}

/** Pull unspent FXRP back out of the vault. Owners keep custody throughout. */
export async function withdrawFxrp(owner: Address, amountFXRP: bigint): Promise<Hex> {
  const walletClient = getWalletClient(owner);
  return walletClient.writeContract({
    address: requireVaultAddress(),
    abi: COVENANT_VAULT_ABI,
    functionName: "withdraw",
    args: [amountFXRP],
  });
}

/** Owner kill switch: ends the agent's authority immediately. */
export async function revokeCovenant(owner: Address, covenantId: bigint): Promise<Hex> {
  const walletClient = getWalletClient(owner);
  return walletClient.writeContract({
    address: requireVaultAddress(),
    abi: COVENANT_VAULT_ABI,
    functionName: "revokeCovenant",
    args: [covenantId],
  });
}

export async function createCovenant(owner: Address, agent: Address, policy: Policy): Promise<Hex> {
  const walletClient = getWalletClient(owner);
  return walletClient.writeContract({
    address: requireVaultAddress(),
    abi: COVENANT_VAULT_ABI,
    functionName: "createCovenant",
    args: [
      agent,
      {
        usdBudgetTotal: policy.usdBudgetTotal,
        usdMaxPerRequest: policy.usdMaxPerRequest,
        expiry: policy.expiry,
        allowedRecipients: policy.allowedRecipients,
        purposeHash: policy.purposeHash,
      },
    ],
  });
}

/**
 * Submit createCovenant, wait for the receipt, and read the real covenantId
 * back out of the CovenantCreated log -- reading nextCovenantId before the
 * call would be racy if anything else creates a covenant in between.
 */
export async function createCovenantAndGetId(
  owner: Address,
  agent: Address,
  policy: Policy,
  client: FlarePublicClient = publicClient
): Promise<{ txHash: Hex; covenantId: bigint }> {
  const txHash = await createCovenant(owner, agent, policy);
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });
  const vaultAddr = requireVaultAddress().toLowerCase();
  const events = parseEventLogs({
    abi: COVENANT_VAULT_ABI,
    eventName: "CovenantCreated",
    logs: (receipt.logs as Log[]).filter((l) => l.address.toLowerCase() === vaultAddr),
  });
  const covenantId = events[0]?.args.covenantId;
  if (covenantId === undefined) throw new Error("CovenantCreated event not found in transaction receipt");
  return { txHash, covenantId };
}

/**
 * Have the agent pay out of a covenant. Reverts on-chain (recipient not
 * allowed, over budget, expired, wrong caller) -- callers should catch and
 * surface `error.shortMessage` / the revert reason, this is the "reverted
 * payment" half of the required demo pair.
 */
export async function payFromCovenant(
  agent: Address,
  covenantId: bigint,
  recipient: Address,
  amountFXRP: bigint,
  memo: string
): Promise<Hex> {
  const walletClient = getWalletClient(agent);
  const memoBytes = `0x${Buffer.from(memo, "utf8").toString("hex")}` as Hex;
  return walletClient.writeContract({
    address: requireVaultAddress(),
    abi: COVENANT_VAULT_ABI,
    functionName: "pay",
    args: [covenantId, recipient, amountFXRP, memoBytes],
  });
}

// ---- Audit trail: read straight from chain events, never from local/db state ----
//
// Sourced from the Coston2 explorer's log API rather than eth_getLogs. The
// public Coston2 RPC caps eth_getLogs at a 30-block range (~54 seconds of
// history at ~1.8s blocks), so scanning the chain for a contract's full event
// history over RPC is not possible. The explorer is a public index over the
// chain's own logs, not a database of ours, so the audit trail is still
// derived entirely from on-chain events. Its response also carries each log's
// block timestamp, which removes a per-block getBlock round trip.

const EXPLORER_LOG_API = "https://coston2-explorer.flare.network/api";

interface ExplorerLog {
  address: string;
  blockNumber: string; // hex
  data: Hex;
  logIndex: string; // hex
  timeStamp: string; // hex, unix seconds
  topics: (Hex | null)[];
  transactionHash: Hex;
}

interface DecodedVaultLog {
  eventName: string;
  args: Record<string, unknown>;
  transactionHash: Hex;
  blockNumber: bigint;
  timestamp: number;
}

async function fetchVaultLogs(): Promise<DecodedVaultLog[]> {
  const address = requireVaultAddress();
  const url = `${EXPLORER_LOG_API}?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address=${address}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Explorer log API returned ${res.status}`);
  const body = (await res.json()) as { message?: string; result?: ExplorerLog[] | string };

  // Blockscout answers an empty history with a non-array result and a
  // "No logs found" message; that is not an error.
  if (!Array.isArray(body.result)) return [];

  const decoded: DecodedVaultLog[] = [];
  for (const log of body.result) {
    const topics = log.topics.filter((t): t is Hex => t != null);
    if (topics.length === 0) continue;
    try {
      const event = decodeEventLog({
        abi: COVENANT_VAULT_ABI,
        data: log.data,
        topics: topics as [Hex, ...Hex[]],
      });
      decoded.push({
        eventName: event.eventName as string,
        args: event.args as unknown as Record<string, unknown>,
        transactionHash: log.transactionHash,
        blockNumber: BigInt(log.blockNumber),
        timestamp: Number(BigInt(log.timeStamp)),
      });
    } catch {
      // A log this ABI does not describe -- skip rather than fail the page.
    }
  }
  return decoded;
}

export interface PaymentEvent {
  covenantId: bigint;
  recipient: Address;
  amountFXRP: bigint;
  usdCents: bigint;
  memo: string;
  transactionHash: Hex;
  blockNumber: bigint;
  timestamp: number; // unix seconds, straight off the chain -- never fabricated
}

export interface CovenantCreatedEvent {
  covenantId: bigint;
  owner: Address;
  agent: Address;
  transactionHash: Hex;
  blockNumber: bigint;
  timestamp: number;
}

/** One fetch, both event types -- the audit page needs them together. */
export async function getVaultEvents(): Promise<{
  payments: PaymentEvent[];
  created: CovenantCreatedEvent[];
}> {
  const logs = await fetchVaultLogs();
  const payments: PaymentEvent[] = [];
  const created: CovenantCreatedEvent[] = [];

  for (const log of logs) {
    if (log.eventName === "PaymentExecuted") {
      const memoHex = (log.args.memo as Hex | undefined) ?? "0x";
      payments.push({
        covenantId: log.args.covenantId as bigint,
        recipient: log.args.recipient as Address,
        amountFXRP: log.args.amountFXRP as bigint,
        usdCents: log.args.usdCents as bigint,
        memo: hexToUtf8(memoHex),
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp: log.timestamp,
      });
    } else if (log.eventName === "CovenantCreated") {
      created.push({
        covenantId: log.args.covenantId as bigint,
        owner: log.args.owner as Address,
        agent: log.args.agent as Address,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp: log.timestamp,
      });
    }
  }

  return { payments, created };
}

function hexToUtf8(hex: Hex): string {
  try {
    const bytes = hex.slice(2).match(/.{1,2}/g) ?? [];
    return new TextDecoder().decode(Uint8Array.from(bytes.map((b) => parseInt(b, 16))));
  } catch {
    return "";
  }
}
