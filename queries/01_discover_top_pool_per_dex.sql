-- Phase 1, Query 1: Top SOL-USDC pool per DEX by 90d swap volume.
-- Source: dex_solana.trades (verified to cover all three protocols).
-- Window: rolling 90 days.
-- Run in Dune. Paste the output back so we can lock in pool addresses.
--
-- Note: dex_solana.trades labels protocols differently. We filter on project
-- and project_version to disambiguate Raydium CLMM vs v4/v5, Meteora DLMM vs
-- DAMM v1/v2, etc. If a project_version label differs in your workspace,
-- adjust the WHERE clause.

WITH sol_usdc_trades AS (
    SELECT
        project,
        project_version,
        project_program_id,
        pool_id,                  -- pool address
        token_bought_mint_address,
        token_sold_mint_address,
        amount_usd,
        block_time
    FROM dex_solana.trades
    WHERE block_time >= NOW() - INTERVAL '90' day
      AND amount_usd > 0
      -- SOL <-> USDC only (either direction)
      AND (
            (token_bought_mint_address = 'So11111111111111111111111111111111111111112'
             AND token_sold_mint_address  = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
         OR (token_sold_mint_address    = 'So11111111111111111111111111111111111111112'
             AND token_bought_mint_address = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
      )
      -- Restrict to the three protocols we care about
      AND (
            (project = 'raydium'  AND project_version IN ('clmm'))
         OR (project = 'orca'     AND project_version IN ('whirlpool', 'whirlpool_v2', 'v1', 'v2'))
         OR (project = 'whirlpool')
         OR (project = 'meteora'  AND project_version IN ('dlmm', 'dlmm_v2'))
      )
),
ranked AS (
    SELECT
        project,
        project_version,
        project_program_id,
        pool_id,
        SUM(amount_usd)                    AS volume_usd_90d,
        COUNT(*)                           AS swap_count_90d,
        MIN(block_time)                    AS first_swap,
        MAX(block_time)                    AS last_swap,
        ROW_NUMBER() OVER (
            PARTITION BY project, project_version
            ORDER BY SUM(amount_usd) DESC
        )                                  AS rk
    FROM sol_usdc_trades
    GROUP BY 1,2,3,4
)
SELECT
    project,
    project_version,
    project_program_id,
    pool_id,
    volume_usd_90d,
    swap_count_90d,
    first_swap,
    last_swap
FROM ranked
WHERE rk <= 3                  -- top-3 per project so we can sanity-check
ORDER BY project, project_version, volume_usd_90d DESC;
