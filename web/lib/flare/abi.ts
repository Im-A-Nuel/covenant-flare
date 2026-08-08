// Generated via `forge inspect CovenantVault abi --json` in contracts/.
// Keep this in sync with contracts/src/CovenantVault.sol -- regenerate after
// any change to the contract's public interface.
export const COVENANT_VAULT_ABI = [
  { type: "constructor", inputs: [], stateMutability: "nonpayable" },
  {
    type: "function",
    name: "balanceFXRP",
    inputs: [{ name: "", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "covenants",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "owner", type: "address", internalType: "address" },
      { name: "agent", type: "address", internalType: "address" },
      {
        name: "policy",
        type: "tuple",
        internalType: "struct PolicyLib.Policy",
        components: [
          { name: "usdBudgetTotal", type: "uint256", internalType: "uint256" },
          { name: "usdMaxPerRequest", type: "uint256", internalType: "uint256" },
          { name: "expiry", type: "uint256", internalType: "uint256" },
          { name: "allowedRecipients", type: "address[]", internalType: "address[]" },
          { name: "purposeHash", type: "bytes32", internalType: "bytes32" },
        ],
      },
      { name: "spentUsdCents", type: "uint256", internalType: "uint256" },
      { name: "active", type: "bool", internalType: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createCovenant",
    inputs: [
      { name: "agent", type: "address", internalType: "address" },
      {
        name: "policy",
        type: "tuple",
        internalType: "struct PolicyLib.Policy",
        components: [
          { name: "usdBudgetTotal", type: "uint256", internalType: "uint256" },
          { name: "usdMaxPerRequest", type: "uint256", internalType: "uint256" },
          { name: "expiry", type: "uint256", internalType: "uint256" },
          { name: "allowedRecipients", type: "address[]", internalType: "address[]" },
          { name: "purposeHash", type: "bytes32", internalType: "bytes32" },
        ],
      },
    ],
    outputs: [{ name: "covenantId", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amountFXRP", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "amountFXRP", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeCovenant",
    inputs: [{ name: "covenantId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "MAX_PRICE_AGE",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MAX_ALLOWED_RECIPIENTS",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "fxrpToken",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IERC20" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nextCovenantId",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pay",
    inputs: [
      { name: "covenantId", type: "uint256", internalType: "uint256" },
      { name: "recipient", type: "address", internalType: "address" },
      { name: "amountFXRP", type: "uint256", internalType: "uint256" },
      { name: "memo", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "CovenantCreated",
    inputs: [
      { name: "covenantId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "owner", type: "address", indexed: true, internalType: "address" },
      { name: "agent", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "owner", type: "address", indexed: true, internalType: "address" },
      { name: "amountFXRP", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "owner", type: "address", indexed: true, internalType: "address" },
      { name: "amountFXRP", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CovenantRevoked",
    inputs: [
      { name: "covenantId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "owner", type: "address", indexed: true, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PaymentExecuted",
    inputs: [
      { name: "covenantId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "recipient", type: "address", indexed: true, internalType: "address" },
      { name: "amountFXRP", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "usdCents", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "memo", type: "bytes", indexed: false, internalType: "bytes" },
    ],
    anonymous: false,
  },
] as const;

// Minimal slices of the periphery ABIs -- only what the frontend reads directly.
export const FTSO_V2_ABI = [
  {
    type: "function",
    name: "getFeedByIdInWei",
    inputs: [{ name: "_feedId", type: "bytes21" }],
    outputs: [
      { name: "_value", type: "uint256" },
      { name: "_timestamp", type: "uint64" },
    ],
    // Real on-chain signature is `payable` (it may charge a fee for some
    // feeds), but we only ever read it via eth_call with no value sent --
    // marked `view` here so viem's readContract() type overloads accept it.
    stateMutability: "view",
  },
] as const;

export const CONTRACT_REGISTRY_ABI = [
  {
    type: "function",
    name: "getContractAddressByName",
    inputs: [{ name: "_name", type: "string" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
