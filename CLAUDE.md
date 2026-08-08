# CLAUDE.md

## Project
Covenant on Flare -- policy-bound payment vault for autonomous AI agents, settled in FXRP, enforced on Flare.

Hackathon: Flare Summer Signal (DoraHacks). Solo dev.
- Final submission deadline: **Aug 14, 2026**. Judging Aug 15-21. Winners Aug 24.
- **Primary target: Bounty 1 (Interoperable Asset Products, $4k/$2k).** FXRP + FAssets are their stated priority area, and our FTSO-inside-pay() is a deep integration, not a bolt-on.
- **Bounty 2 (Confidential Compute, $4k/$2k): conditional, decide only after Bounty 1 fully ships.** Do not split focus before then. See "Bounty 2 decision gate" below.

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
- FCC (Confidential Compute): `docs/ARCHITECTURE.md` gets a section on running PolicyLib evaluation inside an FCC TEE (private allowlists, hidden per-vendor limits). Ships as roadmap unless the Bounty 2 decision gate below is passed.
- x402 flow kept from v1: agent hits paid endpoint, gets HTTP 402, then calls `pay()` on the vault instead of redeeming a delegation.
  - **Current honest status (do not overclaim in submission copy):** the 402 handshake is real (correct envelope, `X-PAYMENT` header, 402 -> pay -> 200). But the demo server does NOT verify the payment on-chain -- any non-empty `X-PAYMENT` header unlocks the resource. Also, the envelope's `payTo` is ignored; the real transfer goes to the covenant's `allowedRecipients[0]`, since on-chain policy only permits those.
  - Fix these before submission if time allows (verify the tx against `PaymentExecuted` on Coston2; source the envelope `payTo` from the covenant). Note: x402 is NOT part of either bounty's judging criteria, so this is polish, not critical path.
- Demo script must show BOTH outcomes with tx links: one approved payment, one reverted (over usdMaxPerRequest).

## Do NOT
- Do not import or reference MetaMask Delegation Toolkit, ERC-7710, or Smart Accounts anywhere in the new codebase.
- Do not redesign the UI. Reskin only: badges, labels, network indicator, FXRP/USD amounts.
- Do not hardcode FTSO feed IDs, FAssets addresses, or RPC chain ids from memory; resolve from official docs/registry first.
- Do not add a backend database. Chain events + local state only.
- Do not install new heavy dependencies without asking (anything beyond viem/wagmi/foundry stack).
- Do not claim "trustless" in copy unless the specific check named is on-chain.

## Bounty 2 decision gate (Confidential Compute)
Do NOT start FCC work until Bounty 1 is fully shipped (deployed + demo video + SUBMISSION.md). Then enter only if BOTH hold:
1. Indexer credentials have arrived from Flare support, AND
2. At least 3 days remain before Aug 14.

Researched facts (verified against dev.flare.network on 2026-08-08, so no need to re-research):
- FCC deploys to **Coston2** -- the same network the vault is on.
- **`SIMULATED_TEE=true`** enables local development against live Coston2 without Confidential VM hardware. Honest framing required if used: it is a simulated code hash, not a real attested TEE.
- Requires: Docker + Docker Compose, a Go HTTP server, Forge, an HTTPS tunnel (ngrok/cloudflared), and **indexer database credentials obtained by contacting Flare support** -- this is the long-pole external dependency, request it early even if unsure.
- ~8 steps: configure env, tunnel, indexer DB, deploy contract, start services, verify proxy, register TEE machine, e2e test.
- Official status: "in the final stages of development and is not yet a fully public production system."
- Bounty 2 judges want: what runs privately inside the TEE, what is verified/consumed on-chain, trust assumptions, and why TEE beats plain smart-contract execution. A design doc alone will score poorly against a bounty whose verb is "Build".

## Submission Checklist (docs/SUBMISSION.md mirrors the official requirements)
Required by the rules:
- Project name; selected bounty/bounties; short product description; target user.
- Demo link, video, or working app link.
- GitHub repo / technical materials.
- How the project uses Flare.
- What was newly built vs ported/integrated/improved during the program: be explicit -- v1 UI/concept reused, entire contract + FTSO + FXRP layer new.
- Smart contract addresses / deployment details: deployed CovenantVault address on Coston2 + 2 named tx hashes (1 approved, 1 reverted).
- Short roadmap / next steps: FCC policy evaluation, PMW for native XRPL payouts, agent SDK.

Encouraged (not required, but judges weigh it):
- Which network it is deployed on (Coston2 for us).
- Any user acquisition, testing, real feedback, or traction signals.

Demo video (~3 min): create covenant, agent pays, agent blocked by policy, audit log.

## Current Focus (as of 2026-08-08, 6 days to deadline)
Done: contracts (7/7 forge tests, FTSO mock), real Coston2 addresses resolved + verified on-chain, full frontend (landing, dashboard, covenants, console, audit, services, wizard), mobile-responsive, build clean.

Critical path, in order -- everything else is polish:
1. **Deploy CovenantVault to Coston2** (needs a funded deployer key in `contracts/.env`; blocked on that).
2. **Run end-to-end once**: deposit -> createCovenant -> one approved `pay()` -> one reverted `pay()` (over `usdMaxPerRequest`). Capture both tx hashes. This also validates every run-flow animation, which has never actually executed.
3. **Set `NEXT_PUBLIC_VAULT_ADDRESS`** in `web/.env.local` and re-verify the dashboard against real data.
4. **Record the demo video.**
5. **Write `docs/SUBMISSION.md` + `docs/ARCHITECTURE.md`.**
6. Then, and only then: the Bounty 2 gate above, and x402 verification polish.

Known unverified: run-flow's 4-card animation sequence, CountUp on real numbers, skeleton loaders, toasts, wizard steps 2-4, and the wrong-network banner + connect CTA have all been written and type-check, but none has been seen running. `ConfirmProvider` is mounted but `useConfirm` is never called (dead code left from v1's revoke flow).

Toolchain note: Foundry runs under WSL only (no native Windows build). Invoke as:
`MSYS2_ARG_CONV_EXCL="*" wsl -d Ubuntu-Ext -- bash -lc "cd /mnt/f/Hack/flare/covenant/contracts && /home/imanuel/.foundry/bin/forge <cmd>"`
