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

## Deployment (Coston2, chain id 114) -- live as of 2026-08-08
```
CovenantVault  0xA3CDA78226dF18Acc99AbeAd8d89Cf352d17F02c
deploy tx      0xe72464244ddc361b8b45d13ee647cb67da5c9307a79cb4d6d07013c155f7040d
owner/agent    0x22227781CCf9d1F547574E7Dec05FE56De6A0B25   (same key for both in the demo)
FXRP token     0x0b6A3645c240605887a5532109323A3E12273dc7   (resolved on-chain, not hardcoded)
```
The two named tx hashes the submission requires, both real, both on Coston2:
```
APPROVED  0xdf4cf808bcdc1174713243ce38fefe7901bdc1e8ad32bf1fe58b0dc08b165cae
          covenant #0, 0.242 FXRP (~$0.25) to an allowed recipient, status 0x1

REVERTED  0x1dc18f3ed1240f37fb53b69b63a686c3ed3e91738a3d7bd076979a8b2f0a02f2
          same covenant, 1 FXRP (~$1.03) against a $0.50 per-request cap,
          status 0x0 -- reverted on-chain, spentUsdCents unchanged at 26
```
Covenant #0 policy: $3.00 budget, $0.50 per request, 1 day expiry, one allowed
recipient (0x…dEaD). After the approved payment: spentUsdCents 26, owner vault
balance 4,758,000 (5,000,000 deposited minus 242,000 paid). The 26 rather than
25 is the ceiling rounding doing its job.

`web/.env.local` carries `NEXT_PUBLIC_VAULT_ADDRESS` and is gitignored; set it
in any new environment or every dashboard route falls back to its
"not deployed yet" state.

## Reading contract events: use the explorer, not eth_getLogs
The public Coston2 RPC caps `eth_getLogs` at a **30 block** range (~54s of
history), so scanning a contract's full event history over RPC is impossible.
`getVaultEvents()` therefore reads the Coston2 Blockscout log API
(`https://coston2-explorer.flare.network/api?module=logs&action=getLogs`),
which returns full history plus each log's timestamp. That is still an index
over the chain's own logs, not a database of ours, so the "audit log reads
events, not a database" rule holds. Do not switch this back to
`getContractEvents({ fromBlock: 0n })` -- it fails silently and the page just
renders "No events yet".

## Current Focus (as of 2026-08-08, 6 days to deadline)
Done: contracts (7/7 forge tests, FTSO mock), real Coston2 addresses resolved + verified on-chain, full frontend (landing, dashboard, covenants, console, audit, services, wizard), mobile-responsive, build clean.

Done since: contract audited and hardened (drain vectors closed, withdraw +
revoke added, 33/33 tests), deployed to Coston2, end-to-end run completed with
both demo tx hashes captured, audit log verified rendering real chain events.

Critical path, in order -- everything else is polish:
1. **Drive the UI end-to-end in a browser with a real wallet**: create a covenant through the wizard, run the task console against covenant #0, revoke one. This is the last big unknown -- run-flow's animation sequence, wizard steps 2-4, toasts, CountUp on real numbers and the skeleton loaders have still never been seen executing.
2. **Record the demo video.**
3. **Write `docs/SUBMISSION.md` + `docs/ARCHITECTURE.md`.**
4. Then, and only then: the Bounty 2 gate above, and x402 verification polish.

Verified running: audit log against live events, connect-wallet CTAs, landing
page, all mobile layouts. `ConfirmProvider` now has a caller (the revoke flow),
so it is no longer dead code.

Toolchain note: Foundry runs under WSL only (no native Windows build). Invoke as:
`MSYS2_ARG_CONV_EXCL="*" wsl -d Ubuntu-Ext -- bash -lc "cd /mnt/f/Hack/flare/covenant/contracts && /home/imanuel/.foundry/bin/forge <cmd>"`
