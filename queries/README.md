# Phase 1 — How to run

Three queries, run in this order in your Dune workspace.

## Q1 — `01_discover_top_pool_per_dex.sql`
Returns top-3 SOL-USDC pools per protocol over the last 90 days.
Paste the result back here so we can lock pool addresses.

## Q2 — `02_probe_lp_lifecycle_tables.sql`
Run each `SELECT` separately. The Dune editor will show errors on any table
that doesn't exist with that name — that's the signal we need before Phase 2.
Paste the failures (or "all green") back.

## Q3 — `03_pool_level_summary.sql`
Replace the three `PASTE_..._POOL_ADDRESS` strings with the addresses from Q1,
then run. Returns per-pool: swap volume + count, unique LPs, unique positions
opened in window. This sanity-checks the pool size before we invest in Phase 2.

## What I'm watching for in your output
- Q1: that the top pool's 90d volume is comparable across DEXs (so a per-LP
  comparison is meaningful and not dominated by a single venue).
- Q2: which LP-lifecycle tables actually exist with the names I guessed. The
  Meteora DLMM names are most likely to need adjustment.
- Q3: rough LP count per pool. If <100 unique LPs in the window, the
  net-negative-vs-HODL %  will be noisy.

Once you paste those three results, I'll write Phase 2.
