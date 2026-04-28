import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PoolUtil,
  PriceMath,
  IGNORE_CACHE,
} from "@orca-so/whirlpools-sdk";
import Decimal from "decimal.js";
import type BN from "bn.js";
import { SOL_MINT, SOL_DECIMALS, USDC_DECIMALS } from "./constants";
import type { PoolStats } from "./types";

export async function analyzeOrcaPool(
  conn: Connection,
  poolAddr: PublicKey,
): Promise<PoolStats> {
  const wallet = new Wallet(Keypair.generate());
  const ctx = WhirlpoolContext.from(conn, wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);

  const pool = await client.getPool(poolAddr, IGNORE_CACHE);
  const data = pool.getData();
  const tokenA = pool.getTokenAInfo();
  const aIsSol = tokenA.mint.equals(SOL_MINT);

  const priceAB = PriceMath.sqrtPriceX64ToPrice(
    data.sqrtPrice,
    tokenA.decimals,
    pool.getTokenBInfo().decimals,
  );
  const solPrice = aIsSol ? priceAB.toNumber() : 1 / priceAB.toNumber();

  // Position layout: discriminator(8) + whirlpool(32) + ...
  // Filter by whirlpool pubkey at offset 8 to get only this pool's positions.
  // Cast: Orca SDK's IDL is anchor 0.29; we bring 0.30 — types collide but runtime is fine.
  type PositionData = {
    liquidity: BN;
    tickLowerIndex: number;
    tickUpperIndex: number;
  };
  const positionsApi = (
    ctx.program.account as unknown as {
      position: {
        all: (
          filters: Array<{ memcmp: { offset: number; bytes: string } }>,
        ) => Promise<Array<{ publicKey: PublicKey; account: PositionData }>>;
      };
    }
  ).position;
  const positionAccounts = await positionsApi.all([
    { memcmp: { offset: 8, bytes: poolAddr.toBase58() } },
  ]);

  let totalUsd = 0;
  let activeUsd = 0;
  let activeCount = 0;

  for (const { account: pos } of positionAccounts) {
    if (pos.liquidity.isZero()) continue;

    const lowerSqrt = PriceMath.tickIndexToSqrtPriceX64(pos.tickLowerIndex);
    const upperSqrt = PriceMath.tickIndexToSqrtPriceX64(pos.tickUpperIndex);
    const amounts = PoolUtil.getTokenAmountsFromLiquidity(
      pos.liquidity,
      data.sqrtPrice,
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

    const inRange =
      data.tickCurrentIndex >= pos.tickLowerIndex &&
      data.tickCurrentIndex < pos.tickUpperIndex;
    if (inRange) {
      activeUsd += usd;
      activeCount++;
    }
  }

  return {
    pool: poolAddr.toBase58(),
    totalUsd,
    activeUsd,
    positionCount: positionAccounts.length,
    activePositionCount: activeCount,
    solPrice,
  };
}
