# LP Analytics — Plan

**Goal:** For Raydium CLMM, Orca Whirlpools, Meteora DLMM, on the top SOL-USDC pool of each, over 2026-01-28 → 2026-04-28:
1. % of LP wallets net negative vs HODL
2. Total fees earned vs total impermanent loss
3. Distribution of LP P&L

## Token mints
- SOL (wrapped): `So11111111111111111111111111111111111111112`
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

## Confirmed Dune namespaces
- Raydium CLMM: `raydium_clmm_solana` — program `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK`
- Orca Whirlpools: `whirlpool_solana` — program `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`
- Meteora DLMM: `dlmm_solana` — program `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`

Swap tables verified in the spellbook. LP-lifecycle table names are derived from each protocol's IDL — verified by Phase 1 probes before relying on them.

## Phases
- **Phase 1**: discover top pool per DEX by 90d volume; probe LP-lifecycle tables exist; pool-level fee + volume + LP count summary.
- **Phase 2**: per-LP position lifecycle reconstruction (deposit, increase, decrease, withdraw, fee claim) using SPL transfers to/from pool vaults; HODL counterfactual using `prices.usd`; aggregate to % net-negative and fees-vs-IL.
- **Phase 3** (if needed): bin LPs by hold duration / range width to explain the variance.
