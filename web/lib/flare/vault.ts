import type { Address, Hex } from "viem";
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

export interface PaymentEvent {
  covenantId: bigint;
  recipient: Address;
  amountFXRP: bigint;
  usdCents: bigint;
  memo: string;
  transactionHash: Hex;
  blockNumber: bigint;
}

export async function getPaymentEvents(client: FlarePublicClient = publicClient): Promise<PaymentEvent[]> {
  const logs = await client.getContractEvents({
    address: requireVaultAddress(),
    abi: COVENANT_VAULT_ABI,
    eventName: "PaymentExecuted",
    fromBlock: 0n,
    toBlock: "latest",
  });
  return logs.map((log) => ({
    covenantId: log.args.covenantId!,
    recipient: log.args.recipient!,
    amountFXRP: log.args.amountFXRP!,
    usdCents: log.args.usdCents!,
    memo: Buffer.from((log.args.memo ?? "0x").slice(2), "hex").toString("utf8"),
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
  }));
}

export interface CovenantCreatedEvent {
  covenantId: bigint;
  owner: Address;
  agent: Address;
  transactionHash: Hex;
  blockNumber: bigint;
}

export async function getCovenantCreatedEvents(client: FlarePublicClient = publicClient): Promise<CovenantCreatedEvent[]> {
  const logs = await client.getContractEvents({
    address: requireVaultAddress(),
    abi: COVENANT_VAULT_ABI,
    eventName: "CovenantCreated",
    fromBlock: 0n,
    toBlock: "latest",
  });
  return logs.map((log) => ({
    covenantId: log.args.covenantId!,
    owner: log.args.owner!,
    agent: log.args.agent!,
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
  }));
}
