import "dotenv/config";
import { Connection, PublicKey } from "@solana/web3.js";
import { analyzeOrcaPool } from "./orca";
import { analyzeRaydiumPool } from "./raydium";
import { analyzeMeteoraPool } from "./meteora";
import { ORCA_POOL, RAYDIUM_POOL, METEORA_POOL } from "./constants";
import type { PoolStats } from "./types";

interface Protocol {
  name: string;
  pool: PublicKey;
  analyze: (conn: Connection, addr: PublicKey) => Promise<PoolStats>;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });

async function runProtocol(conn: Connection, p: Protocol) {
  console.log(`\n=== ${p.name} ===`);
  const t0 = Date.now();
  process.stdout.write(`  ${p.pool.toBase58()}... `);
  try {
    const s = await p.analyze(conn, p.pool);
    const idle = s.totalUsd - s.activeUsd;
    const idlePct = s.totalUsd > 0 ? (idle / s.totalUsd) * 100 : 0;
    const idlePosPct =
      s.positionCount > 0
        ? ((s.positionCount - s.activePositionCount) / s.positionCount) * 100
        : 0;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `${s.positionCount} positions (${s.activePositionCount} active), ` +
        `TVL $${fmt(s.totalUsd)}, idle $${fmt(idle)} ` +
        `(${idlePct.toFixed(1)}% by USD, ${idlePosPct.toFixed(1)}% by position count), ` +
        `SOL=$${s.solPrice.toFixed(2)} [${elapsed}s]`,
    );
    return s;
  } catch (e) {
    console.log(`ERROR: ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  const rpc = process.env.HELIUS_RPC;
  if (!rpc) throw new Error("HELIUS_RPC env var not set (see .env.example)");
  const conn = new Connection(rpc, "confirmed");

  const protocols: Protocol[] = [
    { name: "Orca Whirlpools", pool: ORCA_POOL, analyze: analyzeOrcaPool },
    { name: "Raydium CLMM", pool: RAYDIUM_POOL, analyze: analyzeRaydiumPool },
    { name: "Meteora DLMM", pool: METEORA_POOL, analyze: analyzeMeteoraPool },
  ];

  let grandTotal = 0;
  let grandActive = 0;
  let grandPositions = 0;
  let grandActivePos = 0;

  for (const p of protocols) {
    const s = await runProtocol(conn, p);
    if (!s) continue;
    grandTotal += s.totalUsd;
    grandActive += s.activeUsd;
    grandPositions += s.positionCount;
    grandActivePos += s.activePositionCount;
  }

  const grandIdle = grandTotal - grandActive;
  const grandIdlePct = grandTotal > 0 ? (grandIdle / grandTotal) * 100 : 0;
  const grandIdlePosPct =
    grandPositions > 0
      ? ((grandPositions - grandActivePos) / grandPositions) * 100
      : 0;

  console.log("\n=== SUMMARY ===");
  console.log(`  Total positions analyzed: ${fmt(grandPositions)}`);
  console.log(`  Total TVL: $${fmt(grandTotal)}`);
  console.log(`  Active TVL: $${fmt(grandActive)}`);
  console.log(`  Idle TVL: $${fmt(grandIdle)}`);
  console.log(
    `  Idle %: ${grandIdlePct.toFixed(1)}% by USD, ` +
      `${grandIdlePosPct.toFixed(1)}% by position count`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
