# Idle Liquidity in Solana Concentrated AMMs

How much LP capital is sitting out-of-range — and therefore earning zero fees — across the top SOL-USDC pool on each major Solana concentrated AMM.

## Headline finding

**Snapshot: 2026-04-28 13:11 UTC. SOL spot price (read from each pool's on-chain state): ~$83.50.**

Across the top SOL-USDC pool on Orca Whirlpools, Raydium CLMM, and Meteora DLMM:

- **35,011 positions** analyzed
- **$41.5M total TVL**
- **$16.7M idle (40.3%)** by USD
- **23,944 positions out-of-range (68.4%)** by count

| Protocol | Pool | Positions | TVL | Active TVL | Idle TVL | Idle % (USD) | Idle % (count) |
|---|---|---:|---:|---:|---:|---:|---:|
| Orca Whirlpools | `Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE` | 22,724 | $29.9M | $21.0M | $8.8M | 29.6% | 61.8% |
| Raydium CLMM | `3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv` | 8,030 | $6.1M | $3.7M | $2.3M | 38.6% | 84.5% |
| Meteora DLMM | `BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y` | 4,257 | $5.6M | $0.04M | $5.5M | **99.3%** | 73.2% |

The Meteora number is not a bug. DLMM only pays fees on the **single active bin** at any given time, so any liquidity placed even one bin away from the active price earns nothing until the price moves back. CLMMs (Orca, Raydium) earn fees across the full position range, so being "active" is a wider band.

## What "idle" means

For each position the script computes the dollar value of the tokens locked inside it (using on-chain `sqrtPrice` / active bin price for the SOL/USDC quote), then classifies the position as one of:

- **Active** — earning fees right now.
  - Orca / Raydium: position's tick range straddles the pool's current tick.
  - Meteora: position's bin range straddles the pool's active bin. *Active TVL is the USD value of tokens literally in the active bin*; tokens in the position's other bins are counted as idle, since DLMM only pays the active bin.
- **Idle** — out-of-range, holding tokens but earning zero fees.

USD = `SOL_amount × pool_spot_SOL_price + USDC_amount`. No external price oracle — the SOL price is derived from each pool's own on-chain state at snapshot time.

## Why this matters for an LP product

- ~70% of CLMM positions and ~99% of DLMM TVL is sitting idle on a calm day in the deepest SOL-USDC market on Solana.
- LPs are either mispricing their ranges, abandoning expired ranges, or treating concentrated liquidity as a "set-and-forget" product it isn't.
- Anything that automatically rebalances or right-sizes ranges captures fees that today's passive LPers miss.

## Reproducing

```bash
cp .env.example .env
# paste your Helius RPC URL into HELIUS_RPC
pnpm install
pnpm start
```

Source: `src/{orca,raydium,meteora,index}.ts`. Pool addresses are pinned in `src/constants.ts` — change them to point at any other pool on the same protocols.

## Caveats

- One pool per protocol, picked as the top SOL-USDC pool by TVL. Numbers are not protocol-wide totals.
- Snapshot in time — idle % moves with price volatility. A wider sample over multiple days would smooth this out.
- Meteora analysis takes ~100s because it iterates per unique LP owner (SDK doesn't expose batched per-pool position decoding); Orca/Raydium take 2–10s.
- Active TVL for DLMM counts only tokens in the active bin. If a more lenient definition is preferred (any position whose range covers the active bin counts as fully active), idle % drops to the position-count number (~73%).
