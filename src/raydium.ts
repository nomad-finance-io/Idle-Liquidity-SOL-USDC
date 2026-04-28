import { Connection, PublicKey } from "@solana/web3.js";
import {
  PoolInfoLayout,
  PositionInfoLayout,
} from "@raydium-io/raydium-sdk-v2";
import { PoolUtil, PriceMath } from "@orca-so/whirlpools-sdk";
import BN from "bn.js";
import Decimal from "decimal.js";
import { SOL_MINT, SOL_DECIMALS, USDC_DECIMALS } from "./constants";
import type { PoolStats } from "./types";

export const RAYDIUM_CLMM_PROGRAM_ID = new PublicKey(
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
);

// PersonalPositionState layout: discriminator(8) + bump(1) + nftMint(32) + poolId(32) + ...
const POOL_ID_OFFSET = 8 + 1 + 32;

export async function analyzeRaydiumPool(
  conn: Connection,
  poolAddr: PublicKey,
): Promise<PoolStats> {
  const poolAccount = await conn.getAccountInfo(poolAddr);
  if (!poolAccount) throw new Error(`Pool ${poolAddr.toBase58()} not found`);
  const pool = PoolInfoLayout.decode(poolAccount.data);

  const aIsSol = (pool.mintA as PublicKey).equals(SOL_MINT);
  const sqrtPrice = pool.sqrtPriceX64 as BN;
  const tickCurrent = pool.tickCurrent as number;
  const decimalsA = pool.mintDecimalsA as number;
  const decimalsB = pool.mintDecimalsB as number;

  const priceAB = PriceMath.sqrtPriceX64ToPrice(sqrtPrice, decimalsA, decimalsB);
  const solPrice = aIsSol ? priceAB.toNumber() : 1 / priceAB.toNumber();

  const positions = await conn.getProgramAccounts(RAYDIUM_CLMM_PROGRAM_ID, {
    filters: [
      { dataSize: PositionInfoLayout.span },
      { memcmp: { offset: POOL_ID_OFFSET, bytes: poolAddr.toBase58() } },
    ],
  });

  let totalUsd = 0;
  let activeUsd = 0;
  let activeCount = 0;

  for (const { account } of positions) {
    const pos = PositionInfoLayout.decode(account.data);
    const liquidity = pos.liquidity as BN;
    if (liquidity.isZero()) continue;

    const tickLower = pos.tickLower as number;
    const tickUpper = pos.tickUpper as number;

    const lowerSqrt = PriceMath.tickIndexToSqrtPriceX64(tickLower);
    const upperSqrt = PriceMath.tickIndexToSqrtPriceX64(tickUpper);
    const amounts = PoolUtil.getTokenAmountsFromLiquidity(
      liquidity,
      sqrtPrice,
      lowerSqrt,
      upperSqrt,
      false,
    );

    const solAmt = aIsSol ? amounts.tokenA : amounts.tokenB;
    const usdcAmt = aIsSol ? amounts.tokenB : amounts.tokenA;

    const usd = new Decimal(solAmt.toString())
      .div(`1e${SOL_DECIMALS}`)
      .mul(solPrice)
      .add(new Decimal(usdcAmt.toString()).div(`1e${USDC_DECIMALS}`))
      .toNumber();

    totalUsd += usd;

    const inRange = tickCurrent >= tickLower && tickCurrent < tickUpper;
    if (inRange) {
      activeUsd += usd;
      activeCount++;
    }
  }

  return {
    pool: poolAddr.toBase58(),
    totalUsd,
    activeUsd,
    positionCount: positions.length,
    activePositionCount: activeCount,
    solPrice,
  };
}
