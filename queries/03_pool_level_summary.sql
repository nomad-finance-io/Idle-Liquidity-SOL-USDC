-- Phase 1, Query 3: Pool-level summary for the chosen pool addresses.
-- Run AFTER Q1: replace the @pool_raydium_clmm / @pool_orca_whirlpool /
-- @pool_meteora_dlmm placeholders with the top pool address from Q1.
--
-- Output: per pool, 90d volume, 90d swap count, unique LPs (rough — counted
-- via signers on add/remove instructions), # of distinct positions opened.

WITH params AS (
    SELECT
        DATE '2026-01-28' AS start_date,
        DATE '2026-04-28' AS end_date,
        -- TODO: paste real pool addresses from Q1 here
        'PASTE_RAYDIUM_CLMM_POOL_ADDRESS'   AS raydium_pool,
        'PASTE_ORCA_WHIRLPOOL_POOL_ADDRESS' AS orca_pool,
        'PASTE_METEORA_DLMM_POOL_ADDRESS'   AS meteora_pool
),

-- Swap volume + count from unified table
swap_stats AS (
    SELECT
        CASE
            WHEN t.pool_id = (SELECT raydium_pool FROM params) THEN 'raydium_clmm'
            WHEN t.pool_id = (SELECT orca_pool    FROM params) THEN 'orca_whirlpool'
            WHEN t.pool_id = (SELECT meteora_pool FROM params) THEN 'meteora_dlmm'
        END                                   AS dex,
        COUNT(*)                              AS swap_count,
        SUM(t.amount_usd)                     AS swap_volume_usd,
        COUNT(DISTINCT t.trader_id)           AS unique_swappers
    FROM dex_solana.trades t, params p
    WHERE t.block_time >= p.start_date
      AND t.block_time <  p.end_date + INTERVAL '1' day
      AND t.pool_id IN (p.raydium_pool, p.orca_pool, p.meteora_pool)
    GROUP BY 1
),

-- Raydium CLMM LP activity. Pool address lives in account_pool_state for these calls.
ray_lp AS (
    SELECT
        'raydium_clmm'                                              AS dex,
        COUNT(DISTINCT call_tx_signer)                              AS unique_lps,
        COUNT(DISTINCT account_position_nft_mint)                   AS unique_positions,
        COUNT(*) FILTER (WHERE call_outcome = 'Success')            AS open_position_count
    FROM raydium_clmm_solana.amm_v3_call_openPosition c, params p
    WHERE c.call_block_time >= p.start_date
      AND c.call_block_time <  p.end_date + INTERVAL '1' day
      AND c.account_pool_state = p.raydium_pool
),

-- Orca Whirlpool LP activity. Pool address lives in account_whirlpool.
orca_lp AS (
    SELECT
        'orca_whirlpool'                                            AS dex,
        COUNT(DISTINCT call_tx_signer)                              AS unique_lps,
        COUNT(DISTINCT account_position_mint)                       AS unique_positions,
        COUNT(*) FILTER (WHERE call_outcome = 'Success')            AS open_position_count
    FROM whirlpool_solana.whirlpool_call_openPosition c, params p
    WHERE c.call_block_time >= p.start_date
      AND c.call_block_time <  p.end_date + INTERVAL '1' day
      AND c.account_whirlpool = p.orca_pool
),

-- Meteora DLMM LP activity. Pool (lb_pair) lives in account_lb_pair.
-- DLMM may use addLiquidityByStrategy more than addLiquidity — count both kinds.
met_lp AS (
    SELECT
        'meteora_dlmm'                                              AS dex,
        COUNT(DISTINCT call_tx_signer)                              AS unique_lps,
        COUNT(DISTINCT account_position)                            AS unique_positions,
        COUNT(*) FILTER (WHERE call_outcome = 'Success')            AS open_position_count
    FROM dlmm_solana.lb_clmm_call_initializePosition c, params p
    WHERE c.call_block_time >= p.start_date
      AND c.call_block_time <  p.end_date + INTERVAL '1' day
      AND c.account_lb_pair = p.meteora_pool
),

lp_stats AS (
    SELECT * FROM ray_lp
    UNION ALL SELECT * FROM orca_lp
    UNION ALL SELECT * FROM met_lp
)

SELECT
    s.dex,
    s.swap_count,
    s.swap_volume_usd,
    s.unique_swappers,
    l.unique_lps,
    l.unique_positions,
    l.open_position_count
FROM swap_stats s
LEFT JOIN lp_stats  l USING (dex)
ORDER BY s.dex;
