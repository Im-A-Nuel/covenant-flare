// Flare network constants for Covenant. Do not hardcode addresses from memory --
// only values confirmed against dev.flare.network docs (cross-checked via web search
// where noted) get pinned here. Anything unconfirmed is resolved on-chain at call time.

// Coston2 testnet
export const COSTON2_CHAIN_ID = 114;
export const COSTON2_RPC_URL = "https://coston2-api.flare.network/ext/C/rpc";
export const COSTON2_EXPLORER_URL = "https://coston2-explorer.flare.network";
export const COSTON2_FAUCET_URL = "https://faucet.flare.network/coston2";

// FlareContractRegistry: fixed address, identical on every Flare network
// (Flare, Songbird, Coston2, Coston). This is the only address that's safe
// to hardcode -- everything else (FtsoV2, AssetManagerFXRP, etc.) must be
// resolved dynamically via getContractAddressByName() on this contract.
// Source: https://dev.flare.network/network/guides/flare-contracts-registry
export const CONTRACT_REGISTRY_ADDRESS = "0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019" as const;

// Registry lookup names -- pass to ContractRegistry.getContractAddressByName(name)
export const REGISTRY_NAMES = {
  ftsoV2: "FtsoV2",
  assetManagerFXRP: "AssetManagerFXRP",
} as const;

// FTSO v2 feed ID for XRP/USD. bytes21 = category (0x01 = Crypto) + hex(symbol) + zero-pad.
// Verified two ways: (1) re-derived from spec (0x01 + hex("XRP/USD") + pad), matches
// value below; (2) live cast call to FtsoV2.getFeedByIdInWei() on Coston2 on 2026-08-06
// returned ~$1.044 with a sane timestamp -- confirms this feed id is live and correct.
// Source: https://dev.flare.network/ftso/feeds
export const FEED_ID_XRP_USD = "0x015852502f55534400000000000000000000000000" as const;

// FXRP (FTestXRP) ERC20 token address on Coston2: NOT pinned here.
// Resolve at runtime: AssetManagerFXRP (via registry) exposes fAsset() returning
// the FXRP token address. Do not hardcode -- FAssets contracts get redeployed
// across testnet resets more often than core Flare infra.
// Fallback per CLAUDE.md: deploy mock ERC20 `mFXRP` if faucet/minting is blocked.
//
// Verified live on Coston2 on 2026-08-06 via on-chain calls (values may rotate on
// testnet resets -- always re-resolve via registry, do not hardcode in app code):
//   ContractRegistry.getContractAddressByName("AssetManagerFXRP")
//     -> 0xc1Ca88b937d0b528842F95d5731ffB586f4fbDFA
//   AssetManagerFXRP.fAsset()
//     -> 0x0b6A3645c240605887a5532109323A3E12273dc7  (FXRP ERC20 token)
