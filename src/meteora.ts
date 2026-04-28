import { Connection, PublicKey } from "@solana/web3.js";
import DLMM from "@meteora-ag/dlmm";
import Decimal from "decimal.js";
import { SOL_MINT, SOL_DECIMALS, USDC_DECIMALS } from "./constants";
import type { PoolStats } from "./types";

// Tiny concurrency limiter; runs `fn` over `items` with at most `n` in flight.
async function pMap<T, R>(
  items: T[],
  n: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function analyzeMeteoraPool(
  conn: Connection,
  poolAddr: PublicKey,
): Promise<PoolStats> {
  const dlmmPool = await DLMM.create(conn, poolAddr);

  const xMint = dlmmPool.lbPair.tokenXMint;
  const xIsSol = xMint.equals(SOL_MINT);

  const activeBin = await dlmmPool.getActiveBin();
  const activeId = activeBin.binId;
  // pricePerToken is decimal-adjusted Y/X (one X token in Y display units).
  // .price is the raw Q-format ratio and was off by 10^(decimalsX - decimalsY).
  const priceYperX = parseFloat(activeBin.pricePerToken);
  const solPrice = xIsSol ? priceYperX : 1 / priceYperX;

  // PositionV2 layout: discriminator(8) + lbPair(32) + owner(32) + ...
  const positionAccounts =
    await dlmmPool.program.account.positionV2.all([
      { memcmp: { offset: 8, bytes: poolAddr.toBase58() } },
    ]);

  const ownerSet = new Set<string>();
  for (const p of positionAccounts) {
    ownerSet.add((p.account.owner as PublicKey).toBase58());
  }
  const owners = [...ownerSet].map((s) => new PublicKey(s));

  let totalUsd = 0;
  let activeUsd = 0;
  let activeCount = 0;
  let positionCount = 0;

  await pMap(owners, 10, async (owner) => {
    let res;
    try {
      res = await dlmmPool.getPositionsByUserAndLbPair(owner);
    } catch {
      return;
    }

    for (const userPos of res.userPositions) {
          positionCount++;
          const pd = userPos.positionData;

          let posTotalX = new Decimal(0);
          let posTotalY = new Decimal(0);
          let posActiveX = new Decimal(0);
          let posActiveY = new Decimal(0);

          // positionXAmount/positionYAmount are this position's share of the bin
          // (binXAmount/binYAmount are bin totals across all positions — wrong here).
          for (const bin of pd.positionBinData) {
            const bx = new Decimal(bin.positionXAmount);
            const by = new Decimal(bin.positionYAmount);
            posTotalX = posTotalX.add(bx);
            posTotalY = posTotalY.add(by);
            if (bin.binId === activeId) {
              posActiveX = posActiveX.add(bx);
              posActiveY = posActiveY.add(by);
            }
          }

          totalUsd += toUsd(posTotalX, posTotalY, xIsSol, solPrice);
          activeUsd += toUsd(posActiveX, posActiveY, xIsSol, solPrice);

      const lower = Number(pd.lowerBinId);
      const upper = Number(pd.upperBinId);
      if (lower <= activeId && activeId <= upper) activeCount++;
    }
  });

  return {
    pool: poolAddr.toBase58(),
    totalUsd,
    activeUsd,
    positionCount,
    activePositionCount: activeCount,
    solPrice,
  };
}

function toUsd(
  xAmt: Decimal,
  yAmt: Decimal,
  xIsSol: boolean,
  solPrice: number,
): number {
  const sol = xIsSol ? xAmt : yAmt;
  const usdc = xIsSol ? yAmt : xAmt;
  return sol
    .div(`1e${SOL_DECIMALS}`)
    .mul(solPrice)
    .add(usdc.div(`1e${USDC_DECIMALS}`))
    .toNumber();
}
