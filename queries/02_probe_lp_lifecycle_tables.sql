-- Phase 1, Query 2: Probe that LP-lifecycle tables exist with expected names.
-- Run each SELECT separately. Each should return either a row count or fail.
-- The fails tell us which derived names we need to revise before Phase 2.
--
-- Why this matters: the swap tables in dex_solana.trades are confirmed in the
-- spellbook, but the add/remove/fee tables are IDL-derived names. They almost
-- certainly exist (Dune auto-decodes all instructions for known programs) but
-- the exact spelling may differ.

-- Raydium CLMM (program CAMMCzo5...)
SELECT 'raydium_clmm_solana.amm_v3_call_openPosition' AS tbl, COUNT(*) AS n_24h
FROM raydium_clmm_solana.amm_v3_call_openPosition
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'raydium_clmm_solana.amm_v3_call_increaseLiquidity' AS tbl, COUNT(*) AS n_24h
FROM raydium_clmm_solana.amm_v3_call_increaseLiquidity
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'raydium_clmm_solana.amm_v3_call_decreaseLiquidity' AS tbl, COUNT(*) AS n_24h
FROM raydium_clmm_solana.amm_v3_call_decreaseLiquidity
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'raydium_clmm_solana.amm_v3_call_closePosition' AS tbl, COUNT(*) AS n_24h
FROM raydium_clmm_solana.amm_v3_call_closePosition
WHERE call_block_time >= NOW() - INTERVAL '1' day;

-- Orca Whirlpools
SELECT 'whirlpool_solana.whirlpool_call_openPosition' AS tbl, COUNT(*) AS n_24h
FROM whirlpool_solana.whirlpool_call_openPosition
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'whirlpool_solana.whirlpool_call_increaseLiquidity' AS tbl, COUNT(*) AS n_24h
FROM whirlpool_solana.whirlpool_call_increaseLiquidity
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'whirlpool_solana.whirlpool_call_decreaseLiquidity' AS tbl, COUNT(*) AS n_24h
FROM whirlpool_solana.whirlpool_call_decreaseLiquidity
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'whirlpool_solana.whirlpool_call_closePosition' AS tbl, COUNT(*) AS n_24h
FROM whirlpool_solana.whirlpool_call_closePosition
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'whirlpool_solana.whirlpool_call_collectFees' AS tbl, COUNT(*) AS n_24h
FROM whirlpool_solana.whirlpool_call_collectFees
WHERE call_block_time >= NOW() - INTERVAL '1' day;

-- Meteora DLMM
SELECT 'dlmm_solana.lb_clmm_call_addLiquidity' AS tbl, COUNT(*) AS n_24h
FROM dlmm_solana.lb_clmm_call_addLiquidity
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'dlmm_solana.lb_clmm_call_addLiquidityByStrategy' AS tbl, COUNT(*) AS n_24h
FROM dlmm_solana.lb_clmm_call_addLiquidityByStrategy
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'dlmm_solana.lb_clmm_call_removeLiquidity' AS tbl, COUNT(*) AS n_24h
FROM dlmm_solana.lb_clmm_call_removeLiquidity
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'dlmm_solana.lb_clmm_call_initializePosition' AS tbl, COUNT(*) AS n_24h
FROM dlmm_solana.lb_clmm_call_initializePosition
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'dlmm_solana.lb_clmm_call_closePosition' AS tbl, COUNT(*) AS n_24h
FROM dlmm_solana.lb_clmm_call_closePosition
WHERE call_block_time >= NOW() - INTERVAL '1' day;

SELECT 'dlmm_solana.lb_clmm_call_claimFee' AS tbl, COUNT(*) AS n_24h
FROM dlmm_solana.lb_clmm_call_claimFee
WHERE call_block_time >= NOW() - INTERVAL '1' day;
