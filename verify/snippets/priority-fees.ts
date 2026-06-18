import { Connection, PublicKey } from "@solana/web3.js";

// Mirror of skill/priority-fees.md — Helius estimate + getRecentPrioritizationFees fallback.

const MAX_CU_PRICE = 1_000_000; // microLamports/CU — cap / circuit breaker

export type PriorityLevel = "Min" | "Low" | "Medium" | "High" | "VeryHigh" | "UnsafeMax";

export async function getCuPriceHelius(
  heliusRpcUrl: string,
  writableAccounts: string[],
  level: PriorityLevel = "Medium",
): Promise<number> {
  const res = await fetch(heliusRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: "1", method: "getPriorityFeeEstimate",
      params: [{ accountKeys: writableAccounts, options: { priorityLevel: level } }],
    }),
  });
  const { result } = (await res.json()) as { result: { priorityFeeEstimate: number } };
  return Math.min(Math.ceil(result.priorityFeeEstimate), MAX_CU_PRICE);
}

export async function getCuPriceP75(connection: Connection, writable: PublicKey[]): Promise<number> {
  const fees = await connection.getRecentPrioritizationFees({ lockedWritableAccounts: writable });
  const vals = fees.map((f) => f.prioritizationFee).sort((a, b) => a - b);
  const p75 = vals[Math.floor(vals.length * 0.75)] ?? 0;
  return Math.min(Math.max(p75, 1), MAX_CU_PRICE);
}
