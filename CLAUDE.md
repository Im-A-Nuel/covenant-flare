# CLAUDE.md

## Project
Covenant on Flare -- policy-bound payment vault for autonomous AI agents, settled in FXRP, enforced on Flare.

Hackathon: Flare Summer Signal (DoraHacks). Deadline: ~Aug 9-10, 2026. Solo dev. Bounties targeted: Interoperable Assets + Confidential Compute.

Narrative (keep consistent everywhere): Covenant v1 proved the concept on Base Sepolia but its policy firewall ran off-chain (trust gap). This version rebuilds enforcement on Flare: budgets denominated in USD via FTSO, settlement in FXRP, policy evaluation designed for Flare Confidential Compute.

## Relationship to Covenant v1
- v1 repo (reference only, read-only): `F:\Hack\metamask\covenant`
- REUSE from v1: Next.js frontend (landing page, dashboard, covenant card components, design system), agent loop (Claude-powered), audit trail UX, x402 envelope handling.
- DO NOT PORT from v1: anything importing MetaMask Delegation Toolkit, ERC-7710, EIP-712 delegation signing, Smart Account logic. That entire layer is replaced by our own vault contract.
- When copying a v1 component, strip its delegation hooks first, then wire it to the new `lib/flare/` layer.

## Stack
- Contracts: Solidity 0.8.x + Foundry (forge, cast). Deploy target: Coston2 testnet (chain id 114). Stretch: Songbird.
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind (carried over from v1), wagmi + viem for chain calls.
- Agent: existing v1 Node/TS agent loop calling Anthropic API, modified to request payments from the vault instead of redeeming delegations.
- Flare periphery: `@flarenetwork/flare-periphery-contracts` for FTSO v2 + ContractRegistry interfaces.

## Network Constants
- Coston2 RPC: `https://coston2-api.flare.network/ext/C/rpc`
- Coston2 explorer: `https://coston2-explorer.flare.network`
- Faucet: `https://faucet.flare.network` (C2FLR)
- FTSO feed IDs and FAssets (FTestXRP) addresses: NEVER hardcode from memory. Resolve via ContractRegistry / fetch from `https://dev.flare.network` docs at implementation time, then pin them in `lib/flare/constants.ts` with a source-URL comment.

## Commands
```bash
# Contracts
cd contracts && forge build
forge test
forge script script/Deploy.s.sol --rpc-url $COSTON2_RPC --broadcast

# Frontend
cd web && npm install
npm run dev
npm run build

# Agent demo
cd agent && npm run demo
```

## Project Structure
```
covenant-flare/
  contracts/
    src/CovenantVault.sol      # core vault: deposits, policies, pay()
    src/PolicyLib.sol          # policy struct + checks (pure lib, unit-testable)
    test/                      # forge tests, incl. FTSO mock
    script/Deploy.s.sol
  web/                         # Next.js app (ported v1 UI)
    app/
    components/                # covenant card, budget bar, audit log
    lib/flare/                 # viem clients, constants.ts, ftso.ts
  agent/                       # Claude agent loop + x402 client
  docs/
    ARCHITECTURE.md            # incl. FCC design section
    SUBMISSION.md              # DoraHacks submission draft
```

## Core Contract Design (CovenantVault.sol)
- One vault per owner; owner deposits FXRP (FTestXRP on Coston2; fallback: mock ERC20 `mFXRP` we deploy ourselves if FAssets testnet minting is blocked).
- `createCovenant(agent, policy)` where policy = { usdBudgetTotal, usdMaxPerRequest, expiry, allowedRecipients[], purposeHash }.
- `pay(covenantId, recipient, amountFXRP, memo)` callable only by the covenant's agent address:
  1. Reads XRP/USD from FTSO v2 on-chain, converts amountFXRP to USD.
  2. Reverts unless: recipient allowed, usd <= maxPerRequest, spentUsd + usd <= budget, block.timestamp < expiry.
  3. Transfers FXRP, updates spentUsd, emits `PaymentExecuted` / reverts emit nothing (demo shows the revert reason).
- Events are the audit trail. Frontend audit log reads events, not a database.
- Keep the contract small and readable. No upgradeability, no ownable-library bloat. Judges will read this file.

## Key Conventions
- All chain reads/writes in `web/lib/flare/`; components never call viem directly.
- USD amounts: integer cents on-chain (uint256), formatted only at the UI edge.
- Naming: covenant = a policy grant; vault = the contract holding funds. Never mix.
- Commits: conventional (`feat:`, `fix:`, `docs:`). English.
- All user-facing copy in English. No em dashes anywhere (code comments, docs, UI copy).

## Architecture Notes
- FTSO price check happens INSIDE `pay()` on-chain. This is the core Flare integration; do not move it off-chain.
- UI must show dual denomination on the covenant card: `$3.00 (2.1 FXRP via FTSO)`. That one line proves FTSO usage to judges.
- FCC (Confidential Compute): treat as design-first. `docs/ARCHITECTURE.md` gets a full section on running PolicyLib evaluation inside an FCC TEE (private allowlists, hidden per-vendor limits). Implement only if Songbird FCC access is confirmed by Day 2; otherwise it ships as roadmap with architecture diagrams.
- x402 flow kept from v1: agent hits paid endpoint, gets HTTP 402, then calls `pay()` on the vault instead of redeeming a delegation. Server verifies the FXRP transfer on Coston2.
- Demo script must show BOTH outcomes with tx links: one approved payment, one reverted (over usdMaxPerRequest).

## Do NOT
- Do not import or reference MetaMask Delegation Toolkit, ERC-7710, or Smart Accounts anywhere in the new codebase.
- Do not redesign the UI. Reskin only: badges, labels, network indicator, FXRP/USD amounts.
- Do not hardcode FTSO feed IDs, FAssets addresses, or RPC chain ids from memory; resolve from official docs/registry first.
- Do not add a backend database. Chain events + local state only.
- Do not install new heavy dependencies without asking (anything beyond viem/wagmi/foundry stack).
- Do not claim "trustless" in copy unless the specific check named is on-chain.

## Submission Checklist (docs/SUBMISSION.md mirrors DoraHacks requirements)
- Deployed CovenantVault address on Coston2 + 2 named tx hashes (1 approved, 1 reverted).
- 3-min demo video: create covenant, agent pays, agent blocked, audit log.
- "What existed before vs built during program" section: be explicit, v1 UI/concept reused, entire contract + FTSO + FXRP layer new.
- Roadmap: FCC policy evaluation on Songbird, PMW for native XRPL payouts, agent SDK.

## Current Focus
Day 1-2: scaffold repo, CovenantVault.sol + PolicyLib + forge tests with FTSO mock, resolve real Coston2 addresses, deploy. Verify FCC/Songbird access in parallel and record the answer in ARCHITECTURE.md.
